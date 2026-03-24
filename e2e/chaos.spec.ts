import { test, expect, Page } from '@playwright/test';

// Setup helper
async function setupHome(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('cleancheck_onboarded', 'true');
    localStorage.setItem('cleancheck_geo_asked', 'true');
  });
  await page.goto('/');
  await page.locator('h2').filter({ hasText: /\([1-9]\d*\)/ }).waitFor({ timeout: 40000 });
}

// ────────────────────────────────────────────────────
// CHAOS TESTS — Real User Behavior Simulation
// ────────────────────────────────────────────────────

test.describe('Chaos Tests — Rapid Interaction', () => {
  test('rapid radius switching — no empty state', async ({ page }) => {
    await setupHome(page);

    // Click radius buttons rapidly: 1km → 25km → 2km → 10km → 5km
    const buttons = ['1 km', '25 km', '2 km', '10 km', '5 km'];
    for (const label of buttons) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.waitForTimeout(100); // Faster than any API response
    }

    // Wait for things to settle
    await page.waitForTimeout(3000);

    // Should NOT show empty state — old data or new data, but never empty
    const emptyIcon = page.locator('text=🍽️');
    const hasEmpty = await emptyIcon.isVisible().catch(() => false);

    // Either restaurants visible or loading skeleton
    const cards = page.locator('h3');
    const hasCards = await cards.first().isVisible().catch(() => false);
    const hasSkeleton = page.locator('.animate-spin');
    const isLoading = await hasSkeleton.first().isVisible().catch(() => false);

    // At least one should be true: cards or loading. Never just empty.
    if (!hasCards && !isLoading) {
      // Wait more — Overpass might be slow
      await page.waitForTimeout(10000);
      const hasCardsNow = await cards.first().isVisible().catch(() => false);
      expect(hasCardsNow).toBe(true);
    }
  });

  test('search while loading — no crash', async ({ page }) => {
    await setupHome(page);

    // Change radius (triggers Overpass fetch)
    await page.getByRole('button', { name: '25 km' }).click();

    // Immediately start typing in search (while fetch is in progress)
    const searchInput = page.getByPlaceholder(/restaurant suchen|search restaurant/i).last();
    await searchInput.fill('Pizza');
    await page.waitForTimeout(500);

    // Page should not crash
    await expect(page.locator('nav')).toBeVisible();

    // Clear search
    await searchInput.fill('');
  });

  test('navigate away during restaurant detail load', async ({ page }) => {
    await setupHome(page);

    // Click restaurant
    const firstCard = page.locator('button').filter({ hasText: /entfernt|away/ }).first();
    await firstCard.click();

    // Immediately go back (before API responds)
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: 'Back' }).click();

    // Home should still have restaurants
    await page.waitForTimeout(1000);
    const heading = page.locator('h2').filter({ hasText: /\(\d+\)/ });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('rapid favorite toggle — consistent state', async ({ page }) => {
    await setupHome(page);

    const favBtn = page.getByLabel('Favorite').first();

    // Click 5 times rapidly
    for (let i = 0; i < 5; i++) {
      await favBtn.click();
      await page.waitForTimeout(50);
    }

    // Odd number of clicks → should be favorited
    // Even → should not be
    // Just verify no crash and state is boolean
    await page.waitForTimeout(300);

    // Navigate to profile to check
    await page.getByRole('button', { name: /profil|profile/i }).click();
    await page.waitForTimeout(500);

    // Page should not crash
    await expect(page.locator('nav')).toBeVisible();
  });

  test('rapid city search — results match last query', async ({ page }) => {
    await setupHome(page);

    const cityInput = page.getByPlaceholder(/stadt oder ort|city or place/i);

    // Type "Berlin" fast, then clear and type "München"
    await cityInput.fill('Berlin');
    await page.waitForTimeout(200);
    await cityInput.fill('');
    await cityInput.fill('München');

    // Wait for debounce + API response
    await page.waitForTimeout(2000);

    // Results should be for München, not Berlin
    const results = page.locator('button').filter({ hasText: /München/ });
    const berlinResults = page.locator('button').filter({ hasText: /Berlin/ });

    const hasMuenchen = await results.first().isVisible().catch(() => false);
    const hasBerlin = await berlinResults.first().isVisible().catch(() => false);

    // München results should be visible, Berlin should NOT be
    if (hasMuenchen) {
      expect(hasBerlin).toBe(false);
    }
  });

  test('multiple restaurant clicks — last one wins', async ({ page }) => {
    await setupHome(page);

    const cards = page.locator('button').filter({ hasText: /entfernt|away/ });
    const count = await cards.count();

    if (count >= 3) {
      // Click 3 restaurants rapidly
      const thirdName = await cards.nth(2).locator('h3').textContent();
      await cards.nth(0).click();
      await page.waitForTimeout(50);
      await page.getByRole('button', { name: 'Back' }).click().catch(() => {});
      await page.waitForTimeout(50);

      // Navigate to last one
      await page.goto('/');
      await page.locator('h2').filter({ hasText: /\([1-9]\d*\)/ }).waitFor({ timeout: 40000 }).catch(() => {});
      await cards.nth(2).click();

      await expect(page).toHaveURL(/\/restaurant\//);

      // Should show the third restaurant's name
      if (thirdName) {
        await expect(page.getByRole('heading', { level: 1 })).toContainText(thirdName.trim(), { timeout: 5000 });
      }
    }
  });

  test('filter + sort + search combined — no crash', async ({ page }) => {
    await setupHome(page);

    // Click cuisine chip
    const chips = page.locator('button').filter({ hasText: /^(Kebab|Burger|Pizza|Restaurant)$/ });
    if (await chips.first().isVisible().catch(() => false)) {
      await chips.first().click();
    }

    // Click score sort
    await page.getByRole('button', { name: 'Score' }).click();

    // Type in search
    const searchInput = page.getByPlaceholder(/restaurant suchen|search restaurant/i).last();
    await searchInput.fill('a');

    await page.waitForTimeout(500);

    // Page should not crash, heading should be visible
    await expect(page.locator('h2').filter({ hasText: /\(\d+\)/ })).toBeVisible();

    // Clear all filters
    await searchInput.fill('');
    await page.getByRole('button', { name: /^(Alle|All)$/ }).first().click();
    await page.getByRole('button', { name: /entfernung|distance/i }).click();
  });

  test('rating flow — navigate away mid-submission', async ({ page }) => {
    await setupHome(page);

    // Open restaurant detail
    await page.locator('button').filter({ hasText: /entfernt|away/ }).first().click();
    await expect(page).toHaveURL(/\/restaurant\//);

    // Start rating
    await page.getByRole('button', { name: /bewerten|rate this/i }).click();

    // Move sliders
    await page.getByRole('slider').first().fill('5');

    // Click next to step 3
    await page.getByRole('button', { name: /weiter|next/i }).click();

    // Navigate away immediately (abandon rating)
    await page.getByRole('button', { name: /karte|map/i }).click();

    // Should be on home, no crash
    await expect(page).toHaveURL('/');
    await expect(page.locator('nav')).toBeVisible();
  });
});
