-- Limpieza del catálogo: solo categorías en uso real
delete from public.robin_categorias;

insert into public.robin_categorias (nombre, color, orden) values
  ('Solicitud', 'sky', 1),
  ('Arte', 'pink', 2),
  ('Reunión', 'cyan', 3),
  ('Propuesta', 'violet', 4),
  ('Robin', 'orange', 5),
  ('Ideas', 'lime', 6),
  ('Diseño', 'indigo', 7),
  ('Finanzas', 'emerald', 8),
  ('Proyecto', 'teal', 9),
  ('PDV', 'amber', 10),
  ('Presupuesto', 'rose', 11),
  ('POP', 'zinc', 12),
  ('ODC', 'zinc', 13),
  ('Adaptación', 'orange', 14),
  ('Otro', 'zinc', 15);
