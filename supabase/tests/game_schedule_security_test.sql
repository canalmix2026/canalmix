BEGIN;
SELECT plan(20);

INSERT INTO public.categories (slug, name, is_active)
VALUES ('pg-game-hidden-category', 'PG Game Hidden Category', false);

INSERT INTO public.channels (
  id, slug, name, category_id, embed_urls, is_published
)
SELECT
  '90000000-0000-4000-8000-000000000001'::uuid,
  'pg-game-hidden-channel',
  'PG Game Hidden Channel',
  categories.id,
  ARRAY['https://player.example.test/embed/hidden'],
  false
FROM public.categories
WHERE categories.slug = 'esporte';

INSERT INTO public.games (
  id, home_team, away_team, competition_name,
  competition_country_code, competition_country_name, starts_at, is_published
)
VALUES
  (
    '90000000-0000-4000-8000-000000000002'::uuid,
    'PG Mandante Publicado', 'PG Visitante Publicado', 'PG Competition',
    'FR', 'FranÃ§a', now() + interval '2 days', true
  ),
  (
    '90000000-0000-4000-8000-000000000003'::uuid,
    'PG Mandante Oculto', 'PG Visitante Oculto', 'PG Competition',
    'FR', 'FranÃ§a', now() + interval '3 days', false
  );

INSERT INTO public.game_broadcasts (
  id, game_id, country_code, country_name, broadcaster_name, channel_id
)
VALUES
  (
    '90000000-0000-4000-8000-000000000004'::uuid,
    '90000000-0000-4000-8000-000000000002'::uuid,
    'BR', 'Brasil', 'PG Emissora Publicada',
    '90000000-0000-4000-8000-000000000001'::uuid
  ),
  (
    '90000000-0000-4000-8000-000000000005'::uuid,
    '90000000-0000-4000-8000-000000000003'::uuid,
    'BR', 'Brasil', 'PG Emissora Oculta',
    '90000000-0000-4000-8000-000000000001'::uuid
  );

SET LOCAL ROLE anon;
SELECT ok(has_table_privilege('anon', 'public.games', 'select'), 'visitantes podem ler a grade publicada');
SELECT ok(NOT has_table_privilege('anon', 'public.games', 'insert'), 'visitantes nÃ£o tÃªm grant de inserÃ§Ã£o de jogos');
SELECT is((SELECT count(*)::integer FROM public.games WHERE id = '90000000-0000-4000-8000-000000000002'), 1, 'visitantes veem jogos publicados');
SELECT is((SELECT count(*)::integer FROM public.games WHERE id = '90000000-0000-4000-8000-000000000003'), 0, 'visitantes nÃ£o veem jogos nÃ£o publicados');
SELECT is((SELECT count(*)::integer FROM public.channels WHERE id = '90000000-0000-4000-8000-000000000001'), 0, 'visitantes nÃ£o veem canais nÃ£o publicados');
SELECT is((SELECT count(*)::integer FROM public.game_broadcasts WHERE id = '90000000-0000-4000-8000-000000000005'), 0, 'visitantes nÃ£o veem emissoras de jogos nÃ£o publicados');
SELECT is((SELECT count(*)::integer FROM public.game_broadcasts WHERE id = '90000000-0000-4000-8000-000000000004'), 1, 'visitantes veem emissoras de jogos publicados');
SELECT is((SELECT count(*)::integer FROM public.categories WHERE slug = 'esporte'), 1, 'visitantes veem categorias ativas');
SELECT is((SELECT count(*)::integer FROM public.categories WHERE slug = 'pg-game-hidden-category'), 0, 'visitantes nÃ£o veem categorias ocultas');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '90000000-0000-4000-8000-000000000099';
SELECT is((SELECT count(*)::integer FROM public.games WHERE id = '90000000-0000-4000-8000-000000000002'), 1, 'usuÃ¡rios autenticados podem ler jogos publicados');
SELECT is((SELECT count(*)::integer FROM public.games WHERE id = '90000000-0000-4000-8000-000000000003'), 0, 'usuÃ¡rios autenticados sem permissÃ£o nÃ£o veem jogos ocultos');
SELECT is((SELECT count(*)::integer FROM public.game_broadcasts WHERE id = '90000000-0000-4000-8000-000000000005'), 0, 'usuÃ¡rios autenticados sem permissÃ£o nÃ£o veem emissoras ocultas');
SELECT is((SELECT count(*)::integer FROM public.categories WHERE slug = 'pg-game-hidden-category'), 0, 'usuÃ¡rios autenticados sem permissÃ£o nÃ£o veem categorias ocultas');
SELECT is_empty($$UPDATE public.categories SET is_active = true WHERE slug = 'pg-game-hidden-category' RETURNING id$$, 'usuÃ¡rios sem permissÃ£o nÃ£o reativam categorias');
SELECT is_empty($$UPDATE public.channels SET is_published = true WHERE id = '90000000-0000-4000-8000-000000000001' RETURNING id$$, 'usuÃ¡rios sem permissÃ£o nÃ£o publicam canais');
SELECT is_empty($$UPDATE public.games SET is_published = true WHERE id = '90000000-0000-4000-8000-000000000003' RETURNING id$$, 'usuÃ¡rios sem permissÃ£o nÃ£o publicam jogos');
SELECT throws_ok(
  $$INSERT INTO public.games (home_team, away_team, competition_name, competition_country_code, competition_country_name, starts_at) VALUES ('PG A', 'PG B', 'PG Competition', 'BR', 'Brasil', now() + interval '1 day')$$,
  '42501', NULL, 'usuÃ¡rios sem permissÃ£o nÃ£o cadastram jogos'
);
SELECT throws_ok(
  $$INSERT INTO public.channels (slug, name, category_id, embed_urls, created_by) SELECT 'pg-game-forged-channel', 'PG Forged Channel', id, ARRAY['https://player.example.test/embed/forged'], '90000000-0000-4000-8000-000000000099'::uuid FROM public.categories WHERE slug = 'esporte'$$,
  '42501', NULL, 'usuÃ¡rios sem permissÃ£o nÃ£o cadastram canais'
);
SELECT throws_ok(
  $$INSERT INTO public.game_broadcasts (game_id, country_code, country_name, broadcaster_name) VALUES ('90000000-0000-4000-8000-000000000002', 'BR', 'Brasil', 'PG Emissora Forjada')$$,
  '42501', NULL, 'usuÃ¡rios sem permissÃ£o nÃ£o cadastram emissoras'
);
SELECT throws_ok(
  $$SELECT public.save_game(NULL, 'PG A', 'PG B', 'PG Competition', 'BR', 'Brasil', now() + interval '1 day', '[]'::jsonb)$$,
  '42501', 'admin_required', 'RPC de gravaÃ§Ã£o exige associaÃ§Ã£o administrativa'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
