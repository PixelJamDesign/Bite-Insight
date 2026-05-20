# Bite Insight — Changelog

Version history from initial launch (v1.0.0) to current.

---

## v1.6.2 — Matcher rewrite, false-positive fixes, trial fixes, upsell redesign

_Released May 19 2026._

Quality release. No What's New screen — shipped stealth.

### Taxonomy-driven ingredient matcher

- Pulled the Open Food Facts ingredient taxonomy, pruned to parent links (216 KB raw / 57 KB gzipped) and bundled it in the app
- New taxonomy walker — every ingredient ID's parent chain is checked against the condition's flagged ancestors
- 40 conditions and dietary preferences migrated to use taxonomy ancestors instead of keyword guessing
- ~290 override entries for OFF taxonomy gaps (maltodextrin, MSG, E150 family, trans fats, etc.)
- Validated against 12 real products × 10 random conditions: 146 flags raised, 100% present in actual ingredient text

### The Linda McCartney sugar false-positive

- Mozzarella burger no longer flags "Sugar" — caramel colour (E150) correctly stays out of the sugar category via taxonomy walk
- Removed bare "caramel" from sugar keyword lists; added deny lists for the E150 family
- Dropped malt extract / malt syrup / barley malt syrup from sugar derivatives — too aggressive for savoury products
- Removed bare "flour" from coeliac (was false-flagging rice / corn / almond / coconut flour)

### Flag transparency

- User-flagged callouts now show which ingredient triggered the match: "Sugar — Found in: Dextrose"
- Debug menu's Flag inspector — type any OFF ID, see its ancestor chain and which conditions would flag it

### Trial → success navigation fix

- `purchasePlus()` now returns a boolean
- Trial sheet awaits the result directly and routes to `/upgrade-success` on success
- Falls back through `entitlements.all` if `entitlements.active` lags
- Sheet no longer sits on screen after a successful purchase

### Recipe impact sheet

- Multiple flagged ingredients now combine into one orange panel with internal blocks instead of duplicating the panel header
- Headline pluralised when more than one matches
- Spacing inside the panel tightened up

### Upsell panel redesign

