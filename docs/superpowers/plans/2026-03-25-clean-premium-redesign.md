# CleanCheck Full Premium Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform CleanCheck into a premium, modern app (Apple Health / Revolut style) — remove dark mode, redesign every component and page, add premium animations.

**Architecture:** Light-only theme. Layered depth (hero sections + overlapping cards). Glassmorphism nav. Score-badge-left card pattern. Stagger + spring animations via Framer Motion. No new dependencies needed.

**Tech Stack:** React 19, Tailwind CSS v4, Framer Motion, Zustand, Vite

**Spec:** `docs/superpowers/specs/2026-03-25-clean-premium-redesign-design.md`

---

## Wave 1: Foundation (CSS + Dark Mode Removal)

### Task 1: Strip dark mode from CSS and themeStore

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/stores/themeStore.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Clean index.css — remove all `.dark` blocks**

Remove these CSS blocks:
- `.dark body { ... }` and `--slider-track` variable
- `.dark .bg-white { ... }`
- `.dark ::-webkit-scrollbar-thumb { ... }`
- `.dark input[type="range"] { ... }`
- `.dark .leaflet-tile-pane { ... }`
- `.dark .skeleton-shimmer { ... }`

- [ ] **Step 2: Gut themeStore.ts to light-only**

Replace entire file with a minimal stub that does nothing (keeps imports working):

```typescript
import { create } from 'zustand';

interface ThemeStore {
  mode: 'light';
  init: () => void;
}

export const useThemeStore = create<ThemeStore>(() => ({
  mode: 'light',
  init: () => {
    document.documentElement.classList.remove('dark');
  },
}));
```

- [ ] **Step 3: Simplify App.tsx — remove dark bg class**

Change root div from:
```
bg-stone-50 dark:bg-stone-950
```
to:
```
bg-stone-50
```

- [ ] **Step 4: Run `npx tsc --noEmit` to verify no type errors**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/index.css frontend/src/stores/themeStore.ts frontend/src/App.tsx
git commit -m "refactor: remove dark mode foundation (CSS + themeStore)"
```

---

### Task 2: Strip dark: classes from all components

**Files:**
- Modify: `frontend/src/components/layout/TopBar.tsx`
- Modify: `frontend/src/components/layout/BottomNav.tsx`
- Modify: `frontend/src/components/ui/RestaurantCard.tsx`
- Modify: `frontend/src/components/ui/BadgeCard.tsx`
- Modify: `frontend/src/components/ui/CriteriaSlider.tsx`
- Modify: `frontend/src/components/ui/ScoreGauge.tsx`
- Modify: `frontend/src/components/ui/ErrorBoundary.tsx`
- Modify: `frontend/src/components/ui/Toast.tsx`
- Modify: `frontend/src/components/ui/Skeleton.tsx`
- Modify: `frontend/src/components/ui/OfflineBanner.tsx`
- Modify: `frontend/src/components/ui/LocationDeniedBanner.tsx`
- Modify: `frontend/src/components/ui/PWAUpdatePrompt.tsx`

- [ ] **Step 1: Remove all `dark:` classes from every component file**

Use regex find/replace: strip all `dark:[\w\[\]\/.-]+` patterns from className strings. Clean up any resulting double-spaces.

- [ ] **Step 2: Run `npx tsc --noEmit` to verify**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/
git commit -m "refactor: strip dark: classes from all components"
```

---

### Task 3: Strip dark: classes from all pages

**Files:**
- Modify: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/pages/Search.tsx`
- Modify: `frontend/src/pages/RatingFlow.tsx`
- Modify: `frontend/src/pages/RestaurantDetail.tsx`
- Modify: `frontend/src/pages/Profile.tsx`
- Modify: `frontend/src/pages/Auth.tsx`
- Modify: `frontend/src/pages/Splash.tsx`
- Modify: `frontend/src/pages/Trending.tsx`
- Modify: `frontend/src/pages/QuickRate.tsx`
- Modify: `frontend/src/pages/LocationPermission.tsx`
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Remove all `dark:` classes from every page file + router**

Same regex approach as Task 2.

- [ ] **Step 2: Run `npx tsc --noEmit` and visually verify `npm run dev` loads**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ frontend/src/router.tsx
git commit -m "refactor: strip dark: classes from all pages"
```

