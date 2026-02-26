# BiteInsight — Design System Rules for Claude

This file gives Claude persistent context about the BiteInsight project's design system, component patterns, and conventions. Always read this before implementing or modifying any UI.

---

## Tech Stack

- **Framework**: React Native (Expo SDK 54) + Expo Router v6
- **Language**: TypeScript
- **Styling**: `StyleSheet.create()` — NOT NativeWind/Tailwind in component source files
- **Icons**: Custom SVG components in `components/MenuIcons.tsx` and `components/TabIcons.tsx` (preferred over Ionicons)
- **Fonts**: Figtree via `@expo-google-fonts/figtree` (weights: 300 Light, 700 Bold)
- **Backend**: Supabase (auth + database)

---

## Design Tokens

Always import from `@/constants/theme`:

```ts
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
```

### Colors
```
Colors.background        = '#e2f1ee'   — page/screen background
Colors.primary           = '#023432'   — primary text, headings, dark teal
Colors.secondary         = '#00776f'   — secondary text, icons
Colors.accent            = '#3b9586'   — interactive teal, accent elements
Colors.surface.secondary = '#ffffff'   — card surfaces, white
Colors.surface.tertiary  = '#f1f8f7'   — row backgrounds, subtle fill
Colors.surface.contrast  = '#023432'   — dark surface (inverse)
Colors.status.negative   = '#ff3f42'   — errors, harmful warnings
Colors.status.positive   = '#3b9586'   — good/healthy indicators
Colors.stroke.primary    = '#ffffff'   — default card border (white)
'#aad4cd'                            — teal stroke used on scan/history cards

Dietary tag colours (use for dietary preference pills):
Colors.dietary.diabetic    = '#b8d828'
Colors.dietary.keto        = '#ffa569'
Colors.dietary.glutenFree  = '#ff7779'
Colors.dietary.vegan       = '#a8d5a2'
Colors.dietary.vegetarian  = '#c8e6c9'
Colors.dietary.lactose     = '#fff9c4'
Colors.dietary.pescatarian = '#b3e5fc'
Colors.dietary.kosher      = '#d4b8e0'

Nutrient rating colours (extra, not in theme.ts):
'#009a1f'  — positive/amazing (nutri-score A, Low fat/salt/carbs, High fiber/protein)
'#b8d828'  — good lime (nutri-score B)
'#ffc72d'  — ok yellow (nutri-score C)
'#ff8736'  — poor orange (nutri-score D, Moderate ratings)
'#ff7779'  — high red (nutri-score E, High fat/salt/carbs)
```

### Typography
Always pair `fontSize` with `fontFamily` and `fontWeight` explicitly:
```
Heading 1: fontSize:36, lineHeight:44, fontWeight:'700', fontFamily:'Figtree_700Bold', letterSpacing:-0.72
Heading 2: fontSize:30, lineHeight:36, fontWeight:'700', fontFamily:'Figtree_700Bold', letterSpacing:-0.6
Heading 3: fontSize:24, lineHeight:30, fontWeight:'700', fontFamily:'Figtree_700Bold', letterSpacing:-0.48
Heading 4: fontSize:18, lineHeight:24, fontWeight:'700', fontFamily:'Figtree_700Bold', letterSpacing:-0.36
Heading 5: fontSize:16, lineHeight:20, fontWeight:'700', fontFamily:'Figtree_700Bold', letterSpacing:0
Heading 6: fontSize:14, lineHeight:17, fontWeight:'700', fontFamily:'Figtree_700Bold', letterSpacing:-0.28
Body Large: fontSize:18, lineHeight:30, fontWeight:'300', fontFamily:'Figtree_300Light', letterSpacing:-0.5
Body Regular: fontSize:16, lineHeight:24, fontWeight:'300', fontFamily:'Figtree_300Light', letterSpacing:0
Body Small: fontSize:14, lineHeight:21, fontWeight:'300', fontFamily:'Figtree_300Light', letterSpacing:-0.14
Label: fontSize:13, lineHeight:16, fontWeight:'700', fontFamily:'Figtree_700Bold', letterSpacing:-0.26
```

