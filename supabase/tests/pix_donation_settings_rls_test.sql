BEGIN;
SELECT plan(9);

UPDATE public.pix_donation_settings
SET pix_key = 'canalmix@example.test',
    receiver_name = 'CANALMIX',
    is_active = true
WHERE id = true;

SELECT ok(NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pix_donation_settings'
    AND column_name = 'receiver_city'
), 'configuração não contém campo de cidade do recebedor');

SET LOCAL ROLE anon;
SELECT ok(has_table_privilege('anon', 'public.pix_donation_settings', 'select'), 'visitantes podem consultar a configuração pública');
SELECT ok(NOT has_table_privilege('anon', 'public.pix_donation_settings', 'update'), 'visitantes não podem alterar a configuração');
SELECT ok(NOT has_table_privilege('anon', 'public.pix_donation_settings', 'insert'), 'visitantes não podem criar configuração');
SELECT is((SELECT count(*)::integer FROM public.pix_donation_settings WHERE id = true), 1, 'visitantes só recebem a configuração ativa e completa');
RESET ROLE;

UPDATE public.pix_donation_settings SET is_active = false WHERE id = true;
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::integer FROM public.pix_donation_settings WHERE id = true), 0, 'visitantes não leem configuração desativada');
SELECT throws_ok(
  $$UPDATE public.pix_donation_settings SET is_active = true WHERE id = true$$,
  '42501', NULL, 'visitantes não conseguem ativar doações'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '90000000-0000-4000-8000-000000000099';
SELECT ok(has_table_privilege('authenticated', 'public.pix_donation_settings', 'update'), 'usuários autenticados têm grant restrito para atualizar');
SELECT is_empty(
  $$UPDATE public.pix_donation_settings SET is_active = true WHERE id = true RETURNING id$$,
  'usuários sem associação administrativa não alteram as doações'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
