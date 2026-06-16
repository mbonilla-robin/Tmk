-- Preferencias sin OAuth: RLS por username (la app solo escribe su propia fila)

drop policy if exists robin_settings_select on public.robin_user_settings;
drop policy if exists robin_settings_insert on public.robin_user_settings;
drop policy if exists robin_settings_update on public.robin_user_settings;

create policy robin_settings_select on public.robin_user_settings
  for select to anon, authenticated
  using (true);

create policy robin_settings_insert on public.robin_user_settings
  for insert to anon, authenticated
  with check (username is not null and length(trim(username)) > 0);

create policy robin_settings_update on public.robin_user_settings
  for update to anon, authenticated
  using (true)
  with check (username is not null and length(trim(username)) > 0);

grant select, insert, update on public.robin_user_settings to anon, authenticated;
