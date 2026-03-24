import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow — Fresh User', () => {
  test('splash → location permission → home', async ({ page }) => {
    // Clear all storage to simulate fresh user
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');

    await page.waitForTimeout(1000);
    const url1 = page.url();
    console.log('Step 1:', url1);
    await page.screenshot({ path: 'e2e/screenshots/onboarding-1.png' });

    // Should be on splash
    if (url1.includes('/splash')) {
      // Click through splash screens
      for (let i = 0; i < 5; i++) {
        const nextBtn = page.getByRole('button', { name: /weiter|next|los|start/i }).first();
        const visible = await nextBtn.isVisible().catch(() => false);
        if (visible) {
          await nextBtn.click();
          await page.waitForTimeout(500);
          console.log(`Splash step ${i + 1}:`, page.url());
        } else {
          break;
        }
      }
      await page.screenshot({ path: 'e2e/screenshots/onboarding-2-after-splash.png' });
    }

    const url2 = page.url();
    console.log('Step 2:', url2);

    // Should be on location-permission now
    if (url2.includes('/location-permission')) {
      await page.screenshot({ path: 'e2e/screenshots/onboarding-3-permission.png' });

      // Click "Standort aktivieren" — should either grant or show denied state
      const enableBtn = page.getByRole('button', { name: /standort aktivieren|enable location/i });
      if (await enableBtn.isVisible().catch(() => false)) {
        await enableBtn.click();
        await page.waitForTimeout(3000);
        console.log('After enable:', page.url());
        await page.screenshot({ path: 'e2e/screenshots/onboarding-4-after-enable.png' });
      }

      // If still on permission page, click skip
      if (page.url().includes('/location-permission')) {
        const skipBtn = page.getByRole('button', { name: /ohne standort|without location|fortfahren/i });
        if (await skipBtn.isVisible().catch(() => false)) {
          await skipBtn.click();
          await page.waitForTimeout(2000);
          console.log('After skip:', page.url());
        }
      }
    }

    // Should be on home now
    const finalUrl = page.url();
    console.log('Final:', finalUrl);
    await page.screenshot({ path: 'e2e/screenshots/onboarding-final.png' });

    // Verify we're on home and it's functional
    expect(finalUrl).toContain('cleancheck.e-findo.de');
    expect(finalUrl).not.toContain('/splash');
    // Nav should be visible
    await expect(page.locator('nav')).toBeVisible();
  });

  test('location permission denied → navigates to home', async ({ page }) => {
    // Simulate denied state
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('cleancheck_onboarded', 'true');
      localStorage.removeItem('cleancheck_geo_asked');
      localStorage.setItem('cleancheck_geo_permission', 'denied');
    });
    await page.goto('/');

    await page.waitForTimeout(1000);
    console.log('URL with denied permission:', page.url());
    await page.screenshot({ path: 'e2e/screenshots/denied-1.png' });

    // If on location-permission, click "Nochmal versuchen" or "Ohne Standort"
    if (page.url().includes('/location-permission')) {
      // Try "Nochmal versuchen" — should navigate away since already denied
      const retryBtn = page.getByRole('button', { name: /nochmal versuchen|try again/i });
      if (await retryBtn.isVisible().catch(() => false)) {
        await retryBtn.click();
        await page.waitForTimeout(3000);
        console.log('After retry:', page.url());
        await page.screenshot({ path: 'e2e/screenshots/denied-2-after-retry.png' });
      }

      // If still stuck, click skip
      if (page.url().includes('/location-permission')) {
        const skipBtn = page.getByRole('button', { name: /ohne standort|without location|fortfahren/i });
        if (await skipBtn.isVisible().catch(() => false)) {
          await skipBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Should be on home
    expect(page.url()).not.toContain('/location-permission');
    await expect(page.locator('nav')).toBeVisible();
  });
});
