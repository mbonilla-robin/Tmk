-- Subclientes por marca (ej. La Santé → Rattan Margarita)
create table if not exists public.robin_subclientes (
  marca text not null,
  nombre text not null,
  created_at timestamptz not null default now(),
  primary key (marca, nombre)
);

create index if not exists robin_subclientes_marca_idx
  on public.robin_subclientes (marca asc, nombre asc);

alter table public.robin_subclientes enable row level security;

drop policy if exists robin_subclientes_select on public.robin_subclientes;
drop policy if exists robin_subclientes_insert on public.robin_subclientes;

create policy robin_subclientes_select on public.robin_subclientes
  for select to anon, authenticated
  using (true);

create policy robin_subclientes_insert on public.robin_subclientes
  for insert to anon, authenticated
  with check (
    marca is not null
    and length(trim(marca)) > 0
    and nombre is not null
    and length(trim(nombre)) > 0
  );

grant select, insert on public.robin_subclientes to anon, authenticated;

insert into public.robin_subclientes (marca, nombre) values
  ('La Santé', 'Rattan Margarita')
on conflict (marca, nombre) do nothing;
