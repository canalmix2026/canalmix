-- Primeira carga local da grade CanalMix: 16 a 22/11/2026 (America/Sao_Paulo).
-- Reimportável: identidade externa faz upsert, início/fonte acompanham a fonte,
-- dados editados manualmente e transmissões existentes são preservados.
with game_data (
  external_provider, external_id, home_team, away_team, home_team_id, away_team_id,
  competition_name, competition_country_code, competition_country_name, starts_at, source_urls
) as (
  values
    (
      'uefa-nations-league-2026-27', '2047909', 'Alemanha', 'Países Baixos', '31814917-6fed-4dd6-b5fd-7201e3be8f34'::uuid, 'c7173d8b-4593-4930-ac88-babdd7a8e062'::uuid,
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-16T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047909--germany-vs-netherlands/',
        'https://brazil.espnpressroom.com/press-releases/2026/11/espn-e-disney-tem-rodada-decisiva-da-serie-b-gigantes-europeus-na-uefa-nations-league-uefa-womens-champions-league-e-wta-finals-como-destaques-da-programacao/'
      ]::text[]
    ),
    (
      'cbf-amistosos-2026', 'singapura-brasil', 'Singapura', 'Brasil', 'c60ccd8c-862e-46d0-9c0e-41c680a0f65b'::uuid, '7a6dff4f-679b-49fa-b4e3-2a3511de35fb'::uuid,
      'Amistoso internacional', 'OTHER', 'Internacional', '2026-11-17T10:00:00Z'::timestamptz,
      array[
        'https://www.cbf.com.br/selecao-brasileira/noticias/selecao-masculina/a/selecao-brasileira-enfrentara-japao-e-singapura-na-data-fifa-de-novembro',
        'https://ge.globo.com/google/amp/futebol/futebol-internacional/noticia/2026/10/29/convocacao-da-selecao-veja-data-hora-e-onde-assistir-a-lista-de-ancelotti.ghtml',
        'https://www1.folha.uol.com.br/esporte/2026/11/vinicius-junior-tenta-ganhar-forca-na-selecao-antes-de-volta-ao-real-madrid.shtml'
      ]::text[]
    ),
    (
      'uefa-womens-champions-league-2026-27', '2050565', 'Chelsea (F)', 'Paris Saint-Germain (F)', '103b8feb-be64-43fa-9871-9e22249ff7c1'::uuid, 'c7295fa1-0bbf-416f-9030-69a1b11a6e36'::uuid,
      'UEFA Women’s Champions League', 'OTHER', 'Europa', '2026-11-18T20:00:00Z'::timestamptz,
      array[
        'https://www.uefa.com/womenschampionsleague/match/2050565--chelsea-vs-paris-sg/',
        'https://www.uefa.com/womenschampionsleague/news/02ab-220ff9af21a9-748c51d8b995-1000--women-s-champions-league-matchday-5-preview-chelsea-vs-pa/',
        'https://brazil.espnpressroom.com/press-releases/2026/11/espn-e-disney-tem-rodada-decisiva-da-serie-b-gigantes-europeus-na-uefa-nations-league-uefa-womens-champions-league-e-wta-finals-como-destaques-da-programacao/'
      ]::text[]
    ),
    (
      'uefa-womens-champions-league-2026-27', '2050570', 'Arsenal (F)', 'OL Lyonnes (F)', 'e52bca45-5fbc-4422-865e-d2d7168d2b7d'::uuid, 'f461e402-2037-49e5-bbc2-cd3891368a76'::uuid,
      'UEFA Women’s Champions League', 'OTHER', 'Europa', '2026-11-19T20:00:00Z'::timestamptz,
      array[
        'https://www.uefa.com/womenschampionsleague/match/2050570/',
        'https://www.uefa.com/womenschampionsleague/news/02ab-220ff9af21a9-748c51d8b995-1000--women-s-champions-league-matchday-5-preview-chelsea-vs-pa/',
        'https://brazil.espnpressroom.com/press-releases/2026/11/espn-e-disney-tem-rodada-decisiva-da-serie-b-gigantes-europeus-na-uefa-nations-league-uefa-womens-champions-league-e-wta-finals-como-destaques-da-programacao/'
      ]::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '348', 'Coritiba', 'Santos', 'aa64dcbb-f134-42d7-8f09-ec3a38e91e0c'::uuid, '1cffb8f1-0523-44cf-b7cc-d4b1305459a5'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-18T22:30:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '350', 'Remo', 'Chapecoense', '87d43852-0775-4ce6-b1da-55218f3fc4d3'::uuid, '9db1b5d7-b1b0-4d65-9779-29eb14c4d951'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-18T23:00:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '341', 'Flamengo', 'Athletico Paranaense', '0c1d7ee9-d9f9-4466-a7e4-8facc47ca7ef'::uuid, '77316984-ce4d-4fe7-b3ad-efe065893440'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-18T23:30:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '346', 'Cruzeiro', 'Palmeiras', 'ab990752-5e1b-4db8-968e-ffa4cdca0369'::uuid, '4bf2ae75-5a50-4698-a13d-e7415f317e3f'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-18T23:30:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '344', 'Corinthians', 'Botafogo', 'b3496b6f-0663-45ed-a6fa-30451a8166a9'::uuid, '346b9d65-e898-460f-bcc6-01d4216b638d'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-19T00:30:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '347', 'Grêmio', 'Bahia', '84222263-ca74-4910-972a-705237e21663'::uuid, 'ce6721c4-7205-469c-9ae3-bdc3e23813b8'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-19T00:30:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '342', 'Vasco da Gama', 'Internacional', '21653a19-c9bd-4a73-9acd-5d8cda704f3c'::uuid, '73d36ded-1a81-4ec0-8087-f66803e5c96b'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-19T22:30:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '343', 'São Paulo', 'Fluminense', '8b3bf425-ab1d-492c-abac-7148b4b9763b'::uuid, '289ebd40-796e-41eb-aefe-22a93b8269a9'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-20T00:30:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '354', 'Palmeiras', 'Flamengo', '4bf2ae75-5a50-4698-a13d-e7415f317e3f'::uuid, '0c1d7ee9-d9f9-4466-a7e4-8facc47ca7ef'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-21T19:30:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '359', 'Bahia', 'Coritiba', 'ce6721c4-7205-469c-9ae3-bdc3e23813b8'::uuid, 'aa64dcbb-f134-42d7-8f09-ec3a38e91e0c'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-21T20:30:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '360', 'Chapecoense', 'Cruzeiro', '9db1b5d7-b1b0-4d65-9779-29eb14c4d951'::uuid, 'ab990752-5e1b-4db8-968e-ffa4cdca0369'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-22T00:00:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '358', 'Athletico Paranaense', 'Remo', '77316984-ce4d-4fe7-b3ad-efe065893440'::uuid, '87d43852-0775-4ce6-b1da-55218f3fc4d3'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-22T19:00:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '351', 'Fluminense', 'Mirassol', '289ebd40-796e-41eb-aefe-22a93b8269a9'::uuid, '2e12430e-b3ed-435c-8183-969e5ff21026'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-22T21:30:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'cbf-brasileirao-serie-a-2026', '355', 'Red Bull Bragantino', 'Vasco da Gama', 'e6e440a2-aeec-40fc-a71d-11394cc05c29'::uuid, '21653a19-c9bd-4a73-9acd-5d8cda704f3c'::uuid,
      'Campeonato Brasileiro Série A', 'BR', 'Brasil', '2026-11-22T22:30:00Z'::timestamptz,
      array['https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_A_2026_35_e_36_rodada_e41122dd5b.pdf']::text[]
    ),
    (
      'atletico-com-br', 'partida-atletico-mg-x-boca-juniors', 'Atlético Mineiro', 'Boca Juniors', '471841f7-8e99-48e2-8408-8c139866ffe9'::uuid, '3ab322b1-a235-47ef-962c-a6d4f576d5a4'::uuid,
      'CONMEBOL Sudamericana', 'OTHER', 'América do Sul', '2026-11-21T22:30:00Z'::timestamptz,
      array[
        'https://atletico.com.br/partida/atletico-mg-x-boca-juniors/',
        'https://gol.conmebol.com/sudamericana/pt-br/news/final-da-conmebol-sudamericana-2026-sera-disputada-em-barranquilla',
        'https://www.disneyplus.com/pt-br/explore/articles/unlocked-espn-games-disney-plus',
        'https://sports.sbt.com.br/noticia/sul-americana/galo-perde-para-o-city-torque-mas-fara-a-final-da-sula-com-o-boca'
      ]::text[]
    )
),
upserted_games as (
  insert into public.games (
    external_provider, external_id, home_team, away_team, home_team_id, away_team_id,
    competition_name, competition_country_code, competition_country_name,
    starts_at, source_urls, is_published, published_at
  )
  select
    external_provider, external_id, home_team, away_team, home_team_id, away_team_id,
    competition_name, competition_country_code, competition_country_name,
    starts_at, source_urls, true, now()
  from game_data
  on conflict (external_provider, external_id)
    where external_provider is not null and external_id is not null
  do update set
    starts_at = excluded.starts_at,
    source_urls = excluded.source_urls
  returning id, external_provider, external_id
),
broadcast_data (
  external_provider, external_id, broadcaster_name, channel_id, sort_order, is_primary
) as (
  values
    ('uefa-nations-league-2026-27', '2047909', 'ESPN', '1b34b9e9-85d0-4902-853d-4056db9d27ab'::uuid, 0, true),
    ('cbf-amistosos-2026', 'singapura-brasil', 'TV Globo', null::uuid, 0, false),
    ('cbf-amistosos-2026', 'singapura-brasil', 'SporTV', '829e1b9b-aa53-49db-b46f-d83a8eee70f0'::uuid, 1, true),
    ('cbf-amistosos-2026', 'singapura-brasil', 'GE TV', '57e85b9c-6a6c-4d82-9595-8c3b3a81b74b'::uuid, 2, false),
    ('uefa-womens-champions-league-2026-27', '2050565', 'ESPN', '1b34b9e9-85d0-4902-853d-4056db9d27ab'::uuid, 0, true),
    ('uefa-womens-champions-league-2026-27', '2050570', 'ESPN', '1b34b9e9-85d0-4902-853d-4056db9d27ab'::uuid, 0, true),
    ('cbf-brasileirao-serie-a-2026', '348', 'Record', '66c19a96-0034-47d9-9478-5fdd0a0ded85'::uuid, 0, true),
    ('cbf-brasileirao-serie-a-2026', '348', 'CazéTV', null::uuid, 1, false),
    ('cbf-brasileirao-serie-a-2026', '348', 'Premiere — canal a confirmar', null::uuid, 2, false),
    ('cbf-brasileirao-serie-a-2026', '350', 'Premiere — canal a confirmar', null::uuid, 0, false),
    ('cbf-brasileirao-serie-a-2026', '341', 'SporTV', '829e1b9b-aa53-49db-b46f-d83a8eee70f0'::uuid, 0, true),
    ('cbf-brasileirao-serie-a-2026', '341', 'Premiere — canal a confirmar', null::uuid, 1, false),
    ('cbf-brasileirao-serie-a-2026', '346', 'Premiere — canal a confirmar', null::uuid, 0, false),
    ('cbf-brasileirao-serie-a-2026', '344', 'Premiere — canal a confirmar', null::uuid, 0, false),
    ('cbf-brasileirao-serie-a-2026', '347', 'Premiere — canal a confirmar', null::uuid, 0, false),
    ('cbf-brasileirao-serie-a-2026', '342', 'SporTV', '829e1b9b-aa53-49db-b46f-d83a8eee70f0'::uuid, 0, true),
    ('cbf-brasileirao-serie-a-2026', '342', 'Premiere — canal a confirmar', null::uuid, 1, false),
    ('cbf-brasileirao-serie-a-2026', '343', 'TV Globo', null::uuid, 0, false),
    ('cbf-brasileirao-serie-a-2026', '343', 'GETV', '57e85b9c-6a6c-4d82-9595-8c3b3a81b74b'::uuid, 1, true),
    ('cbf-brasileirao-serie-a-2026', '343', 'Premiere — canal a confirmar', null::uuid, 2, false),
    ('cbf-brasileirao-serie-a-2026', '354', 'TV Globo', null::uuid, 0, false),
    ('cbf-brasileirao-serie-a-2026', '354', 'GETV', '57e85b9c-6a6c-4d82-9595-8c3b3a81b74b'::uuid, 1, true),
    ('cbf-brasileirao-serie-a-2026', '354', 'Premiere — canal a confirmar', null::uuid, 2, false),
    ('cbf-brasileirao-serie-a-2026', '359', 'Premiere — canal a confirmar', null::uuid, 0, false),
    ('cbf-brasileirao-serie-a-2026', '360', 'Premiere — canal a confirmar', null::uuid, 0, false),
    ('cbf-brasileirao-serie-a-2026', '358', 'Premiere — canal a confirmar', null::uuid, 0, false),
    ('cbf-brasileirao-serie-a-2026', '351', 'Record', '66c19a96-0034-47d9-9478-5fdd0a0ded85'::uuid, 0, true),
    ('cbf-brasileirao-serie-a-2026', '351', 'CazéTV', null::uuid, 1, false),
    ('cbf-brasileirao-serie-a-2026', '351', 'Premiere — canal a confirmar', null::uuid, 2, false),
    ('cbf-brasileirao-serie-a-2026', '355', 'SporTV', '829e1b9b-aa53-49db-b46f-d83a8eee70f0'::uuid, 0, true),
    ('cbf-brasileirao-serie-a-2026', '355', 'Premiere — canal a confirmar', null::uuid, 1, false),
    ('atletico-com-br', 'partida-atletico-mg-x-boca-juniors', 'ESPN', '1b34b9e9-85d0-4902-853d-4056db9d27ab'::uuid, 0, true),
    ('atletico-com-br', 'partida-atletico-mg-x-boca-juniors', 'SBT', '1fcd0c34-5406-4c93-8bd7-75241eeb677d'::uuid, 1, false),
    ('atletico-com-br', 'partida-atletico-mg-x-boca-juniors', 'Disney+ Premium', null::uuid, 2, false),
    ('atletico-com-br', 'partida-atletico-mg-x-boca-juniors', '+SBT', null::uuid, 3, false),
    ('atletico-com-br', 'partida-atletico-mg-x-boca-juniors', 'YouTube SBT Sports', null::uuid, 4, false),
    ('atletico-com-br', 'partida-atletico-mg-x-boca-juniors', 'TikTok SBT Sports', null::uuid, 5, false)
)
insert into public.game_broadcasts (
  game_id, country_code, country_name, broadcaster_name, channel_id, sort_order, is_primary
)
select
  game.id, 'BR', 'Brasil', broadcast.broadcaster_name, broadcast.channel_id,
  broadcast.sort_order, broadcast.is_primary
from upserted_games as game
join broadcast_data as broadcast
  on broadcast.external_provider = game.external_provider
  and broadcast.external_id = game.external_id
where not exists (
  select 1
  from public.game_broadcasts as existing
  where existing.game_id = game.id
    and existing.country_code = 'BR'
    and pg_catalog.lower(existing.broadcaster_name) = pg_catalog.lower(broadcast.broadcaster_name)
);
