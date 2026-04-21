# Bite Insight 1.5.0 — Changelog

Changes shipping on `main` since 1.0.2.

Grouped to match the card pattern used in `app/whats-new.tsx` — each card
below can drop straight into the `CARDS` array the next time that screen
needs an update.

---

## Card 1 — New Feature!
### Dashboard profile refresh

Your dashboard greeting has had a proper tidy-up. Your photo now has a
camera shortcut for changing it on the spot, tapping your image takes you
to edit profile, and Plus members get a clear badge next to their name.
The dietary tag row also stays tidy when you've got lots of selections,
collapsing extras into a neat "+N" pill.

---

## Card 2 — New Feature!
### Halal dietary preference

We've added Halal as a dietary preference. When it's turned on we
automatically recognise Halal-certified products and flag ingredients
that wouldn't be permitted, so you can shop with confidence.

---

## Card 3 — Improvement
### Accurate subscription pricing

The price shown inside the app now pulls directly from the store, so
what you see always matches what Apple or Google actually charge. If
Apple runs a regional promotion, you'll see it here too.

---

## Card 4 — Fix
### Reliable Plus status

Fixed a glitch where your Plus status could briefly reset itself on
app launch in some edge cases. Your subscription now stays locked in
the way it should.

---

# Suggested structure for `whats-new.tsx` update

Replace the `CARDS` array in `app/whats-new.tsx` with the following.
Icons pull from the existing 4-icon pool (`CARD_ICONS` array) in the
order below. If you want different icons, swap the imports at the top
of that file.

```ts
const CARDS: CardData[] = [
  {
    badge: 'New feature!',
    title: 'Dashboard profile refresh',
    description:
      "Your dashboard greeting's had a proper tidy-up. Your photo now has a camera shortcut for changing it on the spot, tapping your image takes you to edit profile, and Plus members get a clear badge next to their name. The dietary tag row also stays tidy when you've got lots of selections.",
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
    title: 'Reliable Plus status',
    description:
      "Fixed a glitch where your Plus status could briefly reset itself on app launch in some edge cases. Your subscription now stays locked in the way it should.",
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

## Parked feature branches (NOT in 1.5.0)

These are pushed but unmerged. When any of these merge to `main`, the
changelog above should be expanded.

- `feature/recipe-builder` — full My Recipes builder
- `feature/gamification` — streaks, points, referrals
- `feature/no-gallbladder` — new health condition
- `feature/low-fiber` — new dietary preference
- `feature/profile-conflicts` — IBS subtype, pregnancy, conflict review
