-- Endurecer RLS: preferencias por usuario autenticado; retirar acceso anon abierto

drop policy if exists robin_settings_select on public.robin_user_settings;
drop policy if exists robin_settings_insert on public.robin_user_settings;
drop policy if exists robin_settings_update on public.robin_user_settings;

create policy robin_settings_select on public.robin_user_settings
  for select to authenticated
  using (
    lower(username) = lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
  );

create policy robin_settings_insert on public.robin_user_settings
  for insert to authenticated
  with check (
    lower(username) = lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
  );

create policy robin_settings_update on public.robin_user_settings
  for update to authenticated
  using (
    lower(username) = lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
  )
  with check (
    lower(username) = lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
  );

revoke all on public.robin_user_settings from anon;
grant select, insert, update on public.robin_user_settings to authenticated;

-- Lista de usuarios autorizada ya no se usa (acceso por dominio corporativo)
drop policy if exists robin_allowed_select on public.robin_allowed_users;
drop policy if exists robin_allowed_insert on public.robin_allowed_users;
drop policy if exists robin_allowed_delete on public.robin_allowed_users;

drop table if exists public.robin_allowed_users;
