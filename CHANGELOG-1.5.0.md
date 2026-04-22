# Bite Insight 1.5.0 — Changelog

Changes shipping on `main` since 1.0.2.

Grouped to match the card pattern used in `app/whats-new.tsx` — each card
below can drop straight into the `CARDS` array the next time that screen
needs an update.

---

## Card 1 — New Feature!
### Your recipe book

Build your own recipes from the foods you scan. Add ingredients by
scan, search or from your history, adjust servings, and watch live
nutrition and an estimated Nutri-score update as you go. A Process
section lets you walk through the method step-by-step. Edit mode
makes it easy to tweak quantities, reorder ingredients, or clear a
few out in one go.

---

## Card 2 — New Feature!
### Dashboard profile refresh

Your dashboard greeting has had a proper tidy-up. Your photo now has a
camera shortcut for changing it on the spot, tapping your image takes you
to edit profile, and Plus members get a clear badge next to their name.
The dietary tag row also stays tidy when you've got lots of selections,
collapsing extras into a neat "+N" pill.

---

## Card 3 — New Feature!
### Halal dietary preference

We've added Halal as a dietary preference. When it's turned on we
automatically recognise Halal-certified products and flag ingredients
that wouldn't be permitted, so you can shop with confidence.

---

## Card 4 — Improvement
### Accurate subscription pricing

The price shown inside the app now pulls directly from the store, so
what you see always matches what Apple or Google actually charge. If
Apple runs a regional promotion, you'll see it here too.

---

## Card 5 — Fix
### Reliable Plus status & smoother date picker

Two fixes rolled into one. Your Plus status no longer briefly resets
on app launch in edge cases, and the date-of-birth picker now behaves
properly on both iOS and Android — no more invisible wheels and no
more getting stuck tapping Confirm.

---

# Suggested structure for `whats-new.tsx` update

Replace the `CARDS` array in `app/whats-new.tsx` with the following.
Icons pull from the existing icon pool — add a 5th if needed.

```ts
const CARDS: CardData[] = [
  {
    badge: 'New feature!',
    title: 'Your recipe book',
    description:
      "Build your own recipes from the foods you scan. Add ingredients by scan, search or from your history, adjust servings, and watch live nutrition and an estimated Nutri-score update as you go. A Process section lets you walk through the method step-by-step.",
  },
  {
    badge: 'New feature!',
    title: 'Dashboard profile refresh',
    description:
      "Your dashboard greeting's had a proper tidy-up. Your photo now has a camera shortcut for changing it on the spot, tapping your image takes you to edit profile, and Plus members get a clear badge next to their name.",
  },
  {
    badge: 'New feature!',
    title: 'Halal dietary preference',
    description:
      "We've added Halal as a dietary preference. When it's turned on we automatically recognise Halal-certified products and flag ingredients that wouldn't be permitted, so you can shop with confidence.",
  },
  {
    badge: 'Improvement',
    title: 'Accurate subscription pricing',
    description:
      "The price shown inside the app now pulls directly from the store, so what you see always matches what Apple or Google actually charge.",
  },
  {
    badge: 'Fix',
    title: 'Reliable Plus status & smoother date picker',
    description:
      "Your Plus status no longer briefly resets on app launch, and the date-of-birth picker now behaves properly on both iOS and Android.",
  },
];
```

---

# Technical notes (internal — not for the user)

## Included in 1.5.0 (on `main`)

- **`7c99307` fix**: Prevent RevenueCat listener from resetting `is_plus` to `false`
- **`72e6643` feat**: Dynamically load subscription price from RevenueCat
- **`00de730` feat**: Halal dietary preference with OFF certification detection
- **`bee6841` feat**: VIP lifetime access system (internal only — not user-facing)
- **`8c2f47e` chore**: Bump version to 1.5.0
- **`95262f2` merge**: Dashboard intro redesign (Plus chip, camera badge, tappable avatar, tag overflow, fullscreen avatar viewer, shared avatar picker)
- **`f12b422` fix**: Resolve DOB picker Android re-open loop and iOS invisible wheels
- **recipe-builder merge**: Recipes tab + full recipe builder (hero cover, servings stepper, live nutrition, ingredients view/edit modes, method steps)

## Parked feature branches (NOT in 1.5.0)

These are pushed but unmerged. When any of these merge to `main`, the
changelog above should be expanded.

- `feature/gamification` — streaks, points, referrals
- `feature/scanner-home-market` — US launch, region gating (targeting 1.6.0)
