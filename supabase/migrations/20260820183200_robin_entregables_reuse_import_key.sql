-- Si llega un INSERT con import_key ya usado por otra id_tarea,
-- reutiliza esa id para que el upsert (on_conflict=id_tarea) actualice
-- la fila existente en vez de chocar con robin_entregables_import_key_uidx.

create or replace function public.robin_entregables_reuse_import_key()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  existing_id text;
begin
  if new.import_key is null or btrim(new.import_key) = '' then
    return new;
  end if;

  select e.id_tarea
    into existing_id
  from public.robin_entregables e
  where e.import_key <> ''
    and lower(e.import_key) = lower(btrim(new.import_key))
    and e.id_tarea is distinct from new.id_tarea
  limit 1;

  if existing_id is not null then
    new.id_tarea := existing_id;
    new.import_key := btrim(new.import_key);
  end if;

  return new;
end;
$$;

drop trigger if exists robin_entregables_reuse_import_key on public.robin_entregables;
create trigger robin_entregables_reuse_import_key
  before insert on public.robin_entregables
  for each row
  execute function public.robin_entregables_reuse_import_key();
