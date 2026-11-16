create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (pg_catalog.length(pg_catalog.btrim(name)) between 2 and 80),
  name_key text generated always as (pg_catalog.lower(pg_catalog.btrim(name))) stored unique,
  country_code text check (country_code is null or country_code ~ '^[A-Z0-9_-]{2,16}$'),
  external_provider text,
  external_id text,
  shield_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_external_identity_pair check (
    (external_provider is null and external_id is null)
    or (
      external_provider is not null
      and pg_catalog.length(pg_catalog.btrim(external_provider)) between 2 and 60
      and external_id is not null
      and pg_catalog.length(pg_catalog.btrim(external_id)) between 1 and 128
    )
  ),
  constraint teams_shield_url_safe check (
    shield_url is null
    or (
      pg_catalog.length(pg_catalog.btrim(shield_url)) between 1 and 2048
      and (
        shield_url ~ '^https://[^[:space:]]+$'
        or (
          pg_catalog.left(shield_url, 1) = '/'
          and pg_catalog.left(shield_url, 2) <> '//'
          and shield_url !~ '[[:space:]]'
        )
      )
    )
  )
);

create unique index teams_external_identity_idx
  on public.teams (external_provider, external_id)
  where external_provider is not null and external_id is not null;

create trigger teams_touch_updated_at
before update on public.teams
for each row execute function private.touch_updated_at();

insert into public.teams (name)
select distinct pg_catalog.btrim(team_name)
from (
  select home_team as team_name from public.games
  union all
  select away_team as team_name from public.games
) as game_teams
where pg_catalog.length(pg_catalog.btrim(team_name)) between 2 and 80
on conflict (name_key) do nothing;

alter table public.games
  add column home_team_id uuid references public.teams (id) on delete set null,
  add column away_team_id uuid references public.teams (id) on delete set null;

update public.games as games
set home_team_id = teams.id
from public.teams as teams
where teams.name_key = pg_catalog.lower(pg_catalog.btrim(games.home_team));

update public.games as games
set away_team_id = teams.id
from public.teams as teams
where teams.name_key = pg_catalog.lower(pg_catalog.btrim(games.away_team));

create index games_home_team_id_idx on public.games (home_team_id) where home_team_id is not null;
create index games_away_team_id_idx on public.games (away_team_id) where away_team_id is not null;

alter table public.game_broadcasts
  add column is_primary boolean not null default false;

create unique index game_broadcasts_one_primary_per_market_idx
  on public.game_broadcasts (game_id, country_code)
  where is_primary;

alter table public.teams enable row level security;
revoke all on public.teams from public, anon, authenticated;
grant select on public.teams to anon, authenticated;
grant insert, update, delete on public.teams to authenticated;

create policy "Anyone can read teams in published games"
  on public.teams for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.games
      where games.is_published
        and (games.home_team_id = teams.id or games.away_team_id = teams.id)
    )
  );

create policy "Admins can read every team"
  on public.teams for select
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create policy "Admins can add teams"
  on public.teams for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create policy "Admins can update teams"
  on public.teams for update
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create policy "Admins can delete teams"
  on public.teams for delete
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

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
      set name = normalized_name
      where id = team_id_value;
      return team_id_value;
    end if;
  end if;

  select teams.id into team_id_value
  from public.teams as teams
  where teams.name_key = pg_catalog.lower(normalized_name);

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

  insert into public.teams (name, external_provider, external_id)
  values (normalized_name, normalized_provider, normalized_external_id)
  returning id into team_id_value;
  return team_id_value;
end;
$$;

revoke all on function private.resolve_schedule_team(text, text, text) from public, anon;
grant execute on function private.resolve_schedule_team(text, text, text) to authenticated;

drop function public.save_game(uuid, text, text, text, text, text, timestamptz, jsonb);

