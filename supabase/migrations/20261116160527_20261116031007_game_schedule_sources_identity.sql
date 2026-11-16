alter table public.games
  add column external_provider text,
  add column external_id text,
  add column source_urls text[] not null default '{}'::text[];

alter table public.games
  add constraint games_external_identity_pair check (
    (external_provider is null and external_id is null)
    or (
      external_provider is not null
      and pg_catalog.length(pg_catalog.btrim(external_provider)) between 2 and 60
      and external_id is not null
      and pg_catalog.length(pg_catalog.btrim(external_id)) between 1 and 128
    )
  ),
  add constraint games_source_urls_safe check (
    pg_catalog.cardinality(source_urls) <= 10
    and pg_catalog.array_position(source_urls, null) is null
    and (
      pg_catalog.cardinality(source_urls) = 0
      or pg_catalog.array_to_string(source_urls, E'\n') ~ '^https://[^[:space:]]+(\nhttps://[^[:space:]]+)*$'
    )
  );

create unique index games_external_identity_idx
  on public.games (external_provider, external_id)
  where external_provider is not null and external_id is not null;

create or replace function public.save_game_with_metadata(
  p_game_id uuid,
  p_home_team text,
  p_away_team text,
  p_competition_name text,
  p_competition_country_code text,
  p_competition_country_name text,
  p_starts_at timestamptz,
  p_broadcasts jsonb,
  p_home_team_id uuid,
  p_away_team_id uuid,
  p_home_team_provider text,
  p_home_team_external_id text,
  p_away_team_provider text,
  p_away_team_external_id text,
  p_external_provider text,
  p_external_id text,
  p_source_urls text[]
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  game_id_value uuid;
  external_provider_value text := nullif(pg_catalog.btrim(p_external_provider), '');
  external_id_value text := nullif(pg_catalog.btrim(p_external_id), '');
begin
  if (external_provider_value is null) <> (external_id_value is null) then
    raise exception using errcode = '22023', message = 'incomplete_external_game_identity';
  end if;

  game_id_value := public.save_game_with_teams(
    p_game_id,
    p_home_team,
    p_away_team,
    p_competition_name,
    p_competition_country_code,
    p_competition_country_name,
    p_starts_at,
    p_broadcasts,
    p_home_team_id,
    p_away_team_id,
    p_home_team_provider,
    p_home_team_external_id,
    p_away_team_provider,
    p_away_team_external_id
  );

  update public.games
  set external_provider = external_provider_value,
      external_id = external_id_value,
      source_urls = coalesce(p_source_urls, '{}'::text[])
  where id = game_id_value;

  return game_id_value;
end;
$$;

revoke all on function public.save_game_with_metadata(
  uuid, text, text, text, text, text, timestamptz, jsonb, uuid, uuid,
  text, text, text, text, text, text, text[]
) from public, anon, authenticated;
grant execute on function public.save_game_with_metadata(
  uuid, text, text, text, text, text, timestamptz, jsonb, uuid, uuid,
  text, text, text, text, text, text, text[]
) to authenticated;
