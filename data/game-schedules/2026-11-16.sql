-- Grade CanalMix: 16 a 22/11/2026 (America/Sao_Paulo).
-- Reimportável nos bancos local e público: cria seleções ausentes, associa os
-- times por nome sem substituir vínculos manuais, e faz upsert das partidas.
with team_data (
  name, english_name, country_code, country_name, import_key, name_aliases
) as (
  values
    ('Alemanha', 'Germany', 'DEU', 'Alemanha', 'canalmix:national:DEU:men', array['Germany']::text[]),
    ('Países Baixos', 'Netherlands', 'NLD', 'Países Baixos', 'canalmix:national:NLD:men', array['Netherlands', 'Holland']::text[]),
    ('Islândia', 'Iceland', 'ISL', 'Islândia', 'canalmix:national:ISL:men', array['Iceland']::text[]),
    ('Luxemburgo', 'Luxembourg', 'LUX', 'Luxemburgo', 'canalmix:national:LUX:men', array['Luxembourg']::text[]),
    ('Estônia', 'Estonia', 'EST', 'Estônia', 'canalmix:national:EST:men', array['Estonia']::text[]),
    ('Bulgária', 'Bulgaria', 'BGR', 'Bulgária', 'canalmix:national:BGR:men', array['Bulgaria']::text[]),
    ('Lituânia', 'Lithuania', 'LTU', 'Lituânia', 'canalmix:national:LTU:men', array['Lithuania']::text[]),
    ('Liechtenstein', 'Liechtenstein', 'LIE', 'Liechtenstein', 'canalmix:national:LIE:men', array['Liechtenstein']::text[]),
    ('Andorra', 'Andorra', 'AND', 'Andorra', 'canalmix:national:AND:men', array['Andorra']::text[]),
    ('Azerbaijão', 'Azerbaijan', 'AZE', 'Azerbaijão', 'canalmix:national:AZE:men', array['Azerbaijan']::text[]),
    ('Gibraltar', 'Gibraltar', 'GIB', 'Gibraltar', 'canalmix:national:GIB:men', array['Gibraltar']::text[]),
    ('Malta', 'Malta', 'MLT', 'Malta', 'canalmix:national:MLT:men', array['Malta']::text[]),
    ('Grécia', 'Greece', 'GRC', 'Grécia', 'canalmix:national:GRC:men', array['Greece']::text[]),
    ('Sérvia', 'Serbia', 'SRB', 'Sérvia', 'canalmix:national:SRB:men', array['Serbia']::text[]),
    ('Suíça', 'Switzerland', 'CHE', 'Suíça', 'canalmix:national:CHE:men', array['Switzerland']::text[]),
    ('Escócia', 'Scotland', 'SCO', 'Escócia', 'canalmix:national:SCO:men', array['Scotland']::text[]),
    ('Macedônia do Norte', 'North Macedonia', 'MKD', 'Macedônia do Norte', 'canalmix:national:MKD:men', array['North Macedonia']::text[]),
    ('Eslovênia', 'Slovenia', 'SVN', 'Eslovênia', 'canalmix:national:SVN:men', array['Slovenia']::text[]),
    ('Canadá', 'Canada', 'CAN', 'Canadá', 'canalmix:national:CAN:men', array['Canada']::text[]),
    ('Guatemala', 'Guatemala', 'GTM', 'Guatemala', 'canalmix:national:GTM:men', array['Guatemala']::text[])
),
team_matches as materialized (
  select distinct on (team_data.import_key)
    team_data.import_key,
    teams.id
  from team_data
  join public.teams as teams
    on (
      teams.import_key = team_data.import_key
      and teams.team_type = 'national_team'
      and teams.gender = 'men'
    )
    or (
      teams.team_type = 'national_team'
      and teams.gender = 'men'
      and (
        teams.name_key = pg_catalog.lower(pg_catalog.btrim(team_data.name))
        or teams.name_key = pg_catalog.lower(pg_catalog.btrim(team_data.english_name))
        or exists (
          select 1
          from pg_catalog.unnest(teams.name_aliases) as alias_name(value)
          where pg_catalog.lower(pg_catalog.btrim(alias_name.value)) in (
            pg_catalog.lower(pg_catalog.btrim(team_data.name)),
            pg_catalog.lower(pg_catalog.btrim(team_data.english_name))
          )
        )
      )
    )
  order by team_data.import_key, teams.id
),
inserted_teams as (
  insert into public.teams (
    name, official_name, country_code, country_name, team_type, gender,
    squad_type, shield_url, shield_status, name_is_manual, import_key,
    name_aliases, catalog_note
  )
  select
    team_data.name, team_data.name, team_data.country_code, team_data.country_name,
    'national_team', 'men', 'first', null, 'pending', true,
    team_data.import_key, team_data.name_aliases,
    'Seleção masculina; cadastrar escudo oficial ou licenciado quando disponível.'
  from team_data
  where not exists (
    select 1
    from team_matches
    where team_matches.import_key = team_data.import_key
  )
  on conflict (import_key) do nothing
  returning id, import_key
),
resolved_teams as (
  select team_data.import_key, team_matches.id,
    pg_catalog.lower(pg_catalog.btrim(team_data.name)) as name_key
  from team_data
  join team_matches on team_matches.import_key = team_data.import_key
  union all
  select team_data.import_key, inserted_teams.id,
    pg_catalog.lower(pg_catalog.btrim(team_data.name)) as name_key
  from team_data
  join inserted_teams on inserted_teams.import_key = team_data.import_key
),
game_data (
  external_provider, external_id, home_team, away_team, home_team_id, away_team_id,
  competition_name, competition_country_code, competition_country_name, starts_at, source_urls
) as (
  values
    (
      'uefa-nations-league-2026-27', '2047909', 'Alemanha', 'Países Baixos', '31814917-6fed-4dd6-b5fd-7201e3be8f34'::uuid, 'c7173d8b-4593-4930-ac88-babdd7a8e062'::uuid,
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-16T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047909--germany-vs-netherlands/',
        'https://brazil.espnpressroom.com/press-releases/2026/11/espn-e-disney-tem-rodada-decisiva-da-serie-b-gigantes-europeus-na-uefa-nations-league-uefa-womens-champions-league-e-wta-finals-como-destaques-da-programacao/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-segunda-feira-16-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047906', 'Islândia', 'Luxemburgo', null::uuid, null::uuid,
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-16T17:00:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047906--iceland-vs-luxembourg-malta/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-segunda-feira-16-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047907', 'Estônia', 'Bulgária', null::uuid, null::uuid,
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-16T17:00:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047907--estonia-vs-bulgaria/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-segunda-feira-16-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047911', 'Lituânia', 'Liechtenstein', null::uuid, null::uuid,
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-16T17:00:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047911/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-segunda-feira-16-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'affa-amistosos-2026', '2026-11-16-andorra-azerbaijao', 'Andorra', 'Azerbaijão', null::uuid, null::uuid,
      'Amistoso internacional', 'OTHER', 'Internacional', '2026-11-16T18:00:00Z'::timestamptz,
      array[
        'https://www.affa.az/index.php/news/open-training-sessions-and-press-conference-schedule/81819',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-segunda-feira-16-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047908', 'Gibraltar', 'Malta', null::uuid, null::uuid,
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-16T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047908/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-segunda-feira-16-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047912', 'Grécia', 'Sérvia', null::uuid, null::uuid,
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-16T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047912/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-segunda-feira-16-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047914', 'Suíça', 'Escócia', null::uuid, null::uuid,
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-16T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047914--switzerland-vs-scotland/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-segunda-feira-16-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047915', 'Macedônia do Norte', 'Eslovênia', null::uuid, null::uuid,
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-16T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047915/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-segunda-feira-16-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'concacaf-nations-league-2026-27', '2026-11-16-canada-guatemala', 'Canadá', 'Guatemala', null::uuid, null::uuid,
      'CONCACAF Nations League', 'OTHER', 'América do Norte', '2026-11-17T01:00:00Z'::timestamptz,
      array[
        'https://www.concacaf.com/competitions/nations-league/news/2026-27-concacaf-nations-league-november-schedule-confirmed',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-segunda-feira-16-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
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
resolved_game_data as (
  select
    game_data.external_provider, game_data.external_id, game_data.home_team,
    game_data.away_team, game_data.competition_name,
    game_data.competition_country_code, game_data.competition_country_name,
    game_data.starts_at, game_data.source_urls,
    coalesce(existing_home.id, resolved_home.id) as home_team_id,
    coalesce(existing_away.id, resolved_away.id) as away_team_id
  from game_data
  left join public.teams as existing_home on existing_home.id = game_data.home_team_id
  left join public.teams as existing_away on existing_away.id = game_data.away_team_id
  left join resolved_teams as resolved_home
    on resolved_home.name_key = pg_catalog.lower(pg_catalog.btrim(game_data.home_team))
  left join resolved_teams as resolved_away
    on resolved_away.name_key = pg_catalog.lower(pg_catalog.btrim(game_data.away_team))
),
upserted_games as (
  insert into public.games as current_game (
    external_provider, external_id, home_team, away_team, home_team_id, away_team_id,
    competition_name, competition_country_code, competition_country_name,
    starts_at, source_urls, is_published, published_at
  )
  select
    external_provider, external_id, home_team, away_team, home_team_id, away_team_id,
    competition_name, competition_country_code, competition_country_name,
    starts_at, source_urls, true, now()
  from resolved_game_data
  on conflict (external_provider, external_id)
    where external_provider is not null and external_id is not null
  do update set
    home_team_id = coalesce(current_game.home_team_id, excluded.home_team_id),
    away_team_id = coalesce(current_game.away_team_id, excluded.away_team_id),
    starts_at = excluded.starts_at,
    source_urls = excluded.source_urls
  returning id, external_provider, external_id
),
broadcast_data (
  external_provider, external_id, broadcaster_name, channel_id, sort_order, is_primary
) as (
  values
    ('uefa-nations-league-2026-27', '2047909', 'ESPN', '1b34b9e9-85d0-4902-853d-4056db9d27ab'::uuid, 0, true),
    ('uefa-nations-league-2026-27', '2047909', 'Disney+', null::uuid, 1, false),
    ('uefa-nations-league-2026-27', '2047906', 'ESPN 4', '70a16e94-2c93-4316-94dc-03a5ef5a7801'::uuid, 0, true),
    ('uefa-nations-league-2026-27', '2047906', 'Disney+', null::uuid, 1, false),
    ('uefa-nations-league-2026-27', '2047907', 'SporTV 2', '71c9af06-6d71-4d31-a873-9a5d5e99b074'::uuid, 0, true),
    ('uefa-nations-league-2026-27', '2047911', 'Disney+', null::uuid, 0, false),
    ('affa-amistosos-2026', '2026-11-16-andorra-azerbaijao', 'SporTV 3', '73f57b3d-5459-41c4-8381-7c033db23a8a'::uuid, 0, true),
    ('uefa-nations-league-2026-27', '2047908', 'Disney+', null::uuid, 0, false),
    ('uefa-nations-league-2026-27', '2047912', 'SporTV', '829e1b9b-aa53-49db-b46f-d83a8eee70f0'::uuid, 0, true),
    ('uefa-nations-league-2026-27', '2047914', 'ESPN 4', '70a16e94-2c93-4316-94dc-03a5ef5a7801'::uuid, 0, true),
    ('uefa-nations-league-2026-27', '2047914', 'Disney+', null::uuid, 1, false),
    ('uefa-nations-league-2026-27', '2047915', 'Disney+', null::uuid, 0, false),
    ('concacaf-nations-league-2026-27', '2026-11-16-canada-guatemala', 'Canal GOAT', (select channel.id from public.channels as channel where channel.slug = 'canal-goat' and channel.is_published and exists (select 1 from pg_catalog.unnest(channel.embed_source_active) as source(active) where source.active) limit 1), 0, true),
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
