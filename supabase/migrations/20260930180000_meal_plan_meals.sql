-- ============================================================
-- BiteInsight — Meal plan: meals with a time
--
-- The first planner pinned every item to one of four fixed slots
-- (breakfast / lunch / snack / dinner). The day view is now a
-- timeline, so a meal is its own record with a time, and the
-- existing meal_plan_entries rows become the items inside it.
--
-- Rows planned under the old slots are carried over into meals at a
-- default time for their slot (see the backfill below).
-- ============================================================

-- ── meals ──────────────────────────────────────────────────
create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,

  plan_date   date not null,          -- the user's local calendar day
  meal_time   time not null,          -- local wall-clock time, no zone
  name        text not null,          -- "Breakfast", "Post-gym snack", ...

  -- Set when the user taps "Eating now". Null = still just planned.
  -- The future glucose layer keys off this.
  eaten_at    timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists meals_user_date_idx
  on public.meals (user_id, plan_date);

drop trigger if exists meals_updated_at on public.meals;
create trigger meals_updated_at
  before update on public.meals
  for each row execute function public.handle_meal_plan_entry_updated();

alter table public.meals enable row level security;

drop policy if exists "Users can view own meals" on public.meals;
create policy "Users can view own meals"
  on public.meals for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own meals" on public.meals;
create policy "Users can insert own meals"
  on public.meals for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own meals" on public.meals;
create policy "Users can update own meals"
  on public.meals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own meals" on public.meals;
create policy "Users can delete own meals"
  on public.meals for delete
  using (auth.uid() = user_id);

-- ── meal_plan_entries become items of a meal ───────────────
alter table public.meal_plan_entries
  add column if not exists meal_id uuid
    references public.meals(id) on delete cascade;

-- Carry over anything planned under the old slots: one meal per
-- user + day + slot, at a sensible default time for that slot.
insert into public.meals (user_id, plan_date, meal_time, name, eaten_at)
select
  e.user_id,
  e.plan_date,
  case e.slot
    when 'breakfast' then time '08:00'
    when 'lunch'     then time '12:30'
    when 'snack'     then time '15:30'
    else                  time '18:30'
  end,
  initcap(e.slot),
  max(e.eaten_at)
from public.meal_plan_entries e
where e.meal_id is null
group by e.user_id, e.plan_date, e.slot;

update public.meal_plan_entries e
set meal_id = m.id
from public.meals m
where e.meal_id is null
  and m.user_id = e.user_id
  and m.plan_date = e.plan_date
  and m.name = initcap(e.slot);

alter table public.meal_plan_entries
  alter column meal_id set not null;

create index if not exists meal_plan_entries_meal_id_idx
  on public.meal_plan_entries (meal_id);

-- The fixed slot is no longer used. Kept nullable rather than dropped
-- so the column can be removed in a later clean-up migration.
alter table public.meal_plan_entries
  alter column slot drop not null;

-- Realtime so the timeline refreshes when a meal is added from
-- another screen or another device.
do $$
begin
  alter publication supabase_realtime add table public.meals;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

comment on table public.meals is
  'Meal planner: one row per planned meal (date + time + name). Its items live in meal_plan_entries.meal_id. eaten_at is the "eating now" log.';
comment on column public.meal_plan_entries.eaten_at is
  'Unused since meals were introduced — see meals.eaten_at.';
