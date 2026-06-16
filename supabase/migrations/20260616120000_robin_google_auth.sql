-- Usuarios autorizados para acceder a ROBIN (además del dominio corporativo)
create table if not exists public.robin_allowed_users (
  username text primary key,
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists robin_allowed_users_email_idx
  on public.robin_allowed_users (email);

alter table public.robin_allowed_users enable row level security;

drop policy if exists robin_allowed_select on public.robin_allowed_users;
drop policy if exists robin_allowed_insert on public.robin_allowed_users;
drop policy if exists robin_allowed_delete on public.robin_allowed_users;

-- Lectura para usuarios autenticados con correo corporativo
create policy robin_allowed_select on public.robin_allowed_users
  for select to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) like '%@robin-agency.com'
  );

-- Solo administradores corporativos pueden autorizar o revocar acceso
create policy robin_allowed_insert on public.robin_allowed_users
  for insert to authenticated
  with check (
    lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'fcolmenares@robin-agency.com'
    )
  );

create policy robin_allowed_delete on public.robin_allowed_users
  for delete to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'fcolmenares@robin-agency.com'
    )
  );

grant select, insert, delete on public.robin_allowed_users to authenticated;

-- Colaboradores iniciales del equipo
insert into public.robin_allowed_users (username, email) values
  ('fcolmenares', 'fcolmenares@robin-agency.com'),
  ('ralvarez', 'ralvarez@robin-agency.com'),
  ('dsalavarria', 'dsalavarria@robin-agency.com'),
  ('mbonilla', 'mbonilla@robin-agency.com'),
  ('gnebrus', 'gnebrus@robin-agency.com'),
  ('sgiucastro', 'sgiucastro@robin-agency.com')
on conflict (username) do nothing;

-- Preferencias: restringir escritura al propio usuario autenticado
drop policy if exists robin_settings_insert on public.robin_user_settings;
drop policy if exists robin_settings_update on public.robin_user_settings;

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

-- Solo el propio usuario puede leer sus preferencias
drop policy if exists robin_settings_select on public.robin_user_settings;

create policy robin_settings_select on public.robin_user_settings
  for select to authenticated
  using (
    lower(username) = lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
  );