### Spacing
```
Spacing.xxs = 4
Spacing.xs  = 8
Spacing.s   = 16
Spacing.m   = 24
Spacing.l   = 32
Spacing.xl  = 48
```

### Radius
```
Radius.s    = 4
Radius.m    = 8
Radius.l    = 16
Radius.full = 999
```

### Shadows
Use `...Shadows.level4` for cards, `...Shadows.level3` for badges, `...Shadows.level2` for active/elevated elements.

---

## Icon Usage Rules

**ALWAYS prefer custom icon components over Ionicons.**

| Use case | Component | Import |
|---|---|---|
| Back button | `MenuArrowLeftIcon` | `@/components/MenuIcons` |
| Row chevron | `MenuChevronRightIcon` | `@/components/MenuIcons` |
| Menu navigation items | `MenuDashboardIcon`, `MenuHistoryIcon`, etc. | `@/components/MenuIcons` |
| Tab bar | `DashboardIcon`, `RecipesIcon`, `HistoryIcon`, `ScannerIcon` | `@/components/TabIcons` |
| Like/dislike/flag in ingredient rows | `MenuLikedIcon`, `MenuDislikedIcon`, `MenuFlaggedIcon` | `@/components/MenuIcons` |
| Food nutrition icons | Local PNG assets in `assets/icons/food/` | `require(...)` |
| No custom icon available | `Ionicons` from `@expo/vector-icons` | Only as last resort |

All custom icon components accept `color: string` and optional `size?: number` props.

---

## Component Inventory

Reuse these before creating new components:

| Component | File | When to use |
|---|---|---|
| `DietaryTag` | `@/components/DietaryTag` | Dietary preference pill badges |
| `IngredientRow` | `@/components/IngredientRow` | Like/dislike/flag ingredient list items |
| `StatPanel` | `@/components/StatPanel` | Dashboard stat cards |
| `DailyInsightCard` | `@/components/DailyInsightCard` | Daily insight cards on home screen |
| `Button` | `@/components/Button` | primary / outline / ghost button variants |
| `MenuModal` | `@/components/MenuModal` | Slide-out navigation drawer |

---

## Key Layout Patterns

### Scan / History Card (white surface with teal border)
```ts
{
  backgroundColor: Colors.surface.secondary,  // white
  borderRadius: Radius.l,                      // 16px
  borderWidth: 1,
  borderColor: '#aad4cd',
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: Spacing.s,
  paddingVertical: Spacing.s,
  gap: Spacing.s,
  ...Shadows.level4,
}
```

### Nutrition Row (per Figma Macro Stack, node 3263-5386)
CRITICAL: Each row is INDIVIDUALLY styled — do NOT wrap in a shared card container.
```ts
// Parent container:
{ gap: Spacing.xxs }  // 4px between rows

// Each row:
{
  backgroundColor: Colors.surface.tertiary,  // #f1f8f7
  borderRadius: Radius.m,                    // 8px (NOT 16!)
  flexDirection: 'row',
  alignItems: 'center',
  paddingLeft: Spacing.xs,                   // 8px
  paddingRight: Spacing.s,                   // 16px
  paddingVertical: Spacing.xs,               // 8px
  gap: Spacing.s,                            // 16px
}
// Icon container: 32×32, icon image: 24×24
// Label: Typography h5 (16px bold)
// Value: Typography h5, textAlign: 'center', minWidth for numbers
// Rating: fontSize:14, letterSpacing:-0.28, width:63, lineHeight:1.2 (approx 17px)
```

### Section Heading
```ts
// Title: Heading 4 — 18px bold, -0.36 tracking, 24 line height
// Subtitle: Body Small — 14px light, -0.14 tracking, 21 line height
```

### Tab Bar Active Pill
```ts
{
  backgroundColor: Colors.surface.tertiary,
  borderWidth: 2,
  borderColor: '#aad4cd',
  borderRadius: Radius.full,
  paddingHorizontal: Spacing.xs,
  paddingVertical: 4,
}
```

---