- Dashboard's small "Upgrade today" card replaced with a bigger feature-cards panel matching Figma 5149:16911
- Bite Insight+ logo + trial-aware headline + carousel of four feature cards (family profiles / flag ingredients / share recipes / global barcode scanning) + CTA + "Cancel anytime"
- Carousel cross-fades between cards every 3.2 s, loops infinitely
- Two versions: trial pitch (£0.00 for 7 days, primary for eligible users) and price pitch (£3.99/month, fallback for returning users who've used the trial)
- CTA copy kept on one line with auto-shrink fallback for longer locales

### Debug menu additions

- Force non-Plus toggle (preview free-user UI while signed in as Plus)
- Force trial-eligible toggle (preview trial copy in the sim where RC isn't configured)
- Reset trial status (Supabase) — clears trial timestamps and `is_plus` server-side, also flips both overrides on so the trial UpsellPanel shows immediately
- Flag inspector (described above)

### Other fixes

- Duplicate React key warning on scan result lists (ingredients with the same OFF ID like onion + onion powder)

---

## v1.6.1 — Regions, trial system, push, analytics, debug menu

_Released May 12 2026._

Largest release since launch.

### Trial system

- 7-day free trial via RevenueCat intro offer
- Standalone trial upsell sheet with family-hero illustration
- Trial trigger logic: 48-hour grace, 7-day cooldown, max 3 lifetime shows, 50/50 coin flip
- Trial sheet pixel-perfect against Figma (CTA pinned to sticky footer, trial-price display fixed)
- Hero shrunk progressively to fit larger body copy
- Several copy syncs to match latest Figma

### Day-6 trial reminder

- Reminder sheet with two-card timeline
- Push notification system via Expo Push API
- Daily cron-triggered Supabase edge function (`send-trial-reminders`)
- JWT-claims-based auth in the edge function
- iOS remote-notification background mode added

### Update toast

- Prompts out-of-date clients to grab the latest build
- Dashboard-gated so it doesn't fight with other sheets
- Fixed: opens the right store (App Store vs Play) when accepted

### India + Australia support

- Added as supported regions
- Offline databases built and shipped for both
- Region picker shows visible regions per manifest

### Offline DB UI redesign

- Single-row region cards matching Figma
- Flag aligned with title, not text-column centre
- Figma-exact download icon
- Footer (version + report problem) hidden on database screen

### PostHog analytics — Stage A

- Auto-screen tracking
- Identify on session with email, home country, Plus status, signup date
- Wired to EU host

### Debug menu (hidden)

- 3-second long-press on the version footer triggers it
- Available in all builds including TestFlight and App Store
- Sheet triggers: What's New, Trial sheet, Day-6 reminder, Update toast, paid Upsell, My Plan
- Resets: trial cooldown, What's New seen, nuke AsyncStorage
- State inspection (in-memory + AsyncStorage)

### Family + scan polish

- Family-member ingredient prefs UI now matches user view
- Equal-width "Important For You" panels on scan
- False-positive sugar flag fix (precursor to the v1.6.2 rewrite)
- Flagged ingredient list visibility fix

---

## v1.6.0 — Cancer + Cystic Fibrosis conditions

_Released May 2 2026._

- New health conditions: Cancer (with colorectal + stomach subtypes) and Cystic Fibrosis (with standard + CFRD + modulator subtypes)
- Recipe scanner OFF fallback — when local lookup misses, fetches from Open Food Facts
- v1.6.0 What's New screen — single "New Conditions" card

---

## v1.5.2 — Cold-launch routing fixes

_Released May 1 2026._

- Root index redirect to fix cold-launch "Page Not Found"
- Renamed `(tabs)/index` → `dashboard`; What's New now shows before dashboard
- Explicit replace to `/(tabs)` after disclaimer
- Dropped invalid trailing slash on `/(tabs)/` route
- Persist `home_country_code` via auth metadata + DB trigger

---

## v1.5.1 — Recipes community, sharing, deep links

_Released Apr 29 2026._

The big "social recipes" release.

### Recipes community

- Community feed of recipes from other Bite Insight+ members
- Author avatars on cards with proper shadow + ring rendering
- Save-from-source, like from the feed pill, like pill tappable on detail screen
- Two-column feed at ≥640 px wide
- Auto-derived dietary tags on cards and detail screens
- Exclude your own recipes from the community feed
- Editable recipe quantity field
- Wheel-picker bottom sheet for prep / cook time
- Tap an ingredient in a recipe to open its scan result
- Scan-from-builder returns to the builder, not Home
- "This recipe contains N ingredients" subline

### Sharing + deep links

- Universal links wired to `biteinsight.app`
- AASA + assetlinks hosted at `biteinsight.app/.well-known`
- OG-tagged web fallback for `/recipes/:id`
- Rich preview when sharing recipes — image + deep link, restored after auth
- Redesigned recipe preview page to match new Figma layout
- "Open Bite Insight" CTA works on every surface
- Fixed multiple share-flow issues (cross-platform payload, App Store bouncing, duplicate tagline, hang)

### Geo phase 1 + 2

- Capture home country at signup via IP geo
- Backfill existing profiles to 'gb'
- Region picker driven by `home_country_code`
- Hard-lock free users to home country
- Re-check home country on every scanner / search focus
- Self-healing in `regionContext` when home country is null

### Android polish

- Dropped `expo-translate-text` to clear 16 KB Play Store flag
- Support for 16 KB memory page sizes
- Killed shadow-halo bug on cards during fade transitions
- Fixed three Android-only visual issues

### Build + chores

- Shrunk build size from ~150 MB to ~60 MB
- Unified inline-action icon sizing across all fields (search, clear, edit)

### What's New screen polish

- Bespoke per-card icons from Figma
- Several rounds of copy rewrites to sound more human
- Plus chips on relevant cards
- Final card swapped to "Flagged ingredient accuracy"

---

## v1.5.0 — VIP, Halal, dynamic pricing

_Released Apr 21 2026._

- VIP lifetime access system — separate from Plus, no expiry
- Halal dietary preference with automatic detection of OFF halal certification tags
- Dynamic subscription price loaded from RevenueCat instead of hardcoded
- Fixed RevenueCat listener resetting `is_plus` to false intermittently

---

## v1.0.2 — iOS production fixes

_Released Apr 10 2026._

- Fixed date of birth picker not rendering in iOS production builds (now wrapped in a Modal)
- Android safe-area insets for gesture nav bar
- Switched to `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` variables in Info.plist
- Added `.easignore` to shrink EAS build archive size

---

## v1.0.1 — Polish, search performance, marketing prefs

_Released Apr 9 2026._

- What's New screen — first-launch update sheet
- Marketing preferences screen with custom toggle component matching the Figma design
- Date of birth picker replaces freeform age input
- Search performance overhaul — switched to Search-a-Licious API, parallel variant queries, streaming results, shorter debounce
- Clinical accuracy pass — fixed unit bugs across micronutrient watchlist, corrected rating labels, made "moderate" rating direction-aware (orange when direction matters)
- Nutrient watchlist now shows per-serving values converted from grams
- Camera permission copy updated for App Store compliance
- Added Terms of Use and Privacy Policy links to the upsell sheet
- Tour video alignment + footer button alignment polished

---

## v1.0.0 — Initial launch

_Released Feb 26 2026._

First public release. Core features at launch:

- Barcode scanning with Open Food Facts product lookup
- User accounts via Supabase (sign-up, sign-in, password reset)
- Dietary preferences and health condition profile setup
- Scan result screen with nutrition breakdown, ingredient list, and Nutri-Score
- Scan history
- Recipes tab (browse + save)
- Web search fallback for barcodes (camera not supported on web)
- Basic dashboard with daily insights and weekly stats