create function public.save_game(
  p_game_id uuid,
  p_home_team text,
  p_away_team text,
  p_competition_name text,
  p_competition_country_code text,
  p_competition_country_name text,
  p_starts_at timestamptz,
  p_broadcasts jsonb,
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
  home_team_id_value uuid;
  away_team_id_value uuid;
  broadcast_value jsonb;
  broadcast_id_value uuid;
  seen_broadcast_ids uuid[] := '{}'::uuid[];
  updated_broadcast_count integer;
begin
  if (select auth.uid()) is null
    or not exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    ) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;

  if p_broadcasts is null
    or pg_catalog.jsonb_typeof(p_broadcasts) <> 'array'
    or pg_catalog.jsonb_array_length(p_broadcasts) > 30 then
    raise exception using errcode = '22023', message = 'invalid_broadcasts';
  end if;

  home_team_id_value := private.resolve_schedule_team(
    p_home_team, p_home_team_provider, p_home_team_external_id
  );
  away_team_id_value := private.resolve_schedule_team(
    p_away_team, p_away_team_provider, p_away_team_external_id
  );

  if p_game_id is null then
    insert into public.games (
      home_team,
      away_team,
      home_team_id,
      away_team_id,
      competition_name,
      competition_country_code,
      competition_country_name,
      starts_at,
      created_by
    ) values (
      p_home_team,
      p_away_team,
      home_team_id_value,
      away_team_id_value,
      p_competition_name,
      p_competition_country_code,
      p_competition_country_name,
      p_starts_at,
      (select auth.uid())
    )
    returning id into game_id_value;
  else
    update public.games
    set home_team = p_home_team,
      away_team = p_away_team,
      home_team_id = home_team_id_value,
      away_team_id = away_team_id_value,
      competition_name = p_competition_name,
      competition_country_code = p_competition_country_code,
      competition_country_name = p_competition_country_name,
      starts_at = p_starts_at
    where id = p_game_id
    returning id into game_id_value;

    if game_id_value is null then
      raise exception using errcode = 'P0002', message = 'game_not_found';
    end if;
  end if;

  update public.game_broadcasts
  set is_primary = false
  where game_id = game_id_value and is_primary;

  for broadcast_value in
    select value from pg_catalog.jsonb_array_elements(p_broadcasts) as item(value)
  loop
    broadcast_id_value := nullif(broadcast_value ->> 'id', '')::uuid;

    if broadcast_id_value is not null then
      update public.game_broadcasts
      set country_code = broadcast_value ->> 'countryCode',
        country_name = broadcast_value ->> 'countryName',
        broadcaster_name = broadcast_value ->> 'broadcasterName',
        channel_id = nullif(broadcast_value ->> 'channelId', '')::uuid,
        sort_order = (broadcast_value ->> 'sortOrder')::smallint,
        is_primary = coalesce((broadcast_value ->> 'isPrimary')::boolean, false)
      where id = broadcast_id_value and game_id = game_id_value;
      get diagnostics updated_broadcast_count = row_count;
      if updated_broadcast_count = 0 then
        raise exception using errcode = 'P0002', message = 'broadcast_not_found';
      end if;
    else
      insert into public.game_broadcasts (
        game_id,
        country_code,
        country_name,
        broadcaster_name,
        channel_id,
        sort_order,
        is_primary
      ) values (
        game_id_value,
        broadcast_value ->> 'countryCode',
        broadcast_value ->> 'countryName',
        broadcast_value ->> 'broadcasterName',
        nullif(broadcast_value ->> 'channelId', '')::uuid,
        (broadcast_value ->> 'sortOrder')::smallint,
        coalesce((broadcast_value ->> 'isPrimary')::boolean, false)
      )
      returning id into broadcast_id_value;
    end if;

    seen_broadcast_ids := pg_catalog.array_append(seen_broadcast_ids, broadcast_id_value);
  end loop;

  delete from public.game_broadcasts
  where game_id = game_id_value
    and not (id = any(seen_broadcast_ids));

  return game_id_value;
end;
$$;

revoke all on function public.save_game(uuid, text, text, text, text, text, timestamptz, jsonb, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.save_game(uuid, text, text, text, text, text, timestamptz, jsonb, text, text, text, text)
  to authenticated;
