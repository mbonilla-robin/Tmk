-- Informes de entregables: historial compartido del workspace

create table if not exists public.robin_informes (
  id uuid primary key default gen_random_uuid(),
  author_username text not null,
  marca text not null default '',
  titulo text not null default 'INFORME ENTREGABLES',
  mes_desde text not null default '',
  mes_hasta text not null default '',
  status text not null default 'borrador'
    check (status in ('borrador', 'con_ia', 'exportado')),
  payload jsonb not null default '{}'::jsonb,
  exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists robin_informes_updated_idx
  on public.robin_informes (updated_at desc);

create index if not exists robin_informes_author_idx
  on public.robin_informes (author_username);

alter table public.robin_informes enable row level security;

drop policy if exists robin_informes_select on public.robin_informes;
drop policy if exists robin_informes_insert on public.robin_informes;
drop policy if exists robin_informes_update on public.robin_informes;
drop policy if exists robin_informes_delete on public.robin_informes;

create policy robin_informes_select on public.robin_informes
  for select to anon, authenticated
  using (true);

create policy robin_informes_insert on public.robin_informes
  for insert to anon, authenticated
  with check (
    author_username is not null
    and length(trim(author_username)) > 0
    and status in ('borrador', 'con_ia', 'exportado')
  );

create policy robin_informes_update on public.robin_informes
  for update to anon, authenticated
  using (true)
  with check (
    author_username is not null
    and length(trim(author_username)) > 0
    and status in ('borrador', 'con_ia', 'exportado')
  );

create policy robin_informes_delete on public.robin_informes
  for delete to anon, authenticated
  using (true);

grant select, insert, update, delete on public.robin_informes to anon, authenticated;
