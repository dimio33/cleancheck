# CleanCheck — Full Premium Redesign

**Date:** 2026-03-25
**Status:** Approved
**Reference:** Apple Health, Revolut, N26
**Scope:** Complete visual overhaul — structure, animations, every component

## Design Principles

1. **Restraint** — One accent (teal #0D9488), score colors are the only bright elements. Everything else neutral.
2. **Hierarchy through typography** — Weight (400–800), size (11–24px), letter-spacing (-0.5 to +1.5px) carry the UI, not color.
3. **Score is the star** — Colored squircle badge is the visual anchor on every card and page.
4. **Depth through layering** — Hero sections with overlapping cards (like Revolut). Glassmorphism nav. Subtle shadows.
5. **Motion with purpose** — Every animation serves feedback. Shared element transitions, stagger reveals, spring physics. No gratuitous motion.

## Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Page BG | #FAFAF9 | All page backgrounds |
| Card BG | #FFFFFF | Cards, sheets, modals |
| Card shadow | `0 1px 3px rgba(0,0,0,0.04)` | Default elevation |
| Elevated shadow | `0 4px 12px rgba(0,0,0,0.06)` | Overlapping cards, hero sections |
| Primary accent | #0D9488 | FAB, CTAs, active states, hero gradients |
| Primary gradient | #0D9488 → #14B8A6 | Hero headers, profile, avatars |
| Text primary | #1C1917 | Headings, names, values |
| Text secondary | #A8A29E | Descriptions, labels, timestamps |
| Text tertiary | #D6D3D1 | Chevrons, placeholders, disabled |
| Muted BG | #F5F5F4 | Input fields, inactive chips, skeleton base |
| Border (subtle) | #F5F5F4 | Dividers, nav border-top |
| Score good | #10B981 | Score >= 7.0 |
| Score mid | #F59E0B | Score 4.0–6.9 |
| Score bad | #EF4444 | Score < 4.0 |
| Score none | #F5F5F4 bg, #D6D3D1 text | Unrated restaurants |

## Typography Scale

| Element | Size | Weight | Letter-spacing | Color |
|---------|------|--------|---------------|-------|
| Page title | 20px | 700 | -0.5px | #1C1917 |
| Section heading | 16px | 700 | -0.3px | #1C1917 |
| Card name | 15px | 600 | -0.2px | #1C1917 |
| Body text | 14px | 400 | 0 | #57534E |
| Card subtitle | 13px | 400 | 0 | #A8A29E |
| Section label | 11px | 500 | 1.5px uppercase | #A8A29E |
| Small label | 10px | 600 | 0 | #A8A29E |

## Spacing System

Base unit: 4px. All spacing uses multiples: 4, 8, 12, 16, 20, 24, 32, 48.

| Element | Value |
|---------|-------|
| Page horizontal padding | 20px |
| Card padding | 16px |
| Card gap (in lists) | 10px |
| Card border-radius | 16px |
| Score badge size | 48x48px, border-radius 14px |
| Section gap (vertical) | 24px |
| Icon button size | 36x36px |

## Component Specs

### 1. Remove Dark Mode (Global)

**Files:** ~20 files

- Strip ALL `dark:` Tailwind classes from every .tsx file
- Remove from `index.css`: `.dark body`, `.dark .bg-white`, `.dark ::-webkit-scrollbar-thumb`, `.dark input[type="range"]`, `.dark .leaflet-tile-pane`, `.dark .skeleton-shimmer`
- `themeStore.ts`: gut to a no-op or remove entirely. Remove theme cycling from Profile settings.
- `App.tsx`: remove `initTheme()` call if store is removed

### 2. Home Page (`Home.tsx`) — Restructured

**Before:** Static TopBar → Map → Bottom sheet with list
**After:** Personalized header → Quick actions → Restaurant list (map moves to dedicated tab)

Layout:
```
[Greeting + Avatar]          ← "Guten Morgen" + user initial
[Search bar]                 ← bg #F5F5F4, rounded-12
[Quick Actions: 3 chips]     ← Top bewertet / Neu bewerten / Karte
[Section: "In deiner Nähe"]  ← heading + "Alle →" link
[Restaurant cards]           ← staggered entry animation
[BottomNav]                  ← glassmorphism
```

- Greeting: time-of-day based ("Guten Morgen" / "Guten Tag" / "Guten Abend")
- Quick actions: 3 white cards with tinted icon background (#F0FDF4, #FEF3C7, #EFF6FF)
- Map view: accessible via Quick Action chip or dedicated nav flow, not default view
- Discovery mode (no location): keep city search + trending, same new card style
- Bottom sheet: remove. Replace with scrollable card list.

### 3. Restaurant Cards (`RestaurantCard.tsx`) — Redesigned

```
[Score 48x48]  Name                    [›]
 squircle      Cuisine · Distance · N reviews
 score-color
```

- Score badge: 48x48px, border-radius 14px (squircle), white text (font-weight 700, 15px, letter-spacing -0.5px)
- Score badge colors: #10B981 (good), #F59E0B (mid), #EF4444 (bad), #F5F5F4 with "—" (unrated)
- Card: white bg, border-radius 16px, shadow `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)`
- Chevron: #D6D3D1, 14px
- Animation: `whileTap={{ scale: 0.98 }}` (keep), add stagger on list render (delay: index * 50ms)

### 4. Restaurant Detail (`RestaurantDetail.tsx`) — New Layout

```
[Teal Hero gradient]         ← back/fav/share buttons, name, address
  [Overlapping Score Card]   ← big score squircle + 4 criteria bars
[CTA: "Jetzt bewerten"]     ← solid teal, full width
[Reviews section]            ← heading + sort + review cards
```

- Hero: `linear-gradient(135deg, #0D9488, #14B8A6)`, padding 24px 20px 40px
- Back/fav/share: 32px circles with `rgba(255,255,255,0.2)` background
- Overlapping card: white, border-radius 16px, shadow `0 4px 12px rgba(0,0,0,0.06)`, margin-top -24px
- Score in card: 64x64px squircle, border-radius 18px
- Criteria bars: inline progress bars (3px height), score-colored fill, value label right
- CTA button: #0D9488 solid, border-radius 14px, shadow `0 4px 12px rgba(13,148,136,0.2)`
- Review cards: white, 14px radius, avatar circle (32px), score pill right-aligned

### 5. BottomNav (`BottomNav.tsx`) — Glassmorphism

- Background: `rgba(255,255,255,0.85)` with `backdrop-filter: blur(20px)`
- Border-top: `1px solid rgba(0,0,0,0.04)`
- Keep SVG icons (premium feel)
- Active: #0D9488, inactive: #A8A29E
- FAB: 50px circle, solid #0D9488, shadow `0 4px 16px rgba(13,148,136,0.3)`, margin-top -20px
- Active indicator dot: keep (4px teal circle)
- Remove gradient from FAB

### 6. TopBar (`TopBar.tsx`) — Simplified

On Home: **no TopBar** (personalized header replaces it).
On other pages: minimal back bar.

- Back button: just chevron, no background
- Title: "CleanCheck" with teal dot, font-weight 600
- Language: plain text, #A8A29E
- Border: `border-b border-stone-100`

### 7. Rating Flow (`RatingFlow.tsx`) — Premium Sliders

**Step 1 (Restaurant selection):**
- Same new card layout (score-left)
- Search input: #F5F5F4 bg, rounded-12
- fetchRestaurants on mount (already fixed)

**Step 2 (Criteria):**
- Slider track: gradient fill (red→amber→green based on position)
- Thumb: 24px white circle, 3px score-colored border, shadow
- Tick marks below: 1-5 labels, active value highlighted
- Current value: large number right-aligned (20px, font-weight 700, score-colored)
- Haptic feedback: `navigator.vibrate(10)` on each step change

**Step 3 (Photo + Comment):**
- Keep current layout, remove dark: classes
- Comment textarea: maxLength=1000 (already added)

**Step 4 (Success):**
- Checkmark in teal squircle (not circle) — 80x80px, border-radius 22px
- Score: large squircle (100x100, border-radius 28px), score-colored, number animates 0→value
- Confetti: colored dots animate outward with Framer Motion
- "Fertig" CTA: solid teal

### 8. Profile (`Profile.tsx`) — Dashboard Style

```
[Teal gradient hero]         ← avatar, name, member since
  [Overlapping stat cards]   ← 3 white cards (Bewertungen / Restaurants / Schnitt)
[Badges section]             ← earned + locked (dimmed)
[Recent activity]            ← mini cards with score + name + date
[Settings]                   ← language only (theme toggle removed)
```

- Hero: same gradient as Restaurant Detail (#0D9488 → #14B8A6)
- Avatar: 72px circle, rgba(255,255,255,0.2) bg, white initial letter
- Stat cards: 3 flex items, white bg, border-radius 14px, shadow, margin-top -24px overlapping
- Stat values: 28px, font-weight 800
- Activity feed: grouped card with dividers (like iOS Settings)
- Settings: language only. No theme toggle.

### 9. Splash (`Splash.tsx`) — Cleaner

- Remove dark: classes
- Background: white (#FFFFFF)
- Keep 3-slide structure
- Progress dots: teal active (24px wide pill), stone-200 inactive (6px circle)
- CTA buttons: solid teal (#0D9488)
- Typography: use new scale (20px/700 for titles)

### 10. Search (`Search.tsx`) — Refined

- Remove dark: classes
- Use new card layout (score-left)
- Cuisine chips: stone-800 active (white text), #F5F5F4 inactive (#78716C text)
- Score filter chips: same style as cuisine
- Search input: #F5F5F4 bg, rounded-12

### 11. Trending (`Trending.tsx`) — Refined

- Remove dark: classes
- Use new card layout (score-left)
- Keep "last 7 days" logic

### 12. Auth (`Auth.tsx`) — Minimal

- Remove dark: classes
- Keep current layout (it's already clean)
- CTA: solid teal instead of gradient

### 13. Other Components

- `ScoreGauge.tsx`: keep SVG gauge, use score colors, animate fill on mount
- `CriteriaSlider.tsx`: gradient track, score-colored thumb border, tick marks
- `BadgeCard.tsx`: remove dark:, earned = white card + subtle shadow, locked = #F5F5F4 + opacity 0.5
- `Skeleton.tsx`: remove dark shimmer, keep light shimmer
- `ErrorBoundary.tsx`: remove dark:
- `Toast.tsx`: remove dark:, keep current colors (emerald/rose/stone-800)
- `OfflineBanner.tsx`: remove dark:
- `LocationDeniedBanner.tsx`: remove dark:
- `PWAUpdatePrompt.tsx`: remove dark:
- `QRCodeModal.tsx`: remove dark:

## Animations Spec

All animations use Framer Motion (already installed).

| Animation | Where | Spec |
|-----------|-------|------|
| **Stagger reveal** | Card lists (Home, Search, Trending) | `initial={{ opacity: 0, y: 12 }}`, `animate={{ opacity: 1, y: 0 }}`, delay: `index * 50ms`, transition: spring (damping 20, stiffness 300) |
| **Score counter** | RestaurantDetail score, Rating success | Animate number 0 → value over 600ms with ease-out. Use `useMotionValue` + `useTransform` |
| **Page transition** | All route changes | `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, duration 200ms |
| **Score badge morph** | Card → Detail (future enhancement) | `layoutId="score-{id}"` on score badge. Framer auto-animates position + size. |
| **Pull to refresh** | Home card list | Custom implementation: overscroll → teal spinner → refetch. spring physics. |
| **Haptic slider** | Rating criteria | `navigator.vibrate(10)` on value change (if supported) |
| **Success celebration** | Rating step 4 | Checkmark scale spring (delay 0.2s), score counter animate, 12 confetti dots animate outward + fade |
| **Tap feedback** | All interactive cards/buttons | `whileTap={{ scale: 0.98 }}` (keep existing) |
| **Skeleton pulse** | Loading states | Keep existing shimmer animation, remove dark variant |

## CSS Changes (`index.css`)

**Remove:**
- All `.dark` prefixed blocks (6 blocks)
- `--slider-track` dark variable

**Keep:**
- Font smoothing
- Base body styles
- Scrollbar thin styling (light only)
- Range slider styling (light only)
- Leaflet overrides (light only)
- Selection color
- Skeleton shimmer (light only)
- Focus visible
- Safe area insets
- Print styles

## Files Changed

Every .tsx file in pages/ and components/ will be touched. Full list:

**Pages (10):** Home, Search, RatingFlow, RestaurantDetail, Profile, Auth, Splash, Trending, QuickRate, LocationPermission

**Components (10):** TopBar, BottomNav, RestaurantCard, BadgeCard, CriteriaSlider, ScoreGauge, ErrorBoundary, Toast, Skeleton, QRCodeModal, OfflineBanner, LocationDeniedBanner, PWAUpdatePrompt

**Stores (2):** themeStore, (possibly geoStore if greeting needs time)

**Styles (1):** index.css

**Router (1):** router.tsx (dark: in 404 page)

**App (1):** App.tsx (dark: bg, initTheme)

**Total: ~25 files**

## What Stays

- Font: Inter
- Leaflet map + score markers (light mode)
- PWA (service worker, offline drafts)
- All backend API integration
- All business logic
- Routing structure
- i18n (DE/EN)

## Out of Scope

- No new features or pages
- No backend changes
- No new dependencies (Framer Motion already installed)
- No routing changes
