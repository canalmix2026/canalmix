alter table public.teams
  drop constraint if exists teams_name_key_key;

alter table public.teams
  add column official_name text,
  add column country_name text,
  add column team_type text not null default 'club',
  add column gender text not null default 'men',
  add column squad_type text not null default 'first',
  add column import_key text,
  add column name_aliases text[] not null default '{}',
  add column source_data_name text,
  add column source_data_url text,
  add column source_data_license text,
  add column source_competition_key text,
  add column source_season_year smallint,
  add column shield_status text not null default 'pending',
  add column shield_source_url text,
  add column shield_license text,
  add column name_is_manual boolean not null default false,
  add column catalog_note text;

update public.teams
set official_name = name,
    country_name = case name
      when 'Letônia' then 'Letônia'
      when 'Armênia' then 'Armênia'
      when 'Chipre' then 'Chipre'
      when 'Montenegro' then 'Montenegro'
      when 'Bielorrússia' then 'Belarus'
      when 'Albânia' then 'Albânia'
      when 'Finlândia' then 'Finlândia'
      when 'San Marino' then 'San Marino'
      when 'Espanha' then 'Espanha'
      when 'Inglaterra' then 'Inglaterra'
      when 'Bélgica' then 'Bélgica'
      when 'Itália' then 'Itália'
      when 'França' then 'França'
      when 'Turquia' then 'Turquia'
      when 'Croácia' then 'Croácia'
      when 'República Tcheca' then 'Tchéquia'
      when 'Panamá' then 'Panamá'
      when 'Curaçao' then 'Curaçao'
      when 'Arsenal (F)' then 'Inglaterra'
      when 'Flamengo (F)' then 'Brasil'
      when 'Internacional (F)' then 'Brasil'
      when 'London City Lionesses (F)' then 'Inglaterra'
      when 'Danubio' then 'Uruguai'
      when 'Liverpool Montevideo' then 'Uruguai'
      when 'Defensor Sporting' then 'Uruguai'
      when 'Peñarol' then 'Uruguai'
      else country_name
    end,
    team_type = case
      when name in (
        'Letônia', 'Armênia', 'Chipre', 'Montenegro', 'Bielorrússia',
        'Albânia', 'Finlândia', 'San Marino', 'Espanha', 'Inglaterra',
        'Bélgica', 'Itália', 'França', 'Turquia', 'Croácia',
        'República Tcheca', 'Panamá', 'Curaçao'
      ) then 'national_team'
      else 'club'
    end,
    gender = case
      when name in ('Arsenal (F)', 'Flamengo (F)', 'Internacional (F)', 'London City Lionesses (F)') then 'women'
      else 'men'
    end,
    country_code = case name
      when 'Letônia' then 'LVA'
      when 'Armênia' then 'ARM'
      when 'Chipre' then 'CYP'
      when 'Montenegro' then 'MNE'
      when 'Bielorrússia' then 'BLR'
      when 'Albânia' then 'ALB'
      when 'Finlândia' then 'FIN'
      when 'San Marino' then 'SMR'
      when 'Espanha' then 'ESP'
      when 'Inglaterra' then 'ENG'
      when 'Bélgica' then 'BEL'
      when 'Itália' then 'ITA'
      when 'França' then 'FRA'
      when 'Turquia' then 'TUR'
      when 'Croácia' then 'HRV'
      when 'República Tcheca' then 'CZE'
      when 'Panamá' then 'PAN'
      when 'Curaçao' then 'CUW'
      when 'Arsenal (F)' then 'ENG'
      when 'Flamengo (F)' then 'BRA'
      when 'Internacional (F)' then 'BRA'
      when 'London City Lionesses (F)' then 'ENG'
      when 'Danubio' then 'URY'
      when 'Liverpool Montevideo' then 'URY'
      when 'Defensor Sporting' then 'URY'
      when 'Peñarol' then 'URY'
      else country_code
    end,
    shield_status = case when shield_url is null then 'pending' else 'manual' end,
    name_is_manual = true,
    catalog_note = 'Registro existente no CanalMix; identidade e nome preservados durante a ampliação do catálogo.';

