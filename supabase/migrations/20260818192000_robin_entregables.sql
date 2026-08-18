-- Entregables TMK (fuente de verdad; deja de usar Google Sheets para tareas)

create table if not exists public.robin_entregables (
  id uuid primary key default gen_random_uuid(),
  id_tarea text not null unique,
  marca text not null,
  info text not null default '',
  categoria text not null default '',
  subcliente text not null default '',
  personas text not null default '',
  detalles text not null default '',
  link text not null default '',
  estado text not null default 'Pendiente',
  prioridad text not null default 'Media',
  deadline text not null default '',
  fecha_inicio text not null default '',
  flujo text not null default '',
  import_key text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create index if not exists robin_entregables_marca_idx
  on public.robin_entregables (marca);

create index if not exists robin_entregables_estado_idx
  on public.robin_entregables (estado);

create index if not exists robin_entregables_subcliente_idx
  on public.robin_entregables (subcliente);

create unique index if not exists robin_entregables_import_key_uidx
  on public.robin_entregables (import_key)
  where import_key <> '';

create or replace function public.robin_entregables_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists robin_entregables_set_updated_at on public.robin_entregables;
create trigger robin_entregables_set_updated_at
  before update on public.robin_entregables
  for each row execute function public.robin_entregables_touch_updated_at();

alter table public.robin_entregables enable row level security;

drop policy if exists robin_entregables_select on public.robin_entregables;
drop policy if exists robin_entregables_insert on public.robin_entregables;
drop policy if exists robin_entregables_update on public.robin_entregables;
drop policy if exists robin_entregables_delete on public.robin_entregables;

create policy robin_entregables_select on public.robin_entregables
  for select to anon, authenticated
  using (true);

create policy robin_entregables_insert on public.robin_entregables
  for insert to anon, authenticated
  with check (
    id_tarea is not null and length(trim(id_tarea)) > 0
    and marca is not null and length(trim(marca)) > 0
  );

create policy robin_entregables_update on public.robin_entregables
  for update to anon, authenticated
  using (true)
  with check (
    id_tarea is not null and length(trim(id_tarea)) > 0
    and marca is not null and length(trim(marca)) > 0
  );

create policy robin_entregables_delete on public.robin_entregables
  for delete to anon, authenticated
  using (true);

grant select, insert, update, delete on public.robin_entregables to anon, authenticated;
