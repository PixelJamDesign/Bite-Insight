# FEATURE — Profile conflict review (expanded)

**Status:** Phase 1 built; Phase 2 built; Phase 3 (scan-time dual-perspective) deferred
**Origin:** Review of condition / allergy / dietary combinations that contradict
each other or aren't safe together (e.g. Keto + Pregnancy).

The app already has `lib/profileConflicts.ts` with two tiers:
- **Hard** — must be resolved before save (user picks which to keep). Shown in
  `ConflictReviewStep`, blocks save.
- **Redundancy** — silent auto-tidy (e.g. coeliac implies gluten-free).

This adds more pairs and a **third tier** for the cases where forcing a choice
is wrong.

---

## Guiding principle
The app must not silently guess a clinical trade-off. "Stricter wins" is not
always safe (telling a CF patient to keep salt low can harm them). So when two
*conditions* disagree, we don't resolve it — we flag it, advise the user's
healthcare provider, and default to a neutral stance until they decide.

## Three tiers

### Tier 1 — Hard (block, pick one)
Diet-vs-diet contradictions, and diet-vs-condition cases where dropping the
*diet* is the safe fix. **New pairs to add:**
- `pregnancy` + `weightLoss` — deliberate calorie restriction isn't safe in pregnancy
- `gout` + `highProtein` — high purine load triggers flares
- `gout` + `keto` — meat-heavy + keto raises uric acid
- `ckd` + `keto` — keto is high-protein; CKD needs protein kept down
- `vegan` + `paleo`, `plantBased` + `paleo`, `vegetarian` + `paleo` — paleo is meat/fish-based
- `vegan` + `whole30` — Whole30 requires meat/eggs, bans legumes & grains

(Existing hard pairs stay: cancer+keto, pregnancy+keto, cf+weightLoss,
highProtein+ckd, lowFiber+ibsC, vegan/vegetarian/pescatarian overlaps.)

### Tier 2 — Redundancy (unchanged)
Silent auto-tidy.

### Tier 3 — Caution (NEW: acknowledge, don't block)
Condition-vs-condition contradictions, and diet-vs-condition cases that are
individual/clinical rather than clearly unsafe. Non-blocking. Each card:
- names the tension and the nutrient in play,
- a one-line *why*,
- advises the user's healthcare provider,
- (Phase 2) offers "which should we follow?" + adjusts flags/watchlist.

**Caution pairs:**
- `cf` + `hypertension` — CF needs more salt; hypertension needs less
- `cf` + `heartDisease` — CF needs high fat/calorie; heart disease needs lower
- `cf` + `highCholesterol` — same fat tension
- `diabetes` + `keto` — can help Type 2 but risky with insulin/Type 1; needs supervision
- `pregnancy` + `whole30` — Whole30 isn't designed for pregnancy
- `lowFiber` + `diabetes` / `heartDisease` / `highCholesterol` — fibre helps these; low-fibre is for flares

Caution copy advises the provider and notes we've left the conflicting nutrient
neutral until they decide.

---

## Phase 2 — "Which leads?" resolution (BUILT)
The key realisation: the nutrient watchlist step **already** lets the user set
each nutrient to limit / boost / neutral, and conflicted nutrients already
default to neutral. So we didn't build a separate choice screen — we made the
existing control the resolution point and recorded the outcome.

For each *resolvable* caution (one nutrient the two sides disagree on — salt for
CF vs hypertension / heart disease; fibre for low-fibre vs diabetes / heart
disease / high cholesterol):

1. `Conflict.resolvable` (in `lib/profileConflicts.ts`) carries the `offKey`,
   a plain `nutrientLabel`, and which direction each side wants.
2. The nutrient step (edit-profile / onboarding / add-family-member) shows an
   amber note on that nutrient's row: "your conditions don't agree on salt —
   we've left it neutral, set a direction only if your care team advised one."
   The default stays neutral, so nothing is silently guessed.
3. On save we record the outcome via `deriveConflictPriorities()` into the new
   `profiles.conflict_priorities` / `family_profiles.conflict_priorities` jsonb
   (conflict id → followed selection key, or `'both'` when left neutral).
4. **Scan flagging** is applied automatically: whatever direction the user sets
   (or doesn't) for the nutrient is exactly what `nutrient_watchlist` carries,
   and the scan screen flags from that watchlist. Neutral → the nutrient simply
   isn't flagged either way. No scan-screen changes were needed.
5. Re-surfacing is inherent: cautions are recomputed live from the current
   selection, so adding a new conflicting condition shows the note again.

### Phase 3 — scan-time dual perspective (deferred, optional polish)
The richer "show both perspectives" treatment ("high salt — in line with CF,
above your hypertension target") would re-insert a neutral/disputed nutrient
into the scan as an informational row carrying both verdicts. It's deliberately
deferred: the safe behaviour (leave neutral nutrients unflagged) already holds,
and the change lands in a 2,700-line scan screen that can't be exercised in the
local sim right now. `conflict_priorities` already persists the data this would
need.

## Files
**Phase 1:**
- `lib/profileConflicts.ts` — `cautions[]` + `'caution'` tier + new detections
- `components/ConflictReviewStep.tsx` — render cautions (non-blocking)
- `app/onboarding.tsx`, `app/edit-profile.tsx` — pass cautions through; show the
  step when cautions exist; keep save blocked only on hard conflicts

**Phase 2 (built):**
- `lib/profileConflicts.ts` — `Conflict.resolvable` metadata +
  `deriveConflictPriorities()` / `resolvableCautionForOffKey()` helpers
- `profiles.conflict_priorities` + `family_profiles.conflict_priorities` jsonb
  (migration `add_conflict_priorities`), plus the type fields in `lib/types.ts`
- `app/edit-profile.tsx`, `app/onboarding.tsx`, `app/add-family-member.tsx` —
  amber conflict note on the disputed nutrient row + persist the outcome on save
- Scan flagging needs no change — it already reads `nutrient_watchlist`, which
  the resolution writes through.

## Copy
Plain and human (per the standing voice rule). No alarm, no jargon dumps —
"these two pull in opposite directions on salt; worth a word with your doctor."
