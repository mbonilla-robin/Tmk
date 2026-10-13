-- Disponibilidad de salas de reunión (copiada desde Google Calendar por Apps Script)

create table if not exists public.robin_salas (
  sala_id text primary key,
  nombre text not null,
  eventos jsonb not null default '[]'::jsonb,
  error text not null default '',
  actualizado timestamptz not null default now()
);

alter table public.robin_salas enable row level security;

drop policy if exists robin_salas_select on public.robin_salas;
create policy robin_salas_select on public.robin_salas
  for select to anon, authenticated
  using (true);

grant select on public.robin_salas to anon, authenticated;

-- Única vía de escritura: requiere el secreto compartido con el Apps Script.
create or replace function public.robin_salas_sync(p_secret text, p_salas jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  sala jsonb;
  total integer := 0;
begin
  if p_secret is distinct from '5f551b1389facc9e70c08b79f99c9738' then
    raise exception 'No autorizado' using errcode = '28000';
  end if;

  if p_salas is null or jsonb_typeof(p_salas) <> 'array' then
    raise exception 'p_salas debe ser un arreglo';
  end if;

  for sala in select value from jsonb_array_elements(p_salas) loop
    insert into public.robin_salas (sala_id, nombre, eventos, error, actualizado)
    values (
      sala ->> 'id',
      coalesce(sala ->> 'nombre', ''),
      coalesce(sala -> 'eventos', '[]'::jsonb),
      coalesce(sala ->> 'error', ''),
      now()
    )
    on conflict (sala_id) do update set
      nombre = excluded.nombre,
      eventos = excluded.eventos,
      error = excluded.error,
      actualizado = excluded.actualizado;
    total := total + 1;
  end loop;

  delete from public.robin_salas
  where sala_id not in (select value ->> 'id' from jsonb_array_elements(p_salas));

  return total;
end;
$$;

revoke all on function public.robin_salas_sync(text, jsonb) from public;
grant execute on function public.robin_salas_sync(text, jsonb) to anon, authenticated;
