-- Autorizar a Melanie Machado (ejecutivo)
insert into public.robin_allowed_users (username, email) values
  ('mmachado', 'mmachado@robin-agency.com')
on conflict (username) do nothing;
