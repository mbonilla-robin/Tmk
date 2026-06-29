-- Suscripciones Web Push por usuario/dispositivo

create table if not exists public.robin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists robin_push_subscriptions_recipient_idx
  on public.robin_push_subscriptions (recipient);

alter table public.robin_push_subscriptions enable row level security;

drop policy if exists robin_push_subscriptions_select on public.robin_push_subscriptions;
drop policy if exists robin_push_subscriptions_insert on public.robin_push_subscriptions;
drop policy if exists robin_push_subscriptions_update on public.robin_push_subscriptions;
drop policy if exists robin_push_subscriptions_delete on public.robin_push_subscriptions;

create policy robin_push_subscriptions_select on public.robin_push_subscriptions
  for select to anon, authenticated
  using (true);

create policy robin_push_subscriptions_insert on public.robin_push_subscriptions
  for insert to anon, authenticated
  with check (
    recipient is not null
    and length(trim(recipient)) > 0
    and endpoint is not null
    and p256dh is not null
    and auth is not null
  );

create policy robin_push_subscriptions_update on public.robin_push_subscriptions
  for update to anon, authenticated
  using (true)
  with check (true);

create policy robin_push_subscriptions_delete on public.robin_push_subscriptions
  for delete to anon, authenticated
  using (true);

grant select, insert, update, delete on public.robin_push_subscriptions to anon, authenticated;
