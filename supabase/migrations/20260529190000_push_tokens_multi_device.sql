-- push_tokens — one row per device, replacing the single
-- profiles.expo_push_token column so a user can have multiple phones /
-- tablets all reachable at once.
--
-- The old column is left in place for now so existing clients (iOS
-- build 13 etc.) keep working unchanged. A trigger mirrors any write
-- to the legacy column into this table so server-side push code only
-- has to read one source of truth.
--
-- Drop the legacy column in a later migration once every client has
-- shipped the new write path.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android', 'web', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (expo_push_token)
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

-- updated_at maintenance
create or replace function public.push_tokens_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists push_tokens_set_updated_at on public.push_tokens;
create trigger push_tokens_set_updated_at
  before update on public.push_tokens
  for each row execute function public.push_tokens_set_updated_at();

-- RLS — same shape as profiles: users see/manage their own rows,
-- service role (used by edge functions) bypasses RLS.
alter table public.push_tokens enable row level security;

drop policy if exists "Users can view own push tokens" on public.push_tokens;
create policy "Users can view own push tokens"
  on public.push_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own push tokens" on public.push_tokens;
create policy "Users can insert own push tokens"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own push tokens" on public.push_tokens;
create policy "Users can update own push tokens"
  on public.push_tokens for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own push tokens" on public.push_tokens;
create policy "Users can delete own push tokens"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

-- Backfill: copy every existing profiles.expo_push_token into push_tokens
-- so no currently-registered device falls off the audience when the
-- server-side push code starts reading from this table.
insert into public.push_tokens (user_id, expo_push_token, platform)
select id, expo_push_token, 'unknown'
from public.profiles
where expo_push_token is not null
on conflict (expo_push_token) do nothing;

-- Legacy-column mirror trigger: when a client still on the old code
-- path writes profiles.expo_push_token, replicate that write into
-- push_tokens so the server-side push code (which only reads
-- push_tokens) still reaches the device.
create or replace function public.mirror_legacy_push_token()
returns trigger language plpgsql security definer as $$
begin
  if new.expo_push_token is not null
     and new.expo_push_token is distinct from old.expo_push_token then
    insert into public.push_tokens (user_id, expo_push_token, platform, last_seen_at)
    values (new.id, new.expo_push_token, 'unknown', now())
    on conflict (expo_push_token) do update
      set user_id = excluded.user_id,
          last_seen_at = excluded.last_seen_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_mirror_legacy_push_token on public.profiles;
create trigger profiles_mirror_legacy_push_token
  after update of expo_push_token on public.profiles
  for each row execute function public.mirror_legacy_push_token();
