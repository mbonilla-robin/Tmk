-- Private app secrets (service_role only). Used by Edge Functions (e.g. Gemini).
create schema if not exists private;

create table if not exists private.robin_app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

revoke all on schema private from public;
revoke all on table private.robin_app_secrets from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on table private.robin_app_secrets to service_role;