---

## Wave 2: Core Components (used across all pages)

### Task 4: Redesign RestaurantCard — Score badge left

**Files:**
- Modify: `frontend/src/components/ui/RestaurantCard.tsx`
- Modify: `frontend/src/utils/geo.ts` (check getScoreColor)

- [ ] **Step 1: Rewrite RestaurantCard.tsx**

New layout: score-badge left (48x48 squircle), name + subtitle center, chevron right.

```tsx
// Score badge colored by score value
// 48x48px, border-radius 14px (squircle)
// White bold text on score-color bg
// Unrated: bg-stone-100 with "—"
```

Card styles:
- `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]`
- Padding: `p-4`
- Gap between badge and text: `gap-3.5`
- `whileTap={{ scale: 0.98 }}` (keep)
- Stagger animation: `initial={{ opacity: 0, y: 12 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ delay: index * 0.05, type: 'spring', damping: 20, stiffness: 300 }}`

- [ ] **Step 2: Verify card renders correctly in browser**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/RestaurantCard.tsx
git commit -m "feat: redesign RestaurantCard — score badge left, squircle, stagger"
```

---

### Task 5: Redesign BottomNav — Glassmorphism

**Files:**
- Modify: `frontend/src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Apply glassmorphism + solid teal FAB**

Key changes:
- Nav background: `bg-white/85 backdrop-blur-xl` with `border-t border-black/[0.04]`
- FAB: solid `bg-teal-600` instead of gradient, `shadow-[0_4px_16px_rgba(13,148,136,0.3)]`
- Active tab color: `text-teal-600`
- Inactive: `text-stone-400`
- Keep SVG icons, keep active dot indicator
- Keep `pb-safe` for PWA

- [ ] **Step 2: Verify nav looks correct, content scrolls behind blur**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/BottomNav.tsx
git commit -m "feat: glassmorphism BottomNav + solid teal FAB"
```

---

### Task 6: Simplify TopBar

**Files:**
- Modify: `frontend/src/components/layout/TopBar.tsx`

- [ ] **Step 1: Clean up TopBar — minimal, light-only**

- Border: `border-b border-stone-100`
- Background: `bg-white`
- Logo: teal dot + "CleanCheck" (font-weight 600, text-stone-800)
- Language toggle: plain text `text-stone-400`
- Back button: simple chevron, no hover background needed

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/TopBar.tsx
git commit -m "feat: simplify TopBar — clean, minimal"
```

---

### Task 7: Redesign CriteriaSlider — Gradient track + haptics

**Files:**
- Modify: `frontend/src/components/ui/CriteriaSlider.tsx`
- Modify: `frontend/src/index.css` (range slider styles)

- [ ] **Step 1: Update CriteriaSlider component**

- Show current value as large number right-aligned (text-xl font-bold, score-colored)
- Slider thumb: white circle, score-colored border
- Add tick mark labels (1-5) below slider
- Add haptic: `if ('vibrate' in navigator) navigator.vibrate(10);` on value change

- [ ] **Step 2: Update CSS range slider styles**

- Track: gradient from red through amber to green
- Thumb: white with teal border, shadow on active

- [ ] **Step 3: Verify slider works on mobile (touch)**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/CriteriaSlider.tsx frontend/src/index.css
git commit -m "feat: premium CriteriaSlider — gradient track, haptics, tick marks"
```

---

## Wave 3: Page Redesigns

### Task 8: Redesign Home page — Personalized header + card list

**Files:**
- Modify: `frontend/src/pages/Home.tsx`

- [ ] **Step 1: Restructure Home with personalized header**

Replace TopBar on Home with inline header:
- Greeting: time-of-day based (compute from `new Date().getHours()`)
- City name from search or "In deiner Nähe"
- User avatar circle (right-aligned)
- Search bar: `bg-stone-100 rounded-xl` with search icon

- [ ] **Step 2: Add Quick Action chips**

3 tinted cards in a flex row:
- "Top bewertet" (green icon bg)
- "Neu bewerten" (amber icon bg) → navigates to /rate
- "Karte" (blue icon bg) → scrolls to map or opens map view

- [ ] **Step 3: Replace bottom sheet with scrollable card list**

Remove the draggable bottom sheet (SnapPoints, touch handlers). Replace with:
- Section heading "In deiner Nähe" + "Alle →" link
- Scrollable list of RestaurantCards (new design from Task 4)
- Keep sort toggle (Entfernung / Score)
- Keep cuisine filter chips
- Keep city search + name filter functionality

- [ ] **Step 4: Keep map view accessible**

Map still renders in the background (keep MapContainer). Add a "Karte anzeigen" button or Quick Action that expands the map. The list is the default view, map is secondary.

- [ ] **Step 5: Verify Home loads, restaurants display, search works, map accessible**

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Home.tsx
git commit -m "feat: redesign Home — personalized header, quick actions, card list"
```

