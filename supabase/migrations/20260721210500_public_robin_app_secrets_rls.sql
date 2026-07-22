-- App secrets for Edge Functions. RLS on, no policies for anon/authenticated.
-- service_role bypasses RLS.
create table if not exists public.robin_app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.robin_app_secrets enable row level security;

revoke all on table public.robin_app_secrets from anon, authenticated;
grant select on table public.robin_app_secrets to service_role;
