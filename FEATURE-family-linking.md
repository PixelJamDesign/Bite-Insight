# FEATURE — Family Account Linking (invite & accept)

Status: **Ready to implement** · Target: v1.8.0

Let a family-plan owner invite a real account holder to link into their
family, so the owner's managed "family member" card becomes a live mirror
of that person's own account (preferences + avatar), with the member's
explicit consent.

Example: Glenn (Bite Insight+) creates managed members Linc, Lacie,
Chanelle. Lacie already has her own account. Glenn invites Lacie; she
accepts; her real preferences and avatar now show in Glenn's family view
and stay in sync. Lacie keeps full control of her own data and can
unlink anytime.

---

## Locked design decisions

| Decision | Choice |
|---|---|
| **Sync model** | Lacie owns her data. Glenn's view is a **live, read-only mirror** of her account. No copy, no two-way edits. |
| **Plus sharing** | **Not shared.** Linking shares the profile only; Lacie's tier is unchanged. |
| **Invite — primary** | Owner enters the member's **account email** (email-bound invite — only that account can accept). |
| **Invite — fallback** | **Copy share link** (WhatsApp/Messenger). Member opens it in the app, which surfaces the accept screen. Token-bound (any signed-in account can accept, with explicit consent). |
| **Consent** | Member must explicitly accept. Clear disclosure of what's shared. Unlink anytime, either side. |

---

## Foundation already in place (v1.5.0)

- `family_profiles.linked_user_id` (uuid → profiles) + `linked_at` — the
  pointer that upgrades a managed row to a linked real account.
- Trigger `forbid_direct_family_link_writes` — blocks all clients except
  **service_role** from setting `linked_user_id`/`linked_at`. The
  accept-invite edge function (service role) is the only thing that can
  link. **Do not weaken this trigger.**

So linking can ONLY happen through the trusted accept flow. Good.

---

## Data model — new table

```sql
create table public.family_invites (
  id              uuid primary key default gen_random_uuid(),
  family_profile_id uuid not null references public.family_profiles(id) on delete cascade,
  inviter_user_id uuid not null references public.profiles(id) on delete cascade,
  -- Email-bound invites set target_email; share-link invites leave it null.
  target_email    text,
  token           text not null unique,            -- unguessable, used in link
  status          text not null default 'pending'  -- pending | accepted | revoked | expired
                    check (status in ('pending','accepted','revoked','expired')),
  expires_at      timestamptz not null default (now() + interval '7 days'),
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  accepted_by_user_id uuid references public.profiles(id) on delete set null
);

create index family_invites_token_idx on public.family_invites (token);
create index family_invites_profile_idx on public.family_invites (family_profile_id);

alter table public.family_invites enable row level security;

-- Owner can see / manage invites they created.
create policy "owner reads own invites" on public.family_invites
  for select using (auth.uid() = inviter_user_id);
create policy "owner creates own invites" on public.family_invites
  for insert with check (auth.uid() = inviter_user_id);
create policy "owner revokes own invites" on public.family_invites
  for update using (auth.uid() = inviter_user_id);
-- Accept happens via service-role edge function (bypasses RLS), so no
-- invitee select/update policy is needed — they never read this table
-- directly; the edge function validates the token and returns a safe
-- summary (inviter name, member name).
```

---

## Edge functions

### 1. `create-family-invite` (verify_jwt; runs as caller)
Input: `{ family_profile_id, method: 'email' | 'link', email? }`
- Verify caller owns `family_profile_id` (it's their family_profiles row).
- Verify the row isn't already linked (`linked_user_id is null`).
- Generate a high-entropy token (`crypto.randomUUID()` x2 or 32 random bytes hex).
- Insert `family_invites` (target_email set only for `method='email'`).
- If `method='email'`: send via Resend (reuse pipeline) — branded email,
  CTA → `https://biteinsight.co.uk/family-invite.html?token=…`.
- Return `{ token, link }` so the client can show the copy-link sheet for
  `method='link'`.

### 2. `accept-family-invite` (service_role)
Input: `{ token }` + the accepting user (from their JWT, passed through).
- Look up invite by token. Reject if not `pending`, expired, or revoked
  (flip to `expired` on read if past `expires_at`).
- If `target_email` is set (email invite): require the accepting account's
  email to match (case-insensitive). Reject otherwise.
- Set `family_profiles.linked_user_id = accepter`, `linked_at = now()`
  (allowed — service role passes the trigger).
- Mark invite `accepted`, stamp `accepted_at` + `accepted_by_user_id`.
- Insert a notification for the inviter ("Lacie joined your family").
- Return a safe summary for the accept screen confirmation.

### 3. `unlink-family-member` (verify_jwt; service_role write)
Either side can unlink:
- Owner: clears `linked_user_id`/`linked_at` on their family row.
- Member: finds rows where `linked_user_id = self` and clears them.
- Reverts Glenn's view to the pre-link managed data (the static columns
  were never overwritten — see live-read below).

---

## Live-read sync (the heart of it)

`linked_user_id` is the switch. In `lib/householdMembers.ts` `fetchHousehold`:

