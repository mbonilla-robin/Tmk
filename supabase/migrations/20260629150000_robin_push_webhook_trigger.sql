-- Dispara la Edge Function send-push-on-notification al insertar en robin_notifications

create extension if not exists pg_net with schema extensions;

create or replace function public.robin_trigger_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  push_url text := 'https://xiaotnensmqmhanfbtlk.supabase.co/functions/v1/send-push-on-notification';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYW90bmVuc21xbWhhbmZidGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjU4NDIsImV4cCI6MjA5NzE0MTg0Mn0.gw_BNTkpwsP_6N6oNSY_WoLiG9AN8SVUjH-C-gVMRDw';
begin
  perform net.http_post(
    url := push_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    ),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );
  return NEW;
end;
$$;

drop trigger if exists robin_push_on_notification_insert on public.robin_notifications;

create trigger robin_push_on_notification_insert
  after insert on public.robin_notifications
  for each row
  execute function public.robin_trigger_push_on_notification();
