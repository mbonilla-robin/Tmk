-- RPC confiable para registrar suscripciones push (evita fallos de upsert desde el cliente)

create or replace function public.robin_upsert_push_subscription(
  p_recipient text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient text := lower(trim(replace(coalesce(p_recipient, ''), '@', '')));
  v_id uuid;
begin
  if v_recipient = '' or p_endpoint is null or p_p256dh is null or p_auth is null then
    raise exception 'invalid_push_subscription_payload';
  end if;

  insert into public.robin_push_subscriptions (
    recipient, endpoint, p256dh, auth, user_agent, updated_at
  ) values (
    v_recipient,
    p_endpoint,
    p_p256dh,
    p_auth,
    left(coalesce(p_user_agent, ''), 240),
    now()
  )
  on conflict (endpoint) do update set
    recipient = excluded.recipient,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.robin_upsert_push_subscription(text, text, text, text, text) from public;
grant execute on function public.robin_upsert_push_subscription(text, text, text, text, text) to anon, authenticated;