- For each `family_profiles` row where `linked_user_id IS NULL` → use the
  row's own columns (current managed-member behaviour, unchanged).
- For each row where `linked_user_id IS NOT NULL` → **read that member's
  live data from their own `profiles` row + their ingredient prefs**, and
  present it in place of the static columns. Fields mirrored: `avatar_url`,
  `dietary_preferences`, `allergies`, `health_conditions`,
  `liked/disliked/flagged_ingredients`, subtypes, `nutrient_watchlist`.

The static columns are NEVER overwritten on link — they're the fallback
shown again if the member unlinks. While linked, they're ignored in favour
of the live read.

RLS note: the owner needs read access to the linked member's profile +
prefs **for linked members only**. Add a policy / security-definer RPC
(e.g. `get_linked_member_profile(family_profile_id)`) that returns a
linked member's data only to the owner of a family row that points at
them. Do not open blanket cross-account profile reads.

---

## Share-link landing page

`biteinsight.co.uk/family-invite.html?token=…` — same pattern as
`continue.html`:
- Styled with the live site stylesheet (`.hero-cta-panel`).
- "You've been invited to join a family on Bite Insight."
- Opens the app via `biteinsight://family-invite?token=…` (custom scheme,
  reliable from a tapped web link).
- App routes to the in-app accept screen with the token.
- Store fallback if the app isn't installed (then deferred deep link on
  first open — or the simpler v1: tell them to install then re-open the
  link).

App config: add `biteinsight://family-invite` handling to the deep-link
router (`app/_layout.tsx`).

---

## In-app accept screen + notification

- If the invited email matches an existing signed-in account, also drop an
  **inbox notification** ("Glenn invited you to their family") via the
  system we already built — tap routes to the accept screen.
- Accept screen shows: inviter name, the family name, **exactly what will
  be shared** (your preferences + avatar, read-only, you can leave
  anytime), and Accept / Decline.
- On Accept → call `accept-family-invite`.

---

## Security checklist

- Token: 256-bit, single-use, 7-day expiry, unique-indexed.
- Email invites are email-bound (accepter's email must match).
- Share links are token-bound: anyone with the link can accept **as
  themselves**, with explicit consent; owner sees `accepted_by` and can
  unlink. Acceptable per the "shareable link" requirement.
- Linking still only possible via service-role edge function (trigger
  unchanged).
- Owner can revoke a pending invite; either side can unlink after.
- No blanket cross-account reads — linked-member data exposed only through
  a scoped RPC checked against family-row ownership.

---

## Edge cases

- **Member has no account yet** → landing page sends them to the store;
  after install + sign-up, re-opening the link runs the accept. (v1: keep
  the invite valid 7 days; deferred deep linking is a later nicety.)
- **Member already linked elsewhere** → a person can be a linked member in
  multiple owners' families (each owner has their own family row pointing
  at them). No conflict — all are live mirrors.
- **Owner deletes the family row / member deletes their account** → FK
  `on delete set null` / cascade handles cleanup; the other side sees the
  link drop.
- **Re-invite after unlink** → allowed; old invite is `accepted`/expired,
  a fresh one is created.

---

## Copy guidelines (human voice — no AI tells)

- Invite email subject: "Glenn wants to add you on Bite Insight"
- Accept screen: "Glenn invited you to their family. Join, and your
  preferences and photo show up in their family view. You stay in control
  and can leave whenever you like."
- Confirmation: "You're in. Glenn can now see your preferences."
- Keep it short, specific, no em-dashes/tricolons/brochure verbs.

---

## Localisation keys (all 12 locales)

`family.invite.*`, `family.accept.*`, `family.unlink.*`,
`family.linked.badge`, plus the email subject/body. Mirror the existing
`family.*` key structure.

---

## Build sequence

1. `family_invites` table + RLS (migration).
2. `create-family-invite` + `accept-family-invite` + `unlink-family-member`
   edge functions.
3. Live-read in `householdMembers.ts` + scoped RPC for linked-member data.
4. Invite UI (the "How do you want to invite?" sheet: email field /
   copy-link) on the family member card.
5. `family-invite.html` landing page + `biteinsight://family-invite`
   deep-link route + accept screen.
6. Notifications (inbox + email) and the linked-member badge in the family
   list.
7. Unlink controls on both sides.
8. Localisation + copy.
9. Testing checklist below.

---

## Testing checklist

- [ ] Email invite to a matching account → accept → live mirror appears.
- [ ] Email invite where accepter email mismatches → rejected.
- [ ] Share link → second account accepts → linked; owner sees who joined.
- [ ] Expired / revoked token → rejected with a clear message.
- [ ] Linked member edits their prefs → owner's view updates live.
- [ ] Member unlinks → owner reverts to pre-link managed data.
- [ ] Owner unlinks → member no longer shared.
- [ ] Plus is NOT granted to the member by linking.
- [ ] `linked_user_id` cannot be set by a non-service-role client (trigger).
- [ ] No cross-account profile reads outside the scoped RPC.
