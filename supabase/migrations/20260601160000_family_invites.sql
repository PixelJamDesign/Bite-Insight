-- Family account linking — invitations table.
--
-- Pending/accepted invitations to link a real account to a
-- family_profiles row. The actual link (setting
-- family_profiles.linked_user_id) is performed ONLY by the service-role
-- accept-family-invite edge function — guarded by the existing
-- forbid_direct_family_link_writes trigger. This table just tracks the
-- invitation lifecycle.
--
-- Email-bound invites set target_email (only that account may accept).
-- Share-link invites leave target_email null (any signed-in account may
-- accept as themselves, with explicit consent).
create table if not exists public.family_invites (
  id                uuid primary key default gen_random_uuid(),
  family_profile_id uuid not null references public.family_profiles(id) on delete cascade,
  inviter_user_id   uuid not null references public.profiles(id) on delete cascade,
  target_email      text,
  token             text not null unique,
  status            text not null default 'pending'
                      check (status in ('pending','accepted','revoked','expired')),
  expires_at        timestamptz not null default (now() + interval '7 days'),
  created_at        timestamptz not null default now(),
  accepted_at       timestamptz,
  accepted_by_user_id uuid references public.profiles(id) on delete set null
);

create index if not exists family_invites_token_idx on public.family_invites (token);
create index if not exists family_invites_profile_idx on public.family_invites (family_profile_id);
create index if not exists family_invites_inviter_idx on public.family_invites (inviter_user_id);

alter table public.family_invites enable row level security;

drop policy if exists "owner reads own invites" on public.family_invites;
create policy "owner reads own invites" on public.family_invites
  for select using (auth.uid() = inviter_user_id);

drop policy if exists "owner creates own invites" on public.family_invites;
create policy "owner creates own invites" on public.family_invites
  for insert with check (auth.uid() = inviter_user_id);

drop policy if exists "owner updates own invites" on public.family_invites;
create policy "owner updates own invites" on public.family_invites
  for update using (auth.uid() = inviter_user_id);

comment on table public.family_invites is
  'Pending/accepted invitations to link a real account to a family_profiles row. Accept happens via the service-role accept-family-invite edge function (the only thing allowed to set family_profiles.linked_user_id). Email-bound invites set target_email; share-link invites leave it null.';
