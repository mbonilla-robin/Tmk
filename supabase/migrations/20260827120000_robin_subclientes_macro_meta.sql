-- Meta de subcliente-macro: prioridad (se propaga a entregables) y link
alter table public.robin_subclientes
  add column if not exists prioridad text not null default 'Media',
  add column if not exists link text not null default '';

update public.robin_subclientes
set prioridad = 'Media'
where prioridad is null or trim(prioridad) = '';

update public.robin_subclientes
set link = ''
where link is null;

drop policy if exists robin_subclientes_update on public.robin_subclientes;
create policy robin_subclientes_update on public.robin_subclientes
  for update to anon, authenticated
  using (true)
  with check (
    marca is not null
    and length(trim(marca)) > 0
    and nombre is not null
    and length(trim(nombre)) > 0
  );

grant update on public.robin_subclientes to anon, authenticated;
