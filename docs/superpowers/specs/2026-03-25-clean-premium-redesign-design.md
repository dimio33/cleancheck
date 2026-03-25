# CleanCheck — Clean Premium Redesign

**Date:** 2026-03-25
**Status:** Approved
**Scope:** Remove dark mode, refine visual design to "Clean Premium"

## Summary

The current CleanCheck design is 80% good. This redesign removes dark mode (20 files), moves the score badge to a prominent left position as the visual anchor, and refines colors/shadows for a premium feel. No structural changes — a refinement, not a revolution.

## Design Principles

1. **Restraint over decoration** — one accent color (teal), score colors are the only bright elements
2. **Typography does the work** — weight hierarchy (400/500/600) carries the UI, not color
3. **Score is the star** — the colored score badge (left-aligned squircle) is the visual anchor on every card
4. **Warm white, not cold** — keep stone-50 (#FAFAF9) background, white cards with subtle shadows

## Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Page background | Warm white | #FAFAF9 |
| Card background | White | #FFFFFF |
| Card shadow | Subtle gray | `0 1px 3px rgba(0,0,0,0.04)` |
| Primary accent | Teal | #0D9488 |
| Text primary | Near black | #1C1917 |
| Text secondary | Warm gray | #A8A29E |
| Muted background | Light stone | #F5F5F4 |
| Border (rare) | Light stone | #F5F5F4 or #E7E5E4 |
| Score good | Emerald | #10B981 |
| Score medium | Amber | #F59E0B |
| Score bad | Red | #EF4444 |
| Score none | Light stone | #F5F5F4 with #D6D3D1 text |

## Changes by Component

### 1. Global: Remove Dark Mode

**Files affected:** ~20 files (all pages, components, stores, CSS)

- Remove ALL `dark:` Tailwind classes from every file
- Remove dark mode CSS overrides from `index.css` (lines 37-46, 64-66, 79-81, 122-124, 148-151)
- Remove theme toggle from Profile page settings
- Simplify `themeStore.ts` — remove dark/system modes, keep only light
- Remove `dark` class toggle logic from themeStore `init()`
- Remove Leaflet dark tile filter (`.dark .leaflet-tile-pane` invert hack)
- Remove dark scrollbar styles
- Remove dark skeleton shimmer

### 2. Restaurant Cards (`RestaurantCard.tsx`)

**Before:** Score badge right-aligned, small circle, generic store emoji icon left
**After:** Score badge LEFT-aligned as primary visual element, squircle shape (14px radius)

```
[Score Badge]  Restaurant Name        [chevron]
  46x46px      Cuisine · Distance
  squircle
```

- Score badge: 46x46px, border-radius 13px (squircle), white bold text on score-color background
- No score: #F5F5F4 background with "—" in #D6D3D1
- Remove the generic 🏪 emoji icon
- Keep subtle shadow (`0 1px 3px rgba(0,0,0,0.04)`)
- Card border-radius: 14px (slightly less round than current 16px)

### 3. TopBar (`TopBar.tsx`)

- Keep current structure (back button, logo, language toggle)
- Simplify border: `border-b border-stone-100` (currently already this in light mode)
- Remove dark variants
- Language toggle: just text, no special styling needed

### 4. BottomNav (`BottomNav.tsx`)

- Keep SVG icons (not emojis — they look more premium)
- FAB: solid `#0D9488` instead of gradient (`from-teal-500 to-emerald-500`)
- Active tab: teal-600 color (keep current behavior)
- Active indicator dot: keep
- Remove all dark: classes
- Border-top: `border-stone-100`

### 5. Splash Screen (`Splash.tsx`)

- Keep current slide structure and content
- Remove dark: classes
- Keep the gradient teal progress dots
- Background: white to stone-50 (already close)

### 6. Rating Flow (`RatingFlow.tsx`)

- Remove dark: classes
- Keep the step progress bar with teal gradient
- Restaurant selection cards: same new score-left layout as RestaurantCard
- Success screen: keep current animation, remove dark variants
- Score gauge: keep current design

### 7. Profile (`Profile.tsx`)

- Remove dark: classes
- Remove theme toggle (only language setting remains)
- Stats cards: keep current grid layout, remove dark variants
- Badge cards: remove dark variants

### 8. Search (`Search.tsx`)

- Remove dark: classes
- Cuisine filter chips: keep current light styling
- Score filter: keep current light styling

### 9. Other Pages

- `Trending.tsx` — remove dark: classes
- `Auth.tsx` — remove dark: classes
- `RestaurantDetail.tsx` — remove dark: classes, score badge left-aligned
- `QuickRate.tsx` — remove dark: classes
- `LocationPermission.tsx` — remove dark: classes

### 10. CSS (`index.css`)

Remove these blocks:
- `.dark body { ... }` (line 37-41)
- `.dark .bg-white { ... }` (line 43-45)
- `.dark ::-webkit-scrollbar-thumb { ... }` (line 64-66)
- `.dark input[type="range"] { ... }` (line 79-81)
- `.dark .leaflet-tile-pane { ... }` (line 122-124)
- `.dark .skeleton-shimmer { ... }` (line 148-151)

### 11. Stores

- `themeStore.ts` — simplify to light-only, remove `setMode` for dark/system, remove `matchMedia` listener for `prefers-color-scheme`
- Remove `useThemeStore` dark mode references from `App.tsx` init

## What Stays the Same

- Font: Inter (already good)
- Framer Motion animations (already polished)
- Leaflet map with score markers (light mode already works)
- PWA functionality
- Page structure and routing
- Bottom sheet on Home page
- All business logic

## Out of Scope

- No new features
- No new pages
- No structural changes to components
- No backend changes
- No i18n changes (beyond removing theme toggle labels if unused)
