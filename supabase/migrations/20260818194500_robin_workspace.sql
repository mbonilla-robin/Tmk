-- Widgets, fichas de marca y presencia (reemplazan Google Sheets)

create table if not exists public.robin_widgets (
  id text primary key,
  titulo text not null default '',
  link text not null default '',
  icon text not null default 'link',
  color text not null default 'sky',
  seccion text not null default 'robin',
  marca text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create table if not exists public.robin_marcas (
  marca text primary key,
  cliente_directo text not null default '',
  ejecutivos jsonb not null default '[]'::jsonb,
  disenadores jsonb not null default '[]'::jsonb,
  content_equipo jsonb not null default '[]'::jsonb,
  notas text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create table if not exists public.robin_presencia (
  username text primary key,
  nombre text not null default '',
  last_seen_ms bigint not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists robin_widgets_marca_idx on public.robin_widgets (marca);
create index if not exists robin_presencia_seen_idx on public.robin_presencia (last_seen_ms desc);

create or replace function public.robin_workspace_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists robin_widgets_set_updated_at on public.robin_widgets;
create trigger robin_widgets_set_updated_at
  before update on public.robin_widgets
  for each row execute function public.robin_workspace_touch_updated_at();

drop trigger if exists robin_marcas_set_updated_at on public.robin_marcas;
create trigger robin_marcas_set_updated_at
  before update on public.robin_marcas
  for each row execute function public.robin_workspace_touch_updated_at();

alter table public.robin_widgets enable row level security;
alter table public.robin_marcas enable row level security;
alter table public.robin_presencia enable row level security;

drop policy if exists robin_widgets_select on public.robin_widgets;
drop policy if exists robin_widgets_insert on public.robin_widgets;
drop policy if exists robin_widgets_update on public.robin_widgets;
drop policy if exists robin_widgets_delete on public.robin_widgets;
create policy robin_widgets_select on public.robin_widgets for select to anon, authenticated using (true);
create policy robin_widgets_insert on public.robin_widgets for insert to anon, authenticated with check (id is not null and length(trim(id)) > 0);
create policy robin_widgets_update on public.robin_widgets for update to anon, authenticated using (true) with check (id is not null and length(trim(id)) > 0);
create policy robin_widgets_delete on public.robin_widgets for delete to anon, authenticated using (true);

drop policy if exists robin_marcas_select on public.robin_marcas;
drop policy if exists robin_marcas_insert on public.robin_marcas;
drop policy if exists robin_marcas_update on public.robin_marcas;
drop policy if exists robin_marcas_delete on public.robin_marcas;
create policy robin_marcas_select on public.robin_marcas for select to anon, authenticated using (true);
create policy robin_marcas_insert on public.robin_marcas for insert to anon, authenticated with check (marca is not null and length(trim(marca)) > 0);
create policy robin_marcas_update on public.robin_marcas for update to anon, authenticated using (true) with check (marca is not null and length(trim(marca)) > 0);
create policy robin_marcas_delete on public.robin_marcas for delete to anon, authenticated using (true);

drop policy if exists robin_presencia_select on public.robin_presencia;
drop policy if exists robin_presencia_insert on public.robin_presencia;
drop policy if exists robin_presencia_update on public.robin_presencia;
drop policy if exists robin_presencia_delete on public.robin_presencia;
create policy robin_presencia_select on public.robin_presencia for select to anon, authenticated using (true);
create policy robin_presencia_insert on public.robin_presencia for insert to anon, authenticated with check (username is not null and length(trim(username)) > 0);
create policy robin_presencia_update on public.robin_presencia for update to anon, authenticated using (true) with check (username is not null and length(trim(username)) > 0);
create policy robin_presencia_delete on public.robin_presencia for delete to anon, authenticated using (true);

grant select, insert, update, delete on public.robin_widgets to anon, authenticated;
grant select, insert, update, delete on public.robin_marcas to anon, authenticated;
grant select, insert, update, delete on public.robin_presencia to anon, authenticated;
