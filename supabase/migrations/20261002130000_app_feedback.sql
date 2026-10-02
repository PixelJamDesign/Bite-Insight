-- In-app feedback: answers from the review "Not really" questionnaire and
-- the free-trial decline questionnaire (lib/feedback.ts).
--
-- Users can add their own answers but never read anyone's (no select
-- policy). Read them in the dashboard / SQL editor as the owner.

create table if not exists public.app_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null default auth.uid(),
  source      text not null check (source in ('review', 'trial_decline')),
  reasons     text[] not null default '{}',
  comment     text check (comment is null or char_length(comment) <= 500),
  app_version text,
  platform    text check (platform is null or platform in ('ios', 'android', 'web')),
  created_at  timestamptz not null default now()
);

create index if not exists app_feedback_source_created_idx
  on public.app_feedback (source, created_at desc);

alter table public.app_feedback enable row level security;

drop policy if exists "Users add their own feedback" on public.app_feedback;
create policy "Users add their own feedback"
  on public.app_feedback
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Tally: which reasons come up most, per questionnaire.
create or replace view public.app_feedback_reason_counts
with (security_invoker = true) as
select source, reason, count(*) as answers
from public.app_feedback, unnest(reasons) as reason
group by source, reason
order by source, answers desc;

revoke all on public.app_feedback_reason_counts from anon, authenticated;
