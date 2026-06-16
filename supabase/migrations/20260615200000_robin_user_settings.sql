-- Preferencias y perfil por usuario (sincronización multi-dispositivo)
create table if not exists public.robin_user_settings (
  username text primary key,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists robin_user_settings_updated_at_idx
  on public.robin_user_settings (updated_at desc);

alter table public.robin_user_settings enable row level security;

drop policy if exists robin_settings_select on public.robin_user_settings;
drop policy if exists robin_settings_insert on public.robin_user_settings;
drop policy if exists robin_settings_update on public.robin_user_settings;

create policy robin_settings_select on public.robin_user_settings
  for select to anon, authenticated using (true);

create policy robin_settings_insert on public.robin_user_settings
  for insert to anon, authenticated with check (true);

create policy robin_settings_update on public.robin_user_settings
  for update to anon, authenticated using (true) with check (true);

create or replace function public.robin_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists robin_user_settings_updated_at on public.robin_user_settings;

create trigger robin_user_settings_updated_at
  before update on public.robin_user_settings
  for each row execute function public.robin_touch_updated_at();

grant select, insert, update on public.robin_user_settings to anon, authenticated;
