alter table public.game_broadcasts
  add column youtube_video_url text,
  add constraint game_broadcasts_youtube_video_url_safe check (
    youtube_video_url is null
    or youtube_video_url ~ '^https://www[.]youtube-nocookie[.]com/embed/[A-Za-z0-9_-]{11}$'
  );

create or replace function public.save_game_with_youtube_metadata(
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
  broadcast_value jsonb;
  updated_broadcast_count integer;
begin
  if p_broadcasts is null
    or pg_catalog.jsonb_typeof(p_broadcasts) <> 'array'
    or pg_catalog.jsonb_array_length(p_broadcasts) > 30 then
    raise exception using errcode = '22023', message = 'invalid_broadcasts';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_broadcasts) as item(value)
    group by (item.value ->> 'sortOrder')::smallint
    having pg_catalog.count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'duplicate_broadcast_sort_order';
  end if;

  game_id_value := public.save_game_with_metadata(
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
    p_away_team_external_id,
    p_external_provider,
    p_external_id,
    p_source_urls
  );

  for broadcast_value in
    select item.value from pg_catalog.jsonb_array_elements(p_broadcasts) as item(value)
  loop
    update public.game_broadcasts
       set youtube_video_url = nullif(broadcast_value ->> 'youtubeVideoUrl', '')
     where game_id = game_id_value
       and sort_order = (broadcast_value ->> 'sortOrder')::smallint;

    get diagnostics updated_broadcast_count = row_count;
    if updated_broadcast_count <> 1 then
      raise exception using errcode = 'P0002', message = 'broadcast_not_found';
    end if;
  end loop;

  return game_id_value;
end;
$$;

revoke all on function public.save_game_with_youtube_metadata(
  uuid, text, text, text, text, text, timestamptz, jsonb, uuid, uuid,
  text, text, text, text, text, text, text[]
) from public, anon, authenticated;
grant execute on function public.save_game_with_youtube_metadata(
  uuid, text, text, text, text, text, timestamptz, jsonb, uuid, uuid,
  text, text, text, text, text, text, text[]
) to authenticated;
