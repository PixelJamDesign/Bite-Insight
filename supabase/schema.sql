-- ============================================================
-- BiteInsight — Supabase Database Schema
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard → your project → SQL Editor
-- ============================================================

-- ── Enable UUID extension ──────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── profiles ──────────────────────────────────────────────
-- One row per user, linked to auth.users
create table if not exists public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  full_name       text,
  avatar_url      text,
  dietary_preferences text[] default '{}',  -- e.g. ['diabetic', 'keto']
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

-- Auto-create profile row on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── check_email_exists ───────────────────────────────────
-- Used by the login screen to detect unregistered emails and
-- nudge the user into the sign-up flow before they waste time
-- entering a password.  Callable with the anon key.
create or replace function public.check_email_exists(lookup_email text)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from auth.users where email = lower(lookup_email)
  );
$$;

-- ── ingredients ───────────────────────────────────────────
create table if not exists public.ingredients (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz default now() not null
);
-- Add columns idempotently so re-running this script on an existing DB is safe
alter table public.ingredients add column if not exists description text;
alter table public.ingredients add column if not exists image_url text;
alter table public.ingredients add column if not exists is_flagged boolean default false;
alter table public.ingredients add column if not exists flag_reason text;
alter table public.ingredients add column if not exists dietary_tags text[] default '{}';

-- ── profiles — billing columns ─────────────────────────────
alter table public.profiles add column if not exists is_plus boolean default false not null;
-- stripe_customer_id links the Supabase user to a Stripe customer
alter table public.profiles add column if not exists stripe_customer_id text;

-- ── profiles — ingredient preferences ──────────────────────
alter table public.profiles add column if not exists liked_ingredients uuid[] default '{}';
alter table public.profiles add column if not exists disliked_ingredients uuid[] default '{}';
alter table public.profiles add column if not exists flagged_ingredients uuid[] default '{}';

-- ── scans ─────────────────────────────────────────────────
create table if not exists public.scans (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  barcode      text not null,
  product_name text not null,
  brand        text,
  image_url    text,
  ingredients  jsonb default '[]',
  flagged_count int default 0,
  scanned_at   timestamptz default now() not null
);

-- Add nutriscore_grade idempotently (column added after initial schema)
alter table public.scans add column if not exists nutriscore_grade text;

-- Index for fast per-user scan lookups
create index if not exists scans_user_id_idx on public.scans(user_id);
create index if not exists scans_barcode_idx on public.scans(barcode);

-- ── daily_insights ─────────────────────────────────────────
create table if not exists public.daily_insights (
  id           uuid primary key default uuid_generate_v4(),
  content      text not null,
  suitable_for text[] default '{}',  -- dietary tags this insight is relevant for
  created_at   timestamptz default now() not null
);

-- ── Row Level Security ─────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.scans enable row level security;
alter table public.ingredients enable row level security;
alter table public.daily_insights enable row level security;

-- profiles: users can only read/update their own row
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Allows scanner.tsx to upsert (INSERT) a profile row if the trigger hasn't
-- fired yet (e.g. slow trigger on signup or profile manually deleted).
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- scans: users can only CRUD their own scans
create policy "Users can view own scans"
  on public.scans for select using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.scans for insert with check (auth.uid() = user_id);

create policy "Users can delete own scans"
  on public.scans for delete using (auth.uid() = user_id);

-- ingredients: public read
create policy "Ingredients are public"
  on public.ingredients for select using (true);

-- daily_insights: public read
create policy "Daily insights are public"
  on public.daily_insights for select using (true);

-- ── Seed: sample daily insight ─────────────────────────────
insert into public.daily_insights (content, suitable_for) values
  ('Try using mashed bananas or applesauce as an egg replacement in baked goods for added moisture and sweetness!', ARRAY['vegan', 'diabetic']),
  ('Swap white rice for cauliflower rice to significantly reduce your carb intake while keeping the texture you love.', ARRAY['keto', 'diabetic']),
  ('Oats are a great source of beta-glucan fibre, which has been shown to help lower cholesterol and improve blood sugar control.', ARRAY['diabetic', 'vegetarian', 'vegan'])
on conflict do nothing;

-- ── Seed: sample ingredients ───────────────────────────────
insert into public.ingredients (name, description, dietary_tags) values
  ('Eggs', 'A great source of protein and essential nutrients like vitamin D and choline.', ARRAY['vegetarian', 'pescatarian']),
  ('Tomatoes', 'Rich in lycopene, vitamin C and potassium. Versatile and nutritious.', ARRAY['vegan', 'vegetarian', 'gluten-free', 'diabetic', 'keto']),
  ('Steak', 'A high-quality source of complete protein, iron, zinc and B vitamins.', ARRAY['keto', 'gluten-free']),
  ('Penne Pasta', 'A classic carbohydrate source. Look for wholegrain options for more fibre.', ARRAY['vegetarian']),
  ('Avocado', 'Packed with healthy monounsaturated fats, potassium and fibre.', ARRAY['vegan', 'vegetarian', 'keto', 'diabetic', 'gluten-free'])
on conflict do nothing;