---

### Task 9: Redesign RestaurantDetail — Teal hero + overlapping score card

**Files:**
- Modify: `frontend/src/pages/RestaurantDetail.tsx`

- [ ] **Step 1: Add teal gradient hero header**

- Background: `bg-gradient-to-br from-teal-600 to-teal-500`
- White text: restaurant name (24px/700) + address (14px/opacity-80)
- Back/fav/share buttons: 32px circles with `bg-white/20`
- Padding bottom extra (40px) to allow overlap

- [ ] **Step 2: Overlapping score card**

- White card with `rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)]`
- Negative margin-top (-24px) to overlap hero
- Layout: 64x64 score squircle left + 4 criteria progress bars right (2-column grid)
- Each bar: 3px height, score-colored fill, value label right

- [ ] **Step 3: CTA + Reviews section**

- "Jetzt bewerten" button: solid teal, full width, rounded-xl
- Reviews heading with count + sort toggle
- Review cards: white bg, avatar circle, score pill, comment text

- [ ] **Step 4: Verify detail page loads for OSM and DB restaurants**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/RestaurantDetail.tsx
git commit -m "feat: redesign RestaurantDetail — teal hero, overlapping score card"
```

---

### Task 10: Redesign Profile — Dashboard style

**Files:**
- Modify: `frontend/src/pages/Profile.tsx`

- [ ] **Step 1: Add teal gradient hero**

- Same gradient as RestaurantDetail
- Avatar: 72px circle, `bg-white/20`, white initial letter (28px/700)
- Name: 20px/700 white
- "Mitglied seit": 13px white/70

- [ ] **Step 2: Overlapping stat cards**

- 3 flex cards, white bg, rounded-xl, shadow, margin-top -24px
- Value: 28px/800 text-stone-900
- Label: 11px/500 text-stone-400 uppercase

- [ ] **Step 3: Activity feed + settings**

- Badges: keep existing grid, remove dark classes
- Rating history: grouped card with dividers (iOS Settings style)
- Settings: language only (remove theme toggle entirely)

- [ ] **Step 4: Verify guest profile and authenticated profile both work**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Profile.tsx
git commit -m "feat: redesign Profile — gradient hero, overlapping stats, activity feed"
```

---

### Task 11: Redesign RatingFlow — Premium sliders + success

**Files:**
- Modify: `frontend/src/pages/RatingFlow.tsx`

- [ ] **Step 1: Update Step 1 (restaurant selection)**

- Use new card layout from RestaurantCard
- Search input: `bg-stone-100 rounded-xl`
- Section label: 11px uppercase stone-400

- [ ] **Step 2: Update Step 2 (criteria) to use new sliders**

- Already handled by CriteriaSlider redesign (Task 7)
- Update container styling: white card, subtle shadow
- Overall score preview: keep ScoreGauge

- [ ] **Step 3: Update Step 4 (success)**

- Checkmark: teal squircle 80x80, border-radius 22px
- Score: large squircle 100x100, border-radius 28px, score-colored
- Animated score counter (0 → value, 600ms ease-out)
- "Fertig" CTA: solid teal
- Keep confetti dots

