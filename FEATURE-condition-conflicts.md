# FEATURE — Profile conflict review (expanded)

**Status:** Phase 1 ready to implement; Phase 2 designed
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

## Phase 2 — "Which leads?" resolution (designed, not yet built)
For each caution conflict on a nutrient (e.g. salt for CF + hypertension):
1. Offer the user a choice, framed as a provider decision: follow Condition A,
   follow Condition B, or "show me both / don't pick" (default).
2. Persist the choice (new `profiles.conflict_priorities` jsonb, keyed by
   conflict id → chosen condition key).
3. Apply it:
   - **Nutrient watchlist** — keep only the chosen condition's limit/boost for
     the conflicting nutrient; if unset, leave that nutrient off the watchlist.
   - **Scan flagging** — for the conflicting nutrient/ingredient, follow the
     chosen condition; if unset, show *both* perspectives ("high salt — in line
     with CF, above your hypertension target") rather than a single verdict.
4. Re-surface the caution if a new conflicting condition is later added.

## Files
**Phase 1:**
- `lib/profileConflicts.ts` — `cautions[]` + `'caution'` tier + new detections
- `components/ConflictReviewStep.tsx` — render cautions (non-blocking)
- `app/onboarding.tsx`, `app/edit-profile.tsx` — pass cautions through; show the
  step when cautions exist; keep save blocked only on hard conflicts

**Phase 2:**
- `profiles.conflict_priorities` (migration), the "which leads?" UI, and the
  watchlist + scan-flagging resolution in `conditionNutrientMap` consumers and
  `scan-result.tsx`.

## Copy
Plain and human (per the standing voice rule). No alarm, no jargon dumps —
"these two pull in opposite directions on salt; worth a word with your doctor."
