alter table public.categories
  add column is_active boolean not null default true;

drop policy if exists "Anyone can read categories" on public.categories;

create policy "Anyone can read active categories"
  on public.categories for select
  to anon, authenticated
  using (is_active);

create policy "Admins can read every category"
  on public.categories for select
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create index categories_active_name_idx
  on public.categories (lower(name))
  where is_active;

create table public.games (
  id uuid primary key default gen_random_uuid(),
  home_team text not null check (pg_catalog.length(pg_catalog.btrim(home_team)) between 2 and 80),
  away_team text not null check (pg_catalog.length(pg_catalog.btrim(away_team)) between 2 and 80),
  competition_name text not null check (pg_catalog.length(pg_catalog.btrim(competition_name)) between 2 and 120),
  competition_country_code text not null check (competition_country_code ~ '^[A-Z0-9_-]{2,16}$'),
  competition_country_name text not null check (pg_catalog.length(pg_catalog.btrim(competition_country_name)) between 2 and 60),
  starts_at timestamptz not null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index games_public_schedule_idx
  on public.games (starts_at)
  where is_published;
create index games_competition_starts_at_idx
  on public.games (competition_name, starts_at);

create trigger games_touch_updated_at
before update on public.games
for each row execute function private.touch_updated_at();

create table public.game_broadcasts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z0-9_-]{2,16}$'),
  country_name text not null check (pg_catalog.length(pg_catalog.btrim(country_name)) between 2 and 60),
  broadcaster_name text not null check (pg_catalog.length(pg_catalog.btrim(broadcaster_name)) between 2 and 100),
  channel_id uuid references public.channels (id) on delete set null,
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create index game_broadcasts_game_order_idx
  on public.game_broadcasts (game_id, sort_order);
create index game_broadcasts_channel_idx
  on public.game_broadcasts (channel_id)
  where channel_id is not null;

alter table public.games enable row level security;
alter table public.game_broadcasts enable row level security;

revoke all on public.games, public.game_broadcasts from public, anon, authenticated;
grant select on public.games, public.game_broadcasts to anon, authenticated;
grant insert, update on public.games to authenticated;
grant insert, update, delete on public.game_broadcasts to authenticated;

create policy "Anyone can read published games"
  on public.games for select
  to anon, authenticated
  using (is_published);

create policy "Admins can read every game"
  on public.games for select
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create policy "Admins can add games"
  on public.games for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create policy "Admins can update games"
  on public.games for update
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

create policy "Anyone can read broadcasts for published games"
  on public.game_broadcasts for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.games
      where games.id = game_broadcasts.game_id
        and games.is_published
    )
  );

create policy "Admins can read all game broadcasts"
  on public.game_broadcasts for select
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create policy "Admins can add game broadcasts"
  on public.game_broadcasts for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create policy "Admins can update game broadcasts"
  on public.game_broadcasts for update
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

create policy "Admins can delete game broadcasts"
  on public.game_broadcasts for delete
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create function public.save_game(
  p_game_id uuid,
  p_home_team text,
  p_away_team text,
  p_competition_name text,
  p_competition_country_code text,
  p_competition_country_name text,
  p_starts_at timestamptz,
  p_broadcasts jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  game_id_value uuid;
  broadcast_value jsonb;
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

  if p_game_id is null then
    insert into public.games (
      home_team,
      away_team,
      competition_name,
      competition_country_code,
      competition_country_name,
      starts_at,
      created_by
    ) values (
      p_home_team,
      p_away_team,
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

  delete from public.game_broadcasts
  where game_id = game_id_value;

  for broadcast_value in
    select value from pg_catalog.jsonb_array_elements(p_broadcasts) as item(value)
  loop
    insert into public.game_broadcasts (
      game_id,
      country_code,
      country_name,
      broadcaster_name,
      channel_id,
      sort_order
    ) values (
      game_id_value,
      broadcast_value ->> 'countryCode',
      broadcast_value ->> 'countryName',
      broadcast_value ->> 'broadcasterName',
      nullif(broadcast_value ->> 'channelId', '')::uuid,
      (broadcast_value ->> 'sortOrder')::smallint
    );
  end loop;

  return game_id_value;
end;
$$;

revoke all on function public.save_game(uuid, text, text, text, text, text, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_game(uuid, text, text, text, text, text, timestamptz, jsonb)
  to authenticated;
