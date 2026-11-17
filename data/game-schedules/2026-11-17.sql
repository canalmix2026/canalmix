-- Grade CanalMix de 17/11/2026 (America/Sao_Paulo).
-- Reimportável nos bancos local e público. Mantém vínculos/correções manuais,
-- cria somente os times ausentes e associa canais pelo slug publicado.
with team_data (
  import_key, name, english_name, country_code, country_name,
  team_type, gender, squad_type, name_aliases
) as (
  values
    ('canalmix:national:JPN:men', 'Japão', 'Japan', 'JPN', 'Japão', 'national_team', 'men', 'first', array['Japão']::text[]),
    ('canalmix:national:PRY:men', 'Paraguai', 'Paraguay', 'PRY', 'Paraguai', 'national_team', 'men', 'first', array['Paraguay']::text[]),
    ('canalmix:national:DNK:men', 'Dinamarca', 'Denmark', 'DNK', 'Dinamarca', 'national_team', 'men', 'first', array['Denmark']::text[]),
    ('canalmix:national:NOR:men', 'Noruega', 'Norway', 'NOR', 'Noruega', 'national_team', 'men', 'first', array['Norway']::text[]),
    ('canalmix:national:WAL:men', 'País de Gales', 'Wales', 'WAL', 'País de Gales', 'national_team', 'men', 'first', array['País de Gales', 'Wales']::text[]),
    ('canalmix:national:PRT:men', 'Portugal', 'Portugal', 'PRT', 'Portugal', 'national_team', 'men', 'first', array['Portugal']::text[]),
    ('canalmix:national:HUN:men', 'Hungria', 'Hungary', 'HUN', 'Hungria', 'national_team', 'men', 'first', array['Hungria', 'Hungary']::text[]),
    ('canalmix:national:NIR:men', 'Irlanda do Norte', 'Northern Ireland', 'NIR', 'Irlanda do Norte', 'national_team', 'men', 'first', array['Irlanda do Norte', 'Northern Ireland']::text[]),
    ('canalmix:national:UKR:men', 'Ucrânia', 'Ukraine', 'UKR', 'Ucrânia', 'national_team', 'men', 'first', array['Ukraine']::text[]),
    ('canalmix:national:GEO:men', 'Geórgia', 'Georgia', 'GEO', 'Geórgia', 'national_team', 'men', 'first', array['Georgia']::text[]),
    ('canalmix:national:ISR:men', 'Israel', 'Israel', 'ISR', 'Israel', 'national_team', 'men', 'first', array['Israel']::text[]),
    ('canalmix:national:AUT:men', 'Áustria', 'Austria', 'AUT', 'Áustria', 'national_team', 'men', 'first', array['Austria']::text[]),
    ('canalmix:national:IRL:men', 'Irlanda', 'Republic of Ireland', 'IRL', 'Irlanda', 'national_team', 'men', 'first', array['Ireland', 'República da Irlanda', 'Republic of Ireland']::text[]),
    ('canalmix:national:XKX:men', 'Kosovo', 'Kosovo', 'XKX', 'Kosovo', 'national_team', 'men', 'first', array['Kosovo']::text[]),
    ('canalmix:national:BIH:men', 'Bósnia e Herzegovina', 'Bosnia and Herzegovina', 'BIH', 'Bósnia e Herzegovina', 'national_team', 'men', 'first', array['Bosnia and Herzegovina']::text[]),
    ('canalmix:national:ROU:men', 'Romênia', 'Romania', 'ROU', 'Romênia', 'national_team', 'men', 'first', array['Romania']::text[]),
    ('canalmix:national:POL:men', 'Polônia', 'Poland', 'POL', 'Polônia', 'national_team', 'men', 'first', array['Poland']::text[]),
    ('canalmix:national:SWE:men', 'Suécia', 'Sweden', 'SWE', 'Suécia', 'national_team', 'men', 'first', array['Sweden']::text[]),
    ('canalmix:national:ARG:men', 'Argentina', 'Argentina', 'ARG', 'Argentina', 'national_team', 'men', 'first', array['Argentina']::text[]),
    ('canalmix:national:CRI:men', 'Costa Rica', 'Costa Rica', 'CRI', 'Costa Rica', 'national_team', 'men', 'first', array['Costa Rica']::text[]),
    ('canalmix:national:USA:men', 'Estados Unidos', 'United States', 'USA', 'Estados Unidos', 'national_team', 'men', 'first', array['Estados Unidos', 'United States', 'USA']::text[]),
    ('canalmix:national:HTI:men', 'Haiti', 'Haiti', 'HTI', 'Haiti', 'national_team', 'men', 'first', array['Haiti']::text[]),
    ('canalmix:national:MEX:men', 'México', 'Mexico', 'MEX', 'México', 'national_team', 'men', 'first', array['Mexico']::text[]),
    ('canalmix:national:JAM:men', 'Jamaica', 'Jamaica', 'JAM', 'Jamaica', 'national_team', 'men', 'first', array['Jamaica']::text[]),
    ('canalmix:v1:BRA:men:first:atletico-mineiro-mg', 'Atlético Mineiro', 'Atlético Mineiro', 'BRA', 'Brasil', 'club', 'men', 'first', array['Atlético-MG', 'Atlético Mineiro']::text[]),
    ('canalmix:v1:BRA:men:first:sao-paulo-fc', 'São Paulo FC', 'São Paulo FC', 'BRA', 'Brasil', 'club', 'men', 'first', array['São Paulo', 'São Paulo - SP']::text[]),
    ('canalmix:v1:BRA:women:first:santos-fc-sp', 'Santos (F)', 'Santos FC', 'BRA', 'Brasil', 'club', 'women', 'first', array['Santos FC (F)', 'Santos Feminino']::text[]),
    ('canalmix:v1:BRA:women:first:sao-paulo-fc', 'São Paulo (F)', 'São Paulo FC', 'BRA', 'Brasil', 'club', 'women', 'first', array['São Paulo FC (F)', 'São Paulo Feminino']::text[]),
    ('canalmix:v1:BRA:women:first:rb-bragantino', 'Red Bull Bragantino (F)', 'Red Bull Bragantino', 'BRA', 'Brasil', 'club', 'women', 'first', array['RB Bragantino (F)', 'Bragantino Feminino']::text[]),
    ('canalmix:v1:BRA:women:first:sc-corinthians-paulista', 'Corinthians (F)', 'SC Corinthians Paulista', 'BRA', 'Brasil', 'club', 'women', 'first', array['SC Corinthians Paulista (F)', 'Corinthians Feminino']::text[])
),
team_matches as materialized (
  select distinct on (team_data.import_key)
    team_data.import_key,
    teams.id
  from team_data
  join public.teams as teams
    on teams.import_key = team_data.import_key
    or (
      teams.team_type = team_data.team_type
      and teams.gender = team_data.gender
      and teams.country_code = team_data.country_code
      and (
        teams.name_key in (
          pg_catalog.lower(pg_catalog.btrim(team_data.name)),
          pg_catalog.lower(pg_catalog.btrim(team_data.english_name))
        )
        or exists (
          select 1
          from pg_catalog.unnest(teams.name_aliases) as alias_name(value)
          where pg_catalog.lower(pg_catalog.btrim(alias_name.value)) in (
            pg_catalog.lower(pg_catalog.btrim(team_data.name)),
            pg_catalog.lower(pg_catalog.btrim(team_data.english_name))
          )
        )
        or exists (
          select 1
          from pg_catalog.unnest(team_data.name_aliases) as alias_name(value)
          where teams.name_key = pg_catalog.lower(pg_catalog.btrim(alias_name.value))
             or exists (
               select 1
               from pg_catalog.unnest(teams.name_aliases) as existing_alias(value)
               where pg_catalog.lower(pg_catalog.btrim(existing_alias.value)) =
                 pg_catalog.lower(pg_catalog.btrim(alias_name.value))
             )
        )
      )
    )
  order by team_data.import_key, (teams.import_key = team_data.import_key) desc, teams.id
),
inserted_teams as (
  insert into public.teams (
    name, official_name, country_code, country_name, team_type, gender,
    squad_type, shield_url, shield_status, name_is_manual, import_key,
    name_aliases, catalog_note
  )
  select
    team_data.name, team_data.name, team_data.country_code, team_data.country_name,
    team_data.team_type, team_data.gender, team_data.squad_type,
    null, 'pending', true, team_data.import_key, team_data.name_aliases,
    case when team_data.team_type = 'national_team'
      then 'Seleção masculina; cadastrar escudo oficial ou licenciado quando disponível.'
      else 'Elenco feminino; cadastrar escudo oficial ou licenciado quando disponível.'
    end
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
  select team_matches.import_key, team_matches.id
  from team_matches
  union all
  select inserted_teams.import_key, inserted_teams.id
  from inserted_teams
),
game_data (
  external_provider, external_id, home_team, away_team,
  home_team_import_key, away_team_import_key,
  competition_name, competition_country_code, competition_country_name,
  starts_at, source_urls
) as (
  values
    (
      'cbf-amistosos-2026', 'singapura-brasil', 'Singapura', 'Brasil',
      'canalmix:national:SGP:men', 'canalmix:national:BRA:men',
      'Amistoso internacional', 'OTHER', 'Internacional', '2026-11-17T10:00:00Z'::timestamptz,
      array[
        'https://www.cbf.com.br/selecao-brasileira/noticias/selecao-masculina/a/selecao-brasileira-enfrentara-japao-e-singapura-na-data-fifa-de-novembro',
        'https://ge.globo.com/futebol/selecao-brasileira/noticia/2026/11/16/singapura-x-brasil-onde-assistir-ao-vivo-horario-e-escalacoes.ghtml'
      ]::text[]
    ),
    (
      'jfa-amistosos-2026', '2026-11-17-japan-paraguay', 'Japão', 'Paraguai',
      'canalmix:national:JPN:men', 'canalmix:national:PRY:men',
      'Amistoso internacional', 'OTHER', 'Internacional', '2026-11-17T13:10:00Z'::timestamptz,
      array[
        'https://www.jfa.jp/eng/samuraiblue/20261117/match_page/m4.html',
        'https://jfa.jp/eng/samuraiblue/20261117/news/00036974/',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047919', 'Dinamarca', 'Noruega',
      'canalmix:national:DNK:men', 'canalmix:national:NOR:men',
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-17T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047919--denmark-vs-norway/',
        'https://brazil.espnpressroom.com/press-releases/2026/11/espn-e-disney-tem-rodada-decisiva-da-serie-b-gigantes-europeus-na-uefa-nations-league-uefa-womens-champions-league-e-wta-finals-como-destaques-da-programacao/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047920', 'País de Gales', 'Portugal',
      'canalmix:national:WAL:men', 'canalmix:national:PRT:men',
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-17T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047920--wales-vs-portugal/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047921', 'Hungria', 'Irlanda do Norte',
      'canalmix:national:HUN:men', 'canalmix:national:NIR:men',
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-17T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047921--hungary-vs-northern-ireland/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047918', 'Ucrânia', 'Geórgia',
      'canalmix:national:UKR:men', 'canalmix:national:GEO:men',
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-17T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047918--ukraine-vs-georgia/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047916', 'Israel', 'Áustria',
      'canalmix:national:ISR:men', 'canalmix:national:AUT:men',
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-17T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047916--israel-vs-austria/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047923', 'Irlanda', 'Kosovo',
      'canalmix:national:IRL:men', 'canalmix:national:XKX:men',
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-17T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047923--republic-of-ireland-vs-kosovo/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047917', 'Bósnia e Herzegovina', 'Romênia',
      'canalmix:national:BIH:men', 'canalmix:national:ROU:men',
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-17T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047917--bosnia-and-herzegovina-vs-romania/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'uefa-nations-league-2026-27', '2047922', 'Polônia', 'Suécia',
      'canalmix:national:POL:men', 'canalmix:national:SWE:men',
      'UEFA Nations League', 'OTHER', 'Europa', '2026-11-17T19:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/uefanationsleague/match/2047922--poland-vs-sweden/',
        'https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'afa-amistosos-2026', '2026-11-17-argentina-costa-rica', 'Argentina', 'Costa Rica',
      'canalmix:national:ARG:men', 'canalmix:national:CRI:men',
      'Amistoso internacional', 'OTHER', 'América do Sul', '2026-11-17T23:00:00Z'::timestamptz,
      array[
        'https://www.afa.com.ar/es/posts/la-albiceleste-afrontara-el-proximo-martes-su-segundo-y-ultimo-amistoso-de-la-fecha-fifa-de-noviembre-ante-costa-rica',
        'https://www.afa.com.ar/es/posts/terna-arbitral-confirmada-para-argentina-costa-rica',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'cbf-copa-brasil-sub20-2026', '0073C20/2026', 'Atlético-MG', 'São Paulo',
      'canalmix:v1:BRA:men:first:atletico-mineiro-mg', 'canalmix:v1:BRA:men:first:sao-paulo-fc',
      'Copa do Brasil Sub-20', 'BR', 'Brasil', '2026-11-17T22:00:00Z'::timestamptz,
      array[
        'https://www.cbf.com.br/futebol-brasileiro/noticias/copa-brasil-sub20/a/cbf-detalha-semifinal-da-copa-do-brasil-sub-20',
        'https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/TABELA_DETALHADA_5_FASE_COPA_DO_BRASIL_MASCULINA_SUB_20_2026_171eccf473.pdf',
        'https://ge.globo.com/pr/futebol/copa-do-brasil-sub-20/noticia/2026/11/09/semifinais-da-copa-do-brasil-sub-20-datas-horarios-e-onde-assistir-aos-jogos.ghtml'
      ]::text[]
    ),
    (
      'fpf-paulista-feminino-2026', '2026-11-17-santos-sao-paulo', 'Santos (F)', 'São Paulo (F)',
      'canalmix:v1:BRA:women:first:santos-fc-sp', 'canalmix:v1:BRA:women:first:sao-paulo-fc',
      'Paulistão Feminino', 'BR', 'Brasil', '2026-11-17T22:00:00Z'::timestamptz,
      array[
        'https://www.saopaulofc.net/calendario-de-jogos-femininos/',
        'https://record.r7.com/acerte-ou-caia/entrevistas/lucas-pereira-destaca-alta-competitividade-do-paulistao-feminino-principal-campeonato-do-pais-30102026/',
        'https://www.uol.com.br/esporte/futebol/ultimas-noticias/2026/11/17/santos-e-sao-paulo-se-enfrentam-no-pacaembu-pelo-play-in-do-paulistao-f.ghtm',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'fpf-paulista-feminino-2026', '2026-11-17-rb-bragantino-corinthians', 'Red Bull Bragantino (F)', 'Corinthians (F)',
      'canalmix:v1:BRA:women:first:rb-bragantino', 'canalmix:v1:BRA:women:first:sc-corinthians-paulista',
      'Paulistão Feminino', 'BR', 'Brasil', '2026-11-18T00:00:00Z'::timestamptz,
      array[
        'https://www.redbullbragantino.com/br-pt/noticias/jogo-de-volta-pelo-play-in-do-paulistao-f-2026-tem-detalhes-confirmados',
        'https://record.r7.com/acerte-ou-caia/entrevistas/lucas-pereira-destaca-alta-competitividade-do-paulistao-feminino-principal-campeonato-do-pais-30102026/',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'concacaf-nations-league-2026-27', '2026-11-17-united-states-haiti', 'Estados Unidos', 'Haiti',
      'canalmix:national:USA:men', 'canalmix:national:HTI:men',
      'CONCACAF Nations League', 'OTHER', 'América do Norte', '2026-11-18T00:00:00Z'::timestamptz,
      array[
        'https://www.concacaf.com/competitions/nations-league/news/2026-27-concacaf-nations-league-november-schedule-confirmed',
        'https://www.concacaf.com/competitions/nations-league/news/concacaf-council-approves-exceptional-hosting-arrangement-for-the-haitian-football-federation',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    ),
    (
      'concacaf-nations-league-2026-27', '2026-11-17-mexico-jamaica', 'México', 'Jamaica',
      'canalmix:national:MEX:men', 'canalmix:national:JAM:men',
      'CONCACAF Nations League', 'OTHER', 'América do Norte', '2026-11-18T02:30:00Z'::timestamptz,
      array[
        'https://www.concacaf.com/competitions/nations-league/news/2026-27-concacaf-nations-league-november-schedule-confirmed',
        'https://veja.abril.com.br/esporte/jogos-de-hoje-terca-17-de-novembro-onde-assistir-futebol-ao-vivo-e-horarios/'
      ]::text[]
    )
),
resolved_game_data as (
  select
    game_data.external_provider,
    game_data.external_id,
    game_data.home_team,
    game_data.away_team,
    game_data.competition_name,
    game_data.competition_country_code,
    game_data.competition_country_name,
    game_data.starts_at,
    game_data.source_urls,
    home_team.id as home_team_id,
    away_team.id as away_team_id
  from game_data
  left join resolved_teams as home_team
    on home_team.import_key = game_data.home_team_import_key
  left join resolved_teams as away_team
    on away_team.import_key = game_data.away_team_import_key
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
    source_urls = excluded.source_urls,
    is_published = true,
    published_at = coalesce(current_game.published_at, now())
  returning id, external_provider, external_id
),
published_channels as (
  select channel.slug, channel.id
  from public.channels as channel
  where channel.is_published
    and exists (
      select 1
      from pg_catalog.unnest(channel.embed_source_active) as source(active)
      where source.active
    )
),
broadcast_data (
  external_provider, external_id, broadcaster_name, channel_slug, sort_order, is_primary
) as (
  values
    ('cbf-amistosos-2026', 'singapura-brasil', 'TV Globo', null::text, 0, false),
    ('cbf-amistosos-2026', 'singapura-brasil', 'SporTV', 'sportv', 1, true),
    ('cbf-amistosos-2026', 'singapura-brasil', 'GE TV', 'getv', 2, false),
    ('jfa-amistosos-2026', '2026-11-17-japan-paraguay', 'ESPN', 'espn', 0, true),
    ('jfa-amistosos-2026', '2026-11-17-japan-paraguay', 'Disney+', null::text, 1, false),
    ('uefa-nations-league-2026-27', '2047919', 'ESPN', 'espn', 0, true),
    ('uefa-nations-league-2026-27', '2047919', 'Disney+', null::text, 1, false),
    ('uefa-nations-league-2026-27', '2047920', 'SporTV', 'sportv', 0, true),
    ('uefa-nations-league-2026-27', '2047921', 'SporTV 3', 'sportv-3', 0, true),
    ('uefa-nations-league-2026-27', '2047918', 'Disney+', null::text, 0, false),
    ('uefa-nations-league-2026-27', '2047918', 'ESPN Brasil (YouTube)', null::text, 1, false),
    ('uefa-nations-league-2026-27', '2047916', 'ESPN 4', 'espn-4', 0, true),
    ('uefa-nations-league-2026-27', '2047916', 'Disney+', null::text, 1, false),
    ('uefa-nations-league-2026-27', '2047923', 'Disney+', null::text, 0, false),
    ('uefa-nations-league-2026-27', '2047917', 'Disney+', null::text, 0, false),
    ('uefa-nations-league-2026-27', '2047922', 'SporTV 2', 'sportv-2', 0, true),
    ('afa-amistosos-2026', '2026-11-17-argentina-costa-rica', 'SporTV', 'sportv', 0, true),
    ('afa-amistosos-2026', '2026-11-17-argentina-costa-rica', 'GE TV', 'getv', 1, false),
    ('cbf-copa-brasil-sub20-2026', '0073C20/2026', 'SporTV 2', 'sportv-2', 0, true),
    ('fpf-paulista-feminino-2026', '2026-11-17-santos-sao-paulo', 'Record News', 'record-news', 0, true),
    ('fpf-paulista-feminino-2026', '2026-11-17-santos-sao-paulo', 'CazéTV', null::text, 1, false),
    ('fpf-paulista-feminino-2026', '2026-11-17-santos-sao-paulo', 'Paulistão (YouTube)', null::text, 2, false),
    ('fpf-paulista-feminino-2026', '2026-11-17-santos-sao-paulo', 'HBO Max', null::text, 3, false),
    ('fpf-paulista-feminino-2026', '2026-11-17-rb-bragantino-corinthians', 'SporTV 3', 'sportv-3', 0, true),
    ('concacaf-nations-league-2026-27', '2026-11-17-united-states-haiti', 'Canal GOAT', 'canal-goat', 0, true),
    ('concacaf-nations-league-2026-27', '2026-11-17-united-states-haiti', 'Concacaf (YouTube)', null::text, 1, false),
    ('concacaf-nations-league-2026-27', '2026-11-17-mexico-jamaica', 'Canal GOAT', 'canal-goat', 0, true),
    ('concacaf-nations-league-2026-27', '2026-11-17-mexico-jamaica', 'Concacaf (YouTube)', null::text, 1, false)
)
insert into public.game_broadcasts (
  game_id, country_code, country_name, broadcaster_name, channel_id, sort_order, is_primary
)
select
  game.id,
  'BR',
  'Brasil',
  broadcast.broadcaster_name,
  channel.id,
  broadcast.sort_order,
  broadcast.is_primary
from upserted_games as game
join broadcast_data as broadcast
  on broadcast.external_provider = game.external_provider
  and broadcast.external_id = game.external_id
left join published_channels as channel
  on channel.slug = broadcast.channel_slug
where not exists (
  select 1
  from public.game_broadcasts as existing
  where existing.game_id = game.id
    and existing.country_code = 'BR'
    and pg_catalog.lower(existing.broadcaster_name) = pg_catalog.lower(broadcast.broadcaster_name)
);
