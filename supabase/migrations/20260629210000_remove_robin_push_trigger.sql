-- Desactivar envío push al insertar notificaciones (solo campanita in-app)

drop trigger if exists robin_push_on_notification_insert on public.robin_notifications;

drop function if exists public.robin_trigger_push_on_notification();
