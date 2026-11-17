-- Grade CanalMix de 18/11/2026 (America/Sao_Paulo).
-- Reimportável nos bancos local e público. Mantém vínculos/correções manuais,
-- cria somente times ausentes e associa canais pelo slug publicado.
with team_data (
  import_key, name, english_name, country_code, country_name,
  team_type, gender, squad_type, name_aliases
) as (
  values
    ('canalmix:v1:ESP:women:first:real-madrid-femenino', 'Real Madrid (F)', 'Real Madrid CF Women', 'ESP', 'Espanha', 'club', 'women', 'first', array['Real Madrid Femenino', 'Real Madrid Feminino', 'Real Madrid Women']::text[]),
    ('canalmix:v1:ITA:women:first:inter-milano-femenino', 'Inter (F)', 'FC Internazionale Milano Women', 'ITA', 'Itália', 'club', 'women', 'first', array['Inter Milan (F)', 'Inter Feminino', 'Inter Milan Women']::text[]),
    ('canalmix:v1:SWE:women:first:bk-hacken', 'BK Häcken (F)', 'BK Häcken Women', 'SWE', 'Suécia', 'club', 'women', 'first', array['Häcken (F)', 'Hacken (F)', 'BK Hacken (F)', 'BK Häcken Feminino']::text[]),
    ('canalmix:v1:ENG:women:first:manchester-city-women', 'Manchester City (F)', 'Manchester City Women', 'ENG', 'Inglaterra', 'club', 'women', 'first', array['Man City (F)', 'Manchester City Feminino', 'Man City Women']::text[]),
    ('canalmix:v1:ITA:women:first:juventus-women', 'Juventus (F)', 'Juventus Women', 'ITA', 'Itália', 'club', 'women', 'first', array['Juventus Feminino']::text[]),
    ('canalmix:v1:BEL:women:first:oh-leuven-women', 'OH Leuven (F)', 'OH Leuven Women', 'BEL', 'Bélgica', 'club', 'women', 'first', array['OH Leuven Feminino']::text[]),
    ('canalmix:v1:ENG:women:first:chelsea-women', 'Chelsea (F)', 'Chelsea Women', 'ENG', 'Inglaterra', 'club', 'women', 'first', array['Chelsea Feminino', 'Chelsea Women']::text[]),
    ('canalmix:v1:FRA:women:first:paris-saint-germain-women', 'Paris Saint-Germain (F)', 'Paris Saint-Germain Women', 'FRA', 'França', 'club', 'women', 'first', array['PSG (F)', 'PSG Feminino', 'Paris Saint-Germain Feminino']::text[]),
    ('canalmix:v1:PER:men:first:alianza-atletico', 'Alianza Atlético', 'Alianza Atlético de Sullana', 'PER', 'Peru', 'club', 'men', 'first', array['Alianza Atletico', 'Alianza Atlético Sullana']::text[]),
    ('canalmix:v1:PER:men:first:fbc-melgar', 'FBC Melgar', 'Foot Ball Club Melgar', 'PER', 'Peru', 'club', 'men', 'first', array['Melgar', 'Foot Ball Club Melgar']::text[]),
    ('canalmix:national:NIC:men', 'Nicarágua', 'Nicaragua', 'NIC', 'Nicarágua', 'national_team', 'men', 'first', array['Nicaragua']::text[]),
    ('canalmix:national:MSR:men', 'Montserrat', 'Montserrat', 'MSR', 'Montserrat', 'national_team', 'men', 'first', array['Montserrat']::text[])
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
      when team_data.gender = 'women'
      then 'Elenco feminino; cadastrar escudo oficial ou licenciado quando disponível.'
      else 'Clube masculino; cadastrar escudo oficial ou licenciado quando disponível.'
    end
  from team_data
  where not exists (
    select 1 from team_matches where team_matches.import_key = team_data.import_key
  )
  on conflict (import_key) do nothing
  returning id, import_key
),
resolved_teams as (
  select team_matches.import_key, team_matches.id from team_matches
  union all
  select inserted_teams.import_key, inserted_teams.id from inserted_teams
),
game_data (
  external_provider, external_id, home_team, away_team,
  home_team_import_key, away_team_import_key,
  competition_name, competition_country_code, competition_country_name,
  starts_at, source_urls
) as (
  values
    (
      'uefa-womens-champions-league-2026-27', '2050568', 'BK Häcken (F)', 'Manchester City (F)',
      'canalmix:v1:SWE:women:first:bk-hacken', 'canalmix:v1:ENG:women:first:manchester-city-women',
      'UEFA Women''s Champions League', 'OTHER', 'Europa', '2026-11-18T17:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/womenschampionsleague/match/2050568--hacken-vs-man-city/',
        'https://www.uefa.com/womenschampionsleague/news/02a9-21848dfb62c3-1313bc23426c-1000--2026-27-womens-champions-league-all-the-league-phase-fixtu/',
        'https://www.mancity.com/news/womens/hacken-v-city-uwcl-tv-listings-63930339',
        'https://futebol.tv.br/jogos/2026-11-18'
      ]::text[]
    ),
    (
      'uefa-womens-champions-league-2026-27', '2050566', 'Real Madrid (F)', 'Inter (F)',
      'canalmix:v1:ESP:women:first:real-madrid-femenino', 'canalmix:v1:ITA:women:first:inter-milano-femenino',
      'UEFA Women''s Champions League', 'OTHER', 'Europa', '2026-11-18T17:45:00Z'::timestamptz,
      array[
        'https://www.uefa.com/womenschampionsleague/match/2050566--real-madrid-vs-inter/',
        'https://www.uefa.com/womenschampionsleague/news/02a9-21848dfb62c3-1313bc23426c-1000--2026-27-womens-champions-league-all-the-league-phase-fixtu/',
        'https://futebol.tv.br/jogos/2026-11-18'
      ]::text[]
    ),
    (
      'uefa-womens-champions-league-2026-27', '2050565', 'Chelsea (F)', 'Paris Saint-Germain (F)',
      'canalmix:v1:ENG:women:first:chelsea-women', 'canalmix:v1:FRA:women:first:paris-saint-germain-women',
      'UEFA Women''s Champions League', 'OTHER', 'Europa', '2026-11-18T20:00:00Z'::timestamptz,
      array[
        'https://www.uefa.com/womenschampionsleague/match/2050565--chelsea-vs-paris-sg/',
        'https://www.uefa.com/womenschampionsleague/news/02a9-21848dfb62c3-1313bc23426c-1000--2026-27-womens-champions-league-all-the-league-phase-fixtu/',
        'https://brazil.espnpressroom.com/press-releases/2026/11/espn-e-disney-tem-rodada-decisiva-da-serie-b-gigantes-europeus-na-uefa-nations-league-uefa-womens-champions-league-e-wta-finals-como-destaques-da-programacao/',
        'https://futebol.tv.br/jogos/2026-11-18'
      ]::text[]
    ),
    (
      'uefa-womens-champions-league-2026-27', '2050567', 'Juventus (F)', 'OH Leuven (F)',
      'canalmix:v1:ITA:women:first:juventus-women', 'canalmix:v1:BEL:women:first:oh-leuven-women',
      'UEFA Women''s Champions League', 'OTHER', 'Europa', '2026-11-18T20:00:00Z'::timestamptz,
      array[
        'https://www.uefa.com/womenschampionsleague/match/2050567--juventus-vs-oh-leuven/',
        'https://www.uefa.com/womenschampionsleague/news/02a9-21848dfb62c3-1313bc23426c-1000--2026-27-womens-champions-league-all-the-league-phase-fixtu/',
        'https://futebol.tv.br/jogos/2026-11-18'
      ]::text[]
    ),
    (
      'liga-1-peru-2026', '2026-11-18-alianza-atletico-fbc-melgar', 'Alianza Atlético', 'FBC Melgar',
      'canalmix:v1:PER:men:first:alianza-atletico', 'canalmix:v1:PER:men:first:fbc-melgar',
      'Campeonato Peruano', 'PER', 'Peru', '2026-11-18T20:00:00Z'::timestamptz,
      array[
        'https://liga1calendario.pe/partido/alianza-atletico-vs-fbc-melgar-A5qd5uVh',
        'https://directvsports.com/futbol/alianza-atletico-vs.-melgar-todo-lo-que-tenes-que-saber-del-duelo-del-campeonato-peruano-20261115-0003.html',
        'https://futebol.tv.br/jogo/alianza-atletico-x-melgar-3697',
        'https://futebol.tv.br/jogos/2026-11-18'
      ]::text[]
    ),
    (
      'concacaf-nations-league-2026-27', '52c43f7e3aeb41a5b84bcd3072c15c51', 'Nicarágua', 'Montserrat',
      'canalmix:national:NIC:men', 'canalmix:national:MSR:men',
      'Concacaf Nations League', 'OTHER', 'América do Norte', '2026-11-18T03:00:00Z'::timestamptz,
      array[
        'https://es.concacaf.com/competitions/nations-league/news/concacaf-confirma-el-calendario-de-noviembre-de-la-liga-de-naciones-concacaf-2026-27',
        'https://www.concacaf.com/competitions/nations-league/matches/52c43f7e3aeb41a5b84bcd3072c15c51/nicaragua-vs-montserrat',
        'https://futebol.tv.br/jogos/2026-11-18'
      ]::text[]
    )
),
resolved_game_data as (
  select
    game_data.external_provider, game_data.external_id,
    game_data.home_team, game_data.away_team,
    game_data.competition_name, game_data.competition_country_code,
    game_data.competition_country_name, game_data.starts_at, game_data.source_urls,
    home_team.id as home_team_id, away_team.id as away_team_id
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
    source_urls = (
      select array_agg(url order by url)
      from (select distinct pg_catalog.unnest(
        coalesce(current_game.source_urls, array[]::text[]) || excluded.source_urls
      ) as url) as distinct_urls
    ),
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
    ('uefa-womens-champions-league-2026-27', '2050568', 'Disney+', null::text, 0, false),
    ('uefa-womens-champions-league-2026-27', '2050566', 'ESPN 4', 'espn-4', 0, true),
    ('uefa-womens-champions-league-2026-27', '2050566', 'Disney+', null::text, 1, false),
    ('uefa-womens-champions-league-2026-27', '2050565', 'Disney+', null::text, 1, false),
    ('uefa-womens-champions-league-2026-27', '2050567', 'ESPN 4', 'espn-4', 0, true),
    ('uefa-womens-champions-league-2026-27', '2050567', 'Disney+', null::text, 1, false),
    ('liga-1-peru-2026', '2026-11-18-alianza-atletico-fbc-melgar', 'Fanatiz', null::text, 0, false),
    ('concacaf-nations-league-2026-27', '52c43f7e3aeb41a5b84bcd3072c15c51', 'Concacaf (YouTube)', null::text, 0, false)
)
insert into public.game_broadcasts (
  game_id, country_code, country_name, broadcaster_name, channel_id, sort_order, is_primary
)
select
  game.id, 'BR', 'Brasil', broadcast.broadcaster_name, channel.id,
  broadcast.sort_order, broadcast.is_primary
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
