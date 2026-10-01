# FEATURE — Guardian control for children's accounts

Status: **Ready to implement** · Target: v2.1.0

Let a parent manage the safety-critical parts of a linked child's own
account: allergies, health conditions and diets. Builds on Family Account
Linking (`FEATURE-family-linking.md`), which made linked members a live,
read-only mirror of their own account.

Example: Glenn's son Lincoln has his own account, linked into Glenn's
family. Lincoln's account doesn't list his peanut allergy, so scans for
Lincoln don't warn about peanuts. With guardian control, Glenn adds the
allergy to Lincoln's account himself. Lincoln sees the change, can't remove
it, and every scan for Lincoln (his own and Glenn's) now warns about peanuts.

---

## Locked design decisions

| Decision | Choice |
|---|---|
| **Who is a child** | A linked member added as **Son or Daughter** whose account **date of birth is under 16**. No date of birth on the account → the relationship decides. |
| **Age cut-off** | **16** (UK age of digital consent for this kind of data). Control ends automatically on their 16th birthday. |
| **Consent** | Guardian control is asked for in the invite and **accepted by the child** as part of joining. Already-linked children get a separate "manage your allergies" request they accept. Never switched on silently. |
| **What a guardian can edit** | Allergies, health conditions and their subtypes (not pregnancy), diets. Name, photo, likes, dislikes, flagged ingredients and everything else stay the child's. |
| **Allergy lock** | Allergies a guardian adds are **locked for the child**: they can add more but can't remove a guardian's. The guardian can remove them. Conditions and diets are editable by both. |
| **Source of truth** | Unchanged: the child's own `profiles` row. The guardian writes to it through one scoped function; `get_family_members()` keeps mirroring it. |
| **Ending it** | The guardian can switch it off any time. It also ends at 16, or when either side unlinks (see edge cases for unlinking under 16). |

---

## Foundation already in place

- `family_profiles.linked_user_id` / `linked_at` and the
  `forbid_direct_family_link_writes` trigger (only service role can link).
  **Do not weaken this trigger.**
- `family_invites` table + `create-family-invite`, `accept-family-invite`,
  `unlink-family-member` edge functions.
- `family_invite_preview(token)` for the accept screen.
- `get_family_members()` overlays linked members' live account data.
- `profiles.date_of_birth`, `family_profiles.relationship`
  (`son` / `daughter` / …).
- `notifications` table + inbox + push.

---

## Data model — migration

```sql
-- 1. Consent on the link, and on the invite that asks for it.
alter table public.family_profiles
  add column guardian_control boolean not null default false,
  add column guardian_control_at timestamptz;

alter table public.family_invites
  add column kind text not null default 'link'
    check (kind in ('link', 'guardian')),      -- 'guardian' = request for an already-linked child
  add column guardian_control boolean not null default false;  -- asked for in a 'link' invite

-- guardian_control can only be switched ON by the service role (the
-- accept flow). Extend forbid_direct_family_link_writes, or add a sibling
-- trigger, so a client write can set it FALSE (owner switching it off)
-- but never TRUE.

-- 2. Allergies a guardian added, which the child can't remove.
alter table public.profiles
  add column guardian_locked_allergies text[] not null default '{}';
```

### Trigger: protect locked allergies and the child's age

`before update on public.profiles`, for writes made by the account owner
(`auth.uid() = old.id`; the guardian function runs as security definer and
sets a session flag such as `set_config('bite.guardian_write', 'on', true)`
so the trigger can tell the two apart):

- `new.allergies` must contain every item in `old.guardian_locked_allergies`
  → otherwise `raise exception 'That allergy was added by your parent or guardian'`.
- `new.guardian_locked_allergies` must equal `old.guardian_locked_allergies`
  (only the guardian function changes it).
- While any `family_profiles` row has `linked_user_id = old.id and
  guardian_control`, `new.date_of_birth` must equal `old.date_of_birth`, so
  a child can't age themselves out. The guardian can correct it (see below).

### Helper

```sql
-- True while this family row gives its owner guardian control right now.
create or replace function public.guardian_control_active(p_family_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from family_profiles fp
    join profiles child on child.id = fp.linked_user_id
    where fp.id = p_family_profile_id
      and fp.user_id = auth.uid()
      and fp.guardian_control
      and fp.relationship in ('son', 'daughter')
      and (child.date_of_birth is null
           or child.date_of_birth > (current_date - interval '16 years'))
  );
$$;
```

---

## The guardian edit — one scoped function

```sql
create or replace function public.guardian_update_member(
  p_family_profile_id uuid,
  p_health_conditions text[],
  p_allergies text[],
  p_dietary_preferences text[],
  p_ibs_subtype text,
  p_cancer_subtype text,
  p_cf_subtype text,
  p_date_of_birth date default null      -- correction only; null = unchanged
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_child uuid;
  v_old_locked text[];
  v_old_allergies text[];
begin
  if not guardian_control_active(p_family_profile_id) then
    raise exception 'You can''t manage this account';
  end if;

  select linked_user_id into v_child from family_profiles where id = p_family_profile_id;
  select allergies, guardian_locked_allergies into v_old_allergies, v_old_locked
    from profiles where id = v_child;

  perform set_config('bite.guardian_write', 'on', true);

  update profiles set
    health_conditions   = p_health_conditions,
    allergies           = p_allergies,
    dietary_preferences = p_dietary_preferences,
    ibs_subtype         = p_ibs_subtype,
    cancer_subtype      = p_cancer_subtype,
    cf_subtype          = p_cf_subtype,
    date_of_birth       = coalesce(p_date_of_birth, date_of_birth),
    -- Locked = what the guardian keeps on: previously locked items still
    -- present, plus anything the guardian has just added.
    guardian_locked_allergies = array(
      select distinct a from unnest(p_allergies) a
      where a = any(v_old_locked) or not (a = any(coalesce(v_old_allergies, '{}')))
    ),
    updated_at = now()
  where id = v_child;

  -- Tell the child (inbox + push via the existing notifications pipeline).
  insert into notifications (user_id, type, title, body, data)
  select v_child, 'guardian_update',
         split_part(coalesce(nullif(g.full_name, ''), 'Your parent'), ' ', 1) || ' updated your health details',
         'Open your profile to see what changed.',
         jsonb_build_object('type', 'guardian_update', 'family_profile_id', p_family_profile_id)
  from profiles g where g.id = auth.uid();
end;
$$;

grant execute on function public.guardian_update_member to authenticated;
```

No RLS is loosened on `profiles`. The only cross-account write path is this
function, and it re-checks ownership, consent, relationship and age every
call.

Switching off (owner): plain update `guardian_control = false` on their own
family row (allowed by the trigger change above). Clear the child's
`guardian_locked_allergies` in the same step (do it in a small
`end_guardian_control(p_family_profile_id)` security-definer function so it
can touch the child's row).

---

## Edge function changes

### `create-family-invite`
- New input: `guardian_control?: boolean`, and `kind?: 'link' | 'guardian'`.
- `guardian_control` is only accepted when the family row's relationship is
  `son` or `daughter`.
- `kind: 'guardian'`: for a row that's **already linked**. Skip the
  "already linked" rejection, require `guardian_control = false` on the row,
  and send the request to `linked_user_id` (inbox notification
  `type: 'guardian_request'`, no email needed).
- Store `kind` + `guardian_control` on the invite.

### `accept-family-invite`
- `kind: 'link'` with `guardian_control`: link as today, and also set
  `guardian_control = true`, `guardian_control_at = now()` on the row
  (service role passes the trigger).
- `kind: 'guardian'`: require `family_profiles.linked_user_id = accepter`;
  set `guardian_control = true`. Decline leaves it off and tells the owner.
- Owner notification copy covers both ("Lincoln said yes" / "Lincoln said no
  thanks").

### `family_invite_preview(token)`
- Return `kind` and `guardian_control` so the accept screen can explain what
  the guardian will be able to do.

### `unlink-family-member`
- If the caller is the **member** and the row has `guardian_control_active`
  (under 16), refuse: "Ask Glenn to remove you from the family." The owner
  can still unlink. At 16+ either side can unlink as today.
- Unlinking clears `guardian_control` and the child's
  `guardian_locked_allergies`.

---

## App UI

### Owner side
- **Invite sheet** (`add-family-member.tsx` "How do you want to invite?"):
  for Son / Daughter, a `CheckboxCard`: "I'm their parent or guardian" with
  supporting text "You'll be able to manage their allergies and health
  conditions until they turn 16." Passed as `guardian_control`.
- **LinkedMemberOverlay** (tap a linked member in My Family):
  - Under 16, guardian control on → "Manage health and allergies" button →
    the existing family editor (`add-family-member.tsx`) in a guardian mode
    showing only the health, subtype, allergies and dietary steps, saving
    through `guardian_update_member`. The date of birth can be corrected here.
  - Under 16, guardian control off → "Ask to manage their allergies" →
    `create-family-invite` with `kind: 'guardian'`. Shows "Waiting for
    Lincoln" while pending.
  - Guardian control on → "Stop managing" (calls `end_guardian_control`,
    confirms first).
  - 16+ → none of the above; a short line: "Lincoln manages their own
    details now."
- **My Family list**: a small "Managed" tag on rows with guardian control.

### Child side
- **Accept screen** (`app/family-invite.tsx`): when `guardian_control` is
  asked for, add a clear line before Accept: "Glenn will be able to add
  allergies and health conditions to your account until you turn 16. You'll
  get a notification when they do." Same for a `kind: 'guardian'` request.
- **Edit profile** (`edit-profile.tsx`) health, allergies and dietary steps:
  an info `AlertCard`: "Glenn helps manage these." Allergies in
  `guardian_locked_allergies` show a lock and can't be deselected; tapping
  one explains why. The date of birth field is read-only while managed.
- **Notifications**: `guardian_update` opens Edit profile;
  `guardian_request` opens the accept screen.

### Data refresh
- After a guardian save, refresh the household cache
  (`fetchHousehold` / `useMealPlanImpact`) so scans and meal ratings use the
  new allergies straight away, on both accounts.

---

## Security checklist

- [ ] `guardian_control` can only become true through the service-role
      accept flow (trigger), with the child's explicit acceptance.
- [ ] `guardian_update_member` checks owner, linked, consent, relationship
      and age on every call. No other cross-account write path exists.
- [ ] No change to `profiles` RLS.
- [ ] A child can't remove guardian-locked allergies or edit
      `guardian_locked_allergies` / `date_of_birth` while managed (trigger,
      not just UI).
- [ ] Control ends at 16 without any job running (the age check is live).
- [ ] Guardian can't see or change anything outside the listed fields.

---

## Edge cases

- **No date of birth on the child's account** → relationship decides. The
  guardian can set the date of birth from the guardian editor; once set, the
  age rule applies.
- **Child turns 16** → `guardian_control_active` returns false; the editor
  hides; locks stop being enforced (clear `guardian_locked_allergies` the
  next time the guardian or child saves, or in a nightly tidy-up).
- **Two guardians** (both parents link the same child) → each family row
  has its own consent. Locks are shared: either guardian's additions stay
  locked for the child, and either guardian can remove one.
- **Child tries to unlink under 16** → refused with a friendly message; the
  guardian can unlink.
- **Child edits allergies in the same minute as the guardian** → last write
  wins on the array, but locked items can't be lost (trigger).
- **Already-linked children (Lincoln, Lacie today)** → start with guardian
  control off; the owner uses "Ask to manage their allergies".
- **Relationship changed away from Son/Daughter** → control stops being
  active (helper checks relationship).

---

## Copy guidelines (human voice, no AI tells)

- Checkbox: "I'm their parent or guardian" / "You'll be able to manage their
  allergies and health conditions until they turn 16."
- Accept screen: "Glenn will be able to add allergies and health conditions
  to your account until you turn 16. You'll get a notification when they do."
- Request notification: "Glenn wants to help manage your allergies."
- Update notification: "Glenn updated your health details."
- Locked allergy: "Glenn added this one, so only they can remove it."
- Unlink refused: "Ask Glenn to remove you from the family."
- Short sentences, plain words, no em-dash emphasis, no tricolons.

---

## Localisation keys (all 12 locales)

`family.guardian.*` (checkbox, accept line, manage / ask / stop buttons,
waiting, managed tag, 16+ line), `profile.guardian.*` (banner, locked
allergy, read-only date of birth), notification titles/bodies for
`guardian_request` and `guardian_update`. Mirror the existing `family.*`
structure.

---

## Build sequence

1. Migration: columns, trigger changes, `guardian_control_active`,
   `guardian_update_member`, `end_guardian_control`; update
   `family_invite_preview`. (Live database: needs approval.)
2. Edge functions: `create-family-invite`, `accept-family-invite`,
   `unlink-family-member`. (Deploy: needs approval.)
3. Owner UI: invite checkbox, LinkedMemberOverlay actions, guardian editor
   mode, Managed tag.
4. Child UI: accept screen line, Edit profile banner + locked allergies +
   read-only date of birth.
5. Notifications routing for `guardian_request` / `guardian_update`.
6. Household cache refresh after guardian saves.
7. Localisation + copy.
8. Testing checklist below.

---

## Testing checklist

- [ ] Invite a Son with "I'm their parent or guardian" → child accepts →
      `guardian_control` on; Glenn can add an allergy; child gets notified.
- [ ] Scans for the child (from Glenn's switcher and the child's own
      account) warn about the new allergy straight away.
- [ ] Child can add an allergy but can't remove Glenn's (UI and a direct
      API update both blocked).
- [ ] Child can't change their date of birth while managed; Glenn can.
- [ ] "Ask to manage" on an already-linked child → accept turns it on;
      decline leaves it off and tells Glenn.
- [ ] Child with a date of birth 16+ → no guardian controls, update
      function refuses.
- [ ] Relationship Partner / Wife → no guardian option anywhere.
- [ ] "Stop managing" → controls gone, locks cleared.
- [ ] Child under 16 can't unlink; Glenn can. At 16+ either can.
- [ ] Non-owner calling `guardian_update_member` → refused.
- [ ] `guardian_control` can't be set true by a client write.