## Nutri-score Scale (Figma node 3263-5506)
- **Circles**: 24×30px, `gap: 4`, placed in a `flexDirection: 'row'` container
- **Active grade**: full background color + `borderWidth: 2, borderColor: '#fff'` + `Shadows.level2`
- **Inactive grades**: `opacity: 0.1` (10%, NOT 22%)
- **Grade colors**: A=#009a1f, B=#b8d828, C=#ffc72d, D=#ff8736, E=#ff3f42
- **Badge labels**: A=Amazing, B=Good, C=OK, D=Poor, E=Bad

---

## Food Nutrition Icons

The Figma Macro Stack (node 3263-5386) uses custom food icon images (not Ionicons).
These are saved as PNGs in `assets/icons/food/`:

```
calories.png   — fire/flame icon
fat.png        — water drop (outline)
sat-fat.png    — water drop (filled)
carbs.png      — grains icon
sugars.png     — sweets/candy icon
fiber.png      — hexagonal fiber pattern
protein.png    — protein molecule icon
net-carbs.png  — grains (net) icon
salt.png       — salt shaker icon
```

Use these in nutrition rows:
```tsx
<Image source={require('@/assets/icons/food/calories.png')} style={{ width: 24, height: 24 }} />
```

---

## Figma → Code Workflow

1. **Fetch individual component nodes** (not whole screens) for accuracy
2. **Check the screenshot** returned by `get_design_context` — it shows the exact visual
3. **Map Figma CSS variables** to theme tokens:
   - `var(--foreground/primary)` → `Colors.primary`
   - `var(--foreground/secondary)` → `Colors.secondary`
   - `var(--surface/tertiary)` → `Colors.surface.tertiary`
   - `var(--surface/secondary)` → `Colors.surface.secondary`
   - `var(--gap/xxs)` → `Spacing.xxs` (4)
   - `var(--gap/xs)` → `Spacing.xs` (8)
   - `var(--gap/s)` → `Spacing.s` (16)
   - `var(--gap/m)` → `Spacing.m` (24)
   - `var(--m)` radius → `Radius.m` (8)
   - `var(--l)` radius → `Radius.l` (16)
4. **The Figma output is React+Tailwind** — always convert to React Native StyleSheet
5. **Share screenshots** of the running app when something "doesn't look right" — side-by-side comparison is the fastest way to find discrepancies

---

## Supabase Schema

Tables:
- `profiles` — id, email, full_name, avatar_url, dietary_preferences (DietaryTag[]), created_at
- `scans` — id, user_id, barcode, product_name, brand, image_url, nutriscore_grade, flagged_count, scanned_at

Always use `useAuth()` from `@/lib/auth` to get the current session. Never call `supabase.auth.getSession()` directly in screens.

---

## Bug Tracking System

BiteInsight uses a local bug tracker stored in `bugs.json` at the project root. A companion HTML UI lives at `bug-tracker.html`.

### bugs.json Schema

```json
[
  {
    "id": "BUG-XXXXXXX",
    "title": "Brief summary",
    "description": "Detailed explanation",
    "steps": "Steps to reproduce",
    "priority": "critical | high | medium | low",
    "status": "open | in-progress | fixed",
    "files": ["app/(tabs)/index.tsx"],
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
]
```

### Claude Code Bug Workflow

When asked to work through bugs:

1. **Read** `bugs.json` to get the current bug list
2. **Filter** for bugs with `status: "open"` or `status: "in-progress"`
3. **Sort** by priority: critical → high → medium → low
4. For each bug:
   - Read the affected files listed in `files[]`
   - Investigate the root cause based on `description` and `steps`
   - Implement the fix following the design system rules above
   - Test that the fix works
   - Update the bug entry in `bugs.json`: set `status: "fixed"`, update `updatedAt`, and optionally add a `"resolution"` field describing what was done
5. **Commit** fixes with messages referencing the bug ID, e.g. `fix(BUG-ABC123): resolve navigation crash on scan screen`

### Bug Priority Definitions

- **Critical**: App crashes, data loss, auth failures — fix immediately
- **High**: Major feature broken, significant UX regression — fix same session
- **Medium**: Minor feature issue, visual bug — fix when convenient
- **Low**: Enhancement, polish, nice-to-have — fix if time permits
