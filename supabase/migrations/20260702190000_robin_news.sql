-- TMK News: comunicación interna del equipo

create table if not exists public.robin_news (
  id uuid primary key default gen_random_uuid(),
  author_username text not null,
  author_display_name text not null default '',
  raw_input text not null default '',
  title text not null,
  lead text not null default '',
  body text not null,
  category text not null default 'general'
    check (category in ('ausencia', 'aviso', 'robin', 'marca', 'celebracion', 'general')),
  status text not null default 'published'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists robin_news_published_idx
  on public.robin_news (published_at desc)
  where status = 'published';

alter table public.robin_news enable row level security;

drop policy if exists robin_news_select on public.robin_news;
drop policy if exists robin_news_insert on public.robin_news;

create policy robin_news_select on public.robin_news
  for select to anon, authenticated
  using (status = 'published');

create policy robin_news_insert on public.robin_news
  for insert to anon, authenticated
  with check (
    author_username is not null
    and length(trim(author_username)) > 0
    and title is not null
    and length(trim(title)) > 0
    and body is not null
    and length(trim(body)) > 0
  );

grant select, insert on public.robin_news to anon, authenticated;
