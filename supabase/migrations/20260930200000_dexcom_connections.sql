-- ============================================================
-- BiteInsight — Dexcom connection (OAuth 2.0)
--
-- Tokens are server-only. Both tables have RLS switched on and no
-- policies, so only the service role (edge functions) can read or
-- write them. The app learns whether a user is connected through
-- dexcom_connection_status(), which never returns a token.
--
-- Flow (see supabase/functions/dexcom-*):
--   1. dexcom-oauth-start     — signed-in user → one-time state row → Dexcom login URL
--   2. Dexcom login page      → redirects to dexcom-oauth-callback?code&state
--   3. dexcom-oauth-callback  — swaps the code for tokens, stores them,
--                               sends the user back into the app
--   4. dexcom-egvs            — reads glucose, refreshing tokens as needed
--   5. dexcom-disconnect      — forgets the tokens
-- ============================================================

-- ── dexcom_connections ─────────────────────────────────────
create table if not exists public.dexcom_connections (
  user_id           uuid primary key references public.profiles(id) on delete cascade,

  -- 'sandbox' while in development; 'production' once Dexcom grants access.
  environment       text not null check (environment in ('sandbox', 'production')),
  -- Dexcom API host the user's account lives on (US / EU / JP / sandbox).
  -- Tokens only work against the host that issued them.
  api_base          text not null,

  access_token      text not null,
  -- Single use: every refresh returns a new one, which must replace this.
  refresh_token     text not null,
  access_expires_at timestamptz not null,

  connected_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  last_synced_at    timestamptz
);

drop trigger if exists dexcom_connections_updated_at on public.dexcom_connections;
create trigger dexcom_connections_updated_at
  before update on public.dexcom_connections
  for each row execute function public.handle_meal_plan_entry_updated();

alter table public.dexcom_connections enable row level security;
-- No policies on purpose: service role only.

-- ── dexcom_oauth_states ────────────────────────────────────
-- One row per login attempt. Ties Dexcom's callback back to the user who
-- started it (the callback arrives from a browser with no Supabase
-- session) and guards against forged callbacks. Used once, then deleted.
create table if not exists public.dexcom_oauth_states (
  state        text primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  environment  text not null check (environment in ('sandbox', 'production')),
  api_base     text not null,
  -- Where to send the user after the callback (validated by the edge
  -- function before it's stored).
  return_url   text not null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '10 minutes')
);

create index if not exists dexcom_oauth_states_user_idx
  on public.dexcom_oauth_states (user_id);

alter table public.dexcom_oauth_states enable row level security;
-- No policies on purpose: service role only.

-- ── Status for the app ─────────────────────────────────────
create or replace function public.dexcom_connection_status()
returns table (
  connected      boolean,
  environment    text,
  connected_at   timestamptz,
  last_synced_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    true,
    c.environment,
    c.connected_at,
    c.last_synced_at
  from public.dexcom_connections c
  where c.user_id = auth.uid()
  union all
  select false, null, null, null
  where not exists (
    select 1 from public.dexcom_connections c where c.user_id = auth.uid()
  );
$$;

revoke all on function public.dexcom_connection_status() from public;
grant execute on function public.dexcom_connection_status() to authenticated;

comment on table public.dexcom_connections is
  'Dexcom OAuth tokens per user. Service role only — the app reads status via dexcom_connection_status().';
comment on table public.dexcom_oauth_states is
  'Short-lived OAuth state rows linking a Dexcom callback to the user who started the login. Service role only.';
