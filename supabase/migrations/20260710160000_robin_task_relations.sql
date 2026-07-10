-- Relaciones simétricas entre entregables (por task_key)

create table if not exists public.robin_task_relations (
  id uuid primary key default gen_random_uuid(),
  task_key_a text not null,
  task_key_b text not null,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  constraint robin_task_relations_distinct_keys check (task_key_a <> task_key_b),
  constraint robin_task_relations_unique_pair unique (task_key_a, task_key_b)
);

create index if not exists robin_task_relations_key_a_idx
  on public.robin_task_relations (task_key_a);

create index if not exists robin_task_relations_key_b_idx
  on public.robin_task_relations (task_key_b);

alter table public.robin_task_relations enable row level security;

drop policy if exists robin_task_relations_select on public.robin_task_relations;
drop policy if exists robin_task_relations_insert on public.robin_task_relations;
drop policy if exists robin_task_relations_delete on public.robin_task_relations;

create policy robin_task_relations_select on public.robin_task_relations
  for select to anon, authenticated
  using (true);

create policy robin_task_relations_insert on public.robin_task_relations
  for insert to anon, authenticated
  with check (
    task_key_a is not null
    and length(trim(task_key_a)) > 0
    and task_key_b is not null
    and length(trim(task_key_b)) > 0
  );

create policy robin_task_relations_delete on public.robin_task_relations
  for delete to anon, authenticated
  using (true);

grant select, insert, delete on public.robin_task_relations to anon, authenticated;