alter table public.teams
  alter column official_name set not null,
  alter column official_name set default '',
  alter column name_is_manual set default true,
  add constraint teams_official_name_length check (
    pg_catalog.length(pg_catalog.btrim(official_name)) between 2 and 120
  ),
  add constraint teams_team_type_check check (team_type in ('club', 'national_team')),
  add constraint teams_gender_check check (gender in ('men', 'women', 'mixed')),
  add constraint teams_squad_type_check check (squad_type in ('first', 'reserve', 'development', 'youth', 'other')),
  add constraint teams_shield_status_check check (shield_status in ('pending', 'approved', 'manual', 'not_applicable')),
  add constraint teams_source_data_url_safe check (
    source_data_url is null or source_data_url ~ '^https://[^[:space:]]+$'
  ),
  add constraint teams_shield_source_url_safe check (
    shield_source_url is null or shield_source_url ~ '^https://[^[:space:]]+$'
  ),
  add constraint teams_import_key_length check (
    import_key is null or pg_catalog.length(pg_catalog.btrim(import_key)) between 3 and 240
  ),
  add constraint teams_source_data_license_length check (
    source_data_license is null or pg_catalog.length(pg_catalog.btrim(source_data_license)) between 2 and 120
  ),
  add constraint teams_source_season_year_check check (
    source_season_year is null or source_season_year between 1800 and 2200
  ),
  add constraint teams_shield_license_length check (
    shield_license is null or pg_catalog.length(pg_catalog.btrim(shield_license)) between 2 and 120
  );

create unique index teams_import_key_idx
  on public.teams (import_key)
  where import_key is not null;

create index teams_country_identity_idx
  on public.teams (country_code, team_type, gender, squad_type, name_key);

create index teams_source_data_idx
  on public.teams (source_data_name)
  where source_data_name is not null;

create or replace function private.resolve_schedule_team(
  p_name text,
  p_external_provider text default null,
  p_external_id text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  team_id_value uuid;
  normalized_name text := pg_catalog.btrim(p_name);
  normalized_provider text := nullif(pg_catalog.btrim(p_external_provider), '');
  normalized_external_id text := nullif(pg_catalog.btrim(p_external_id), '');
begin
  if (select auth.uid()) is null
    or not exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    ) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;

  if pg_catalog.length(normalized_name) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'invalid_team_name';
  end if;
  if (normalized_provider is null) <> (normalized_external_id is null) then
    raise exception using errcode = '22023', message = 'incomplete_external_team_identity';
  end if;

  if normalized_provider is not null then
    select teams.id into team_id_value
    from public.teams as teams
    where teams.external_provider = normalized_provider
      and teams.external_id = normalized_external_id;
    if team_id_value is not null then
      update public.teams
      set name = case when name_is_manual then name else normalized_name end,
          official_name = case when name_is_manual then official_name else normalized_name end
      where id = team_id_value;
      return team_id_value;
    end if;
  end if;

  select teams.id into team_id_value
  from public.teams as teams
  where teams.name_key = pg_catalog.lower(normalized_name)
  order by teams.country_code nulls last, teams.team_type, teams.gender, teams.squad_type, teams.id
  limit 1;
  if team_id_value is not null then
    if normalized_provider is not null then
      update public.teams
      set external_provider = normalized_provider,
          external_id = normalized_external_id
      where id = team_id_value
        and external_provider is null
        and external_id is null;
    end if;
    return team_id_value;
  end if;

  insert into public.teams (name, official_name, external_provider, external_id, name_is_manual)
  values (normalized_name, normalized_name, normalized_provider, normalized_external_id, true)
  returning id into team_id_value;
  return team_id_value;
end;
$$;

revoke all on function private.resolve_schedule_team(text, text, text) from public, anon;
grant execute on function private.resolve_schedule_team(text, text, text) to authenticated;

create or replace function public.save_game_with_teams(
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
  p_home_team_provider text default null,
  p_home_team_external_id text default null,
  p_away_team_provider text default null,
  p_away_team_external_id text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  game_id_value uuid;
begin
  if (p_home_team_id is not null and not exists (select 1 from public.teams where id = p_home_team_id))
    or (p_away_team_id is not null and not exists (select 1 from public.teams where id = p_away_team_id)) then
    raise exception using errcode = 'P0002', message = 'team_not_found';
  end if;

  game_id_value := public.save_game(
    p_game_id,
    p_home_team,
    p_away_team,
    p_competition_name,
    p_competition_country_code,
    p_competition_country_name,
    p_starts_at,
    p_broadcasts,
    p_home_team_provider,
    p_home_team_external_id,
    p_away_team_provider,
    p_away_team_external_id
  );

  update public.games as games
  set home_team = coalesce((select teams.name from public.teams as teams where teams.id = p_home_team_id), games.home_team),
      away_team = coalesce((select teams.name from public.teams as teams where teams.id = p_away_team_id), games.away_team),
      home_team_id = coalesce(p_home_team_id, games.home_team_id),
      away_team_id = coalesce(p_away_team_id, games.away_team_id)
  where games.id = game_id_value;

  return game_id_value;
end;
$$;

revoke all on function public.save_game_with_teams(uuid, text, text, text, text, text, timestamptz, jsonb, uuid, uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.save_game_with_teams(uuid, text, text, text, text, text, timestamptz, jsonb, uuid, uuid, text, text, text, text)
  to authenticated;
