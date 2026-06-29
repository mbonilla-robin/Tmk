-- Comentarios por tarea y notificaciones internas (auth endurecido en fase posterior)

create table if not exists public.robin_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_key text not null,
  marca text not null default '',
  task_title text not null default '',
  author text not null,
  body text not null,
  mentions text[] not null default '{}',
  parent_id uuid references public.robin_task_comments (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists robin_task_comments_task_key_idx
  on public.robin_task_comments (task_key, created_at asc);

create index if not exists robin_task_comments_author_idx
  on public.robin_task_comments (author);

create table if not exists public.robin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  type text not null check (type in ('mencion', 'respuesta', 'asignacion', 'cambio_estado')),
  actor text not null,
  task_key text not null,
  marca text not null default '',
  task_title text not null default '',
  comment_id uuid references public.robin_task_comments (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists robin_notifications_recipient_created_idx
  on public.robin_notifications (recipient, created_at desc);

create index if not exists robin_notifications_recipient_unread_idx
  on public.robin_notifications (recipient)
  where read_at is null;

-- Notificaciones automáticas al comentar (menciones y respuestas)
create or replace function public.robin_notify_on_comment()
returns trigger
language plpgsql
as $$
declare
  mention text;
  parent_author text;
  mention_lower text;
  mentioned_lowers text[] := '{}';
begin
  foreach mention in array coalesce(new.mentions, '{}')
  loop
    mention_lower := lower(trim(mention));
    if mention_lower <> '' then
      mentioned_lowers := array_append(mentioned_lowers, mention_lower);
      if mention_lower <> lower(new.author) then
        insert into public.robin_notifications (
          recipient, type, actor, task_key, marca, task_title, comment_id, payload
        ) values (
          mention_lower,
          'mencion',
          lower(new.author),
          new.task_key,
          new.marca,
          new.task_title,
          new.id,
          jsonb_build_object('excerpt', left(new.body, 160))
        );
      end if;
    end if;
  end loop;

  if new.parent_id is not null then
    select lower(author) into parent_author
    from public.robin_task_comments
    where id = new.parent_id;

    if parent_author is not null
       and parent_author <> lower(new.author)
       and not (parent_author = any(mentioned_lowers))
    then
      insert into public.robin_notifications (
        recipient, type, actor, task_key, marca, task_title, comment_id, payload
      ) values (
        parent_author,
        'respuesta',
        lower(new.author),
        new.task_key,
        new.marca,
        new.task_title,
        new.id,
        jsonb_build_object('excerpt', left(new.body, 160))
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists robin_task_comments_notify on public.robin_task_comments;

create trigger robin_task_comments_notify
  after insert on public.robin_task_comments
  for each row execute function public.robin_notify_on_comment();

alter table public.robin_task_comments enable row level security;
alter table public.robin_notifications enable row level security;

drop policy if exists robin_comments_select on public.robin_task_comments;
drop policy if exists robin_comments_insert on public.robin_task_comments;

create policy robin_comments_select on public.robin_task_comments
  for select to anon, authenticated
  using (true);

create policy robin_comments_insert on public.robin_task_comments
  for insert to anon, authenticated
  with check (
    author is not null
    and length(trim(author)) > 0
    and body is not null
    and length(trim(body)) > 0
    and task_key is not null
    and length(trim(task_key)) > 0
  );

drop policy if exists robin_notifications_select on public.robin_notifications;
drop policy if exists robin_notifications_insert on public.robin_notifications;
drop policy if exists robin_notifications_update on public.robin_notifications;

create policy robin_notifications_select on public.robin_notifications
  for select to anon, authenticated
  using (true);

create policy robin_notifications_insert on public.robin_notifications
  for insert to anon, authenticated
  with check (
    recipient is not null
    and length(trim(recipient)) > 0
    and actor is not null
    and type is not null
    and task_key is not null
  );

create policy robin_notifications_update on public.robin_notifications
  for update to anon, authenticated
  using (true)
  with check (true);

grant select, insert on public.robin_task_comments to anon, authenticated;
grant select, insert, update on public.robin_notifications to anon, authenticated;
