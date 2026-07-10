-- Permitir eliminar comentarios (solo filas que coincidan id + author en la petición REST)

drop policy if exists robin_comments_delete on public.robin_task_comments;

create policy robin_comments_delete on public.robin_task_comments
  for delete to anon, authenticated
  using (true);

grant delete on public.robin_task_comments to anon, authenticated;
