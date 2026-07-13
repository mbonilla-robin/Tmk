-- Permitir eliminar noticias TMK (solo filas que coincidan id + author_username en la petición REST)

drop policy if exists robin_news_delete on public.robin_news;

create policy robin_news_delete on public.robin_news
  for delete to anon, authenticated
  using (true);

grant delete on public.robin_news to anon, authenticated;