- [ ] **Step 4: Verify complete rating flow works end-to-end**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/RatingFlow.tsx
git commit -m "feat: redesign RatingFlow — premium success screen, clean cards"
```

---

### Task 12: Update remaining pages (Splash, Search, Trending, Auth, QuickRate, LocationPermission)

**Files:**
- Modify: `frontend/src/pages/Splash.tsx`
- Modify: `frontend/src/pages/Search.tsx`
- Modify: `frontend/src/pages/Trending.tsx`
- Modify: `frontend/src/pages/Auth.tsx`
- Modify: `frontend/src/pages/QuickRate.tsx`
- Modify: `frontend/src/pages/LocationPermission.tsx`

- [ ] **Step 1: Splash — cleaner typography, solid teal CTAs**

- Background: white
- Title: 20px/700 tracking-tight
- CTA: solid `bg-teal-600` (no gradient)
- Progress dots: active = 24px wide pill teal, inactive = 6px circle stone-200

- [ ] **Step 2: Search — new card layout + clean chips**

- Use RestaurantCard (already redesigned)
- Chips: `bg-stone-800 text-white` active, `bg-stone-100 text-stone-500` inactive
- Search input: `bg-stone-100 rounded-xl`

- [ ] **Step 3: Trending — new card layout**

- Use score-left card pattern (same as RestaurantCard)
- Clean headings with spec typography

- [ ] **Step 4: Auth — solid teal CTA**

- Replace gradient with `bg-teal-600`
- Keep everything else (already clean)

- [ ] **Step 5: QuickRate + LocationPermission — clean up**

- Remove remaining dark: classes
- Solid teal CTAs

- [ ] **Step 6: Verify all pages render correctly**

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/
git commit -m "feat: update Splash, Search, Trending, Auth, QuickRate, LocationPermission"
```

---

## Wave 4: Premium Animations

### Task 13: Add animated score counter

**Files:**
- Create: `frontend/src/components/ui/AnimatedScore.tsx`

- [ ] **Step 1: Create AnimatedScore component**

Uses Framer Motion `useMotionValue`, `useTransform`, `animate` to count from 0 → value over 600ms.

```tsx
interface Props {
  value: number;
  className?: string;
}
```

Animate on mount. Display formatted to 1 decimal.

- [ ] **Step 2: Integrate into RestaurantDetail (hero score) and RatingFlow success**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/AnimatedScore.tsx frontend/src/pages/RestaurantDetail.tsx frontend/src/pages/RatingFlow.tsx
git commit -m "feat: animated score counter component"
```

---

### Task 14: Add pull-to-refresh on Home

**Files:**
- Create: `frontend/src/components/ui/PullToRefresh.tsx`
- Modify: `frontend/src/pages/Home.tsx`

- [ ] **Step 1: Create PullToRefresh wrapper component**

Touch-based: track touchstart/touchmove/touchend. When overscroll > 60px at top, show teal spinner and call onRefresh callback. Spring animation to snap back.

- [ ] **Step 2: Wrap Home card list with PullToRefresh**

onRefresh: invalidate restaurantStore + refetch.

- [ ] **Step 3: Test on mobile viewport**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/PullToRefresh.tsx frontend/src/pages/Home.tsx
git commit -m "feat: pull-to-refresh on Home page"
```

---

## Wave 5: Final Polish

### Task 15: TypeScript check + visual QA

**Files:** All modified files

- [ ] **Step 1: Run `npx tsc --noEmit` — fix any errors**

- [ ] **Step 2: Run `npm run build` — verify production build succeeds**

- [ ] **Step 3: Visual QA with Playwright — screenshot every page**

Open each route, take screenshot, verify no layout breaks:
- `/` (Home)
- `/splash`
- `/search`
- `/rate`
- `/trending`
- `/profile`
- `/auth`

- [ ] **Step 4: Check console for errors**

- [ ] **Step 5: Fix any issues found**

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "fix: visual QA polish"
```

---

### Task 16: Deploy

- [ ] **Step 1: Push to GitHub (auto-deploys backend on Railway)**

```bash
git push origin main
```

- [ ] **Step 2: Build and deploy frontend to Strato**

```bash
# Build
cd frontend && VITE_API_URL=https://backend-production-900c.up.railway.app/api VITE_DEMO_MODE=false npm run build && cd ..

# Deploy via SFTP
printf 'kL2qP3***95!' > /tmp/strato_pw
sshpass -f /tmp/strato_pw sftp ... (same as deploy.sh)
rm -f /tmp/strato_pw
```

- [ ] **Step 3: Verify https://cleancheck.e-findo.de returns 200 and renders correctly**

- [ ] **Step 4: Commit deploy verification**
