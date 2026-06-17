-- Categorías compartidas del workspace (principal + subcategorías en tareas)
create table if not exists public.robin_categorias (
  nombre text primary key,
  color text not null default 'zinc',
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists robin_categorias_orden_idx
  on public.robin_categorias (orden asc, nombre asc);

alter table public.robin_categorias enable row level security;

drop policy if exists robin_categorias_select on public.robin_categorias;
drop policy if exists robin_categorias_insert on public.robin_categorias;

create policy robin_categorias_select on public.robin_categorias
  for select to anon, authenticated
  using (true);

create policy robin_categorias_insert on public.robin_categorias
  for insert to anon, authenticated
  with check (nombre is not null and length(trim(nombre)) > 0);

grant select, insert on public.robin_categorias to anon, authenticated;

insert into public.robin_categorias (nombre, color, orden) values
  ('Propuesta', 'violet', 1),
  ('Presupuesto', 'emerald', 2),
  ('Finanzas', 'sky', 3),
  ('Arte', 'pink', 4),
  ('Diseño', 'indigo', 5),
  ('Contenido', 'orange', 6),
  ('Producción', 'amber', 7),
  ('Revisión', 'zinc', 8)
on conflict (nombre) do nothing;
