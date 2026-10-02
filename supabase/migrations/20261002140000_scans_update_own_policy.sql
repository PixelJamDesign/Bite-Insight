-- Re-scanning a product already in your history updates that row's
-- scanned_at (and name/image), which is what moves it under "Today". The
-- scans table had select / insert / delete policies but no update policy,
-- so those updates silently matched zero rows and re-scans never showed.
-- Applied live 2 Oct 2026.

drop policy if exists "Users can update own scans" on public.scans;
create policy "Users can update own scans"
  on public.scans for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
