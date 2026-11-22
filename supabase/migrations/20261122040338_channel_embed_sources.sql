alter table public.channels
  add column embed_sources jsonb;

update public.channels as channels
set embed_sources = (
  select pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'id', coalesce(channels.embed_source_ids[option.position], pg_catalog.gen_random_uuid())::text,
      'type', case
        when pg_catalog.regexp_replace(
          channels.embed_urls[option.position],
          '[?#].*$',
          ''
        ) ~* '[.](m3u8|mp4|m4v|webm|ogv|ogg)$'
          then 'direct-url'
        else 'iframe-url'
      end,
      'content', pg_catalog.jsonb_build_object(
        'url', channels.embed_urls[option.position]
      ),
      'active', coalesce(channels.embed_source_active[option.position], true)
    )
    order by option.position
  )
  from pg_catalog.generate_subscripts(channels.embed_urls, 1) as option(position)
);

alter table public.channels
  alter column embed_sources set default '[]'::jsonb,
  alter column embed_sources set not null;

drop trigger if exists channels_validate_embed_urls on public.channels;
drop trigger if exists channels_sync_embed_source_ids on public.channels;

create or replace function private.sync_channel_embed_sources()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  use_legacy_arrays boolean := false;
  source_json jsonb;
  previous_source jsonb;
  source_id_text text;
  source_id_value uuid;
  source_type text;
  source_content jsonb;
  source_url text;
  source_authority text;
  source_active boolean;
  position integer;
  source_ids uuid[] := array[]::uuid[];
  source_urls text[] := array[]::text[];
  source_active_values boolean[] := array[]::boolean[];
begin
  if tg_op = 'INSERT' then
    if new.embed_sources is null
      or pg_catalog.jsonb_typeof(new.embed_sources) is distinct from 'array' then
      use_legacy_arrays := true;
    else
      use_legacy_arrays := pg_catalog.jsonb_array_length(new.embed_sources) = 0;
    end if;
  else
    use_legacy_arrays := new.embed_sources is not distinct from old.embed_sources
      and (
        new.embed_urls is distinct from old.embed_urls
        or new.embed_source_ids is distinct from old.embed_source_ids
        or new.embed_source_active is distinct from old.embed_source_active
      );
    if not use_legacy_arrays
      and new.embed_sources is not distinct from old.embed_sources then
      return new;
    end if;
  end if;

  if use_legacy_arrays then
    if new.embed_urls is null
      or pg_catalog.cardinality(new.embed_urls) < 1
      or pg_catalog.cardinality(new.embed_urls) > 32
      or pg_catalog.array_position(new.embed_urls, null) is not null then
      raise exception using
        errcode = '23514',
        message = 'A channel must have between 1 and 32 valid player options.';
    end if;

    new.embed_sources := '[]'::jsonb;
    for position in 1..pg_catalog.cardinality(new.embed_urls) loop
      source_id_value := coalesce(
        new.embed_source_ids[position],
        pg_catalog.gen_random_uuid()
      );
      source_active := coalesce(new.embed_source_active[position], true);
      source_url := new.embed_urls[position];

      if tg_op = 'UPDATE' then
        select previous.value
        into previous_source
        from pg_catalog.jsonb_array_elements(old.embed_sources) as previous(value)
        where previous.value ->> 'id' = source_id_value::text
        limit 1;
      else
        previous_source := null;
      end if;

      if previous_source is not null
        and coalesce(
          previous_source -> 'content' ->> 'url',
          previous_source -> 'content' ->> 'src'
        ) = source_url then
        source_json := pg_catalog.jsonb_set(
          previous_source,
          '{active}',
          pg_catalog.to_jsonb(source_active),
          true
        );
      else
        source_type := case
          when pg_catalog.regexp_replace(source_url, '[?#].*$', '')
          ~* '[.](m3u8|mp4|m4v|webm|ogv|ogg)$'
            then 'direct-url'
          else 'iframe-url'
        end;
        source_json := pg_catalog.jsonb_build_object(
          'id', source_id_value::text,
          'type', source_type,
          'content', pg_catalog.jsonb_build_object('url', source_url),
          'active', source_active
        );
      end if;

      new.embed_sources := new.embed_sources || pg_catalog.jsonb_build_array(source_json);
    end loop;
  end if;

  if pg_catalog.jsonb_typeof(new.embed_sources) is distinct from 'array' then
    raise exception using
      errcode = '23514',
      message = 'A channel must have between 1 and 32 player options.';
  end if;

  if pg_catalog.jsonb_array_length(new.embed_sources) < 1
    or pg_catalog.jsonb_array_length(new.embed_sources) > 32 then
    raise exception using
      errcode = '23514',
      message = 'A channel must have between 1 and 32 player options.';
  end if;

  for source_json in
    select option.value
    from pg_catalog.jsonb_array_elements(new.embed_sources) with ordinality as option(value, position)
    order by option.position
  loop
    if pg_catalog.jsonb_typeof(source_json) is distinct from 'object'
      or (source_json - 'id' - 'type' - 'content' - 'active') <> '{}'::jsonb
      or pg_catalog.jsonb_typeof(source_json -> 'id') is distinct from 'string'
      or pg_catalog.jsonb_typeof(source_json -> 'type') is distinct from 'string'
      or pg_catalog.jsonb_typeof(source_json -> 'active') is distinct from 'boolean'
      or pg_catalog.jsonb_typeof(source_json -> 'content') is distinct from 'object' then
      raise exception using
        errcode = '23514',
        message = 'Each player option must contain only a valid id, type, content, and active state.';
    end if;

    source_id_text := source_json ->> 'id';
    if source_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception using errcode = '23514', message = 'Each player option needs a UUID.';
    end if;
    source_id_value := source_id_text::uuid;
    if source_id_value = any(source_ids) then
      raise exception using errcode = '23514', message = 'Player option IDs must be unique within a channel.';
    end if;

    source_type := source_json ->> 'type';
    source_content := source_json -> 'content';
    if source_type in ('direct-url', 'iframe-url') then
      if (source_content - 'url') <> '{}'::jsonb
        or pg_catalog.jsonb_typeof(source_content -> 'url') is distinct from 'string' then
        raise exception using
          errcode = '23514',
          message = 'URL player options must contain only a URL.';
      end if;
      source_url := source_content ->> 'url';
    elsif source_type = 'iframe-code' then
      if (source_content - 'src' - 'title' - 'allow' - 'allowFullscreen') <> '{}'::jsonb
        or pg_catalog.jsonb_typeof(source_content -> 'src') is distinct from 'string'
        or (source_content ? 'title' and pg_catalog.jsonb_typeof(source_content -> 'title') is distinct from 'string')
        or (source_content ? 'allow' and pg_catalog.jsonb_typeof(source_content -> 'allow') is distinct from 'string')
        or (source_content ? 'allowFullscreen' and pg_catalog.jsonb_typeof(source_content -> 'allowFullscreen') is distinct from 'boolean') then
        raise exception using
          errcode = '23514',
          message = 'Iframe code options may contain only src, title, allow, and allowFullscreen.';
      end if;
      source_url := source_content ->> 'src';
      if pg_catalog.length(source_content ->> 'title') > 200
        or pg_catalog.length(source_content ->> 'allow') > 512
        or (source_content ? 'title' and (source_content ->> 'title') ~ '[[:cntrl:]]')
        or (source_content ? 'allow' and (source_content ->> 'allow') ~ '[<>[:cntrl:]]') then
        raise exception using errcode = '23514', message = 'Iframe attributes are too long.';
      end if;
    else
      raise exception using errcode = '23514', message = 'Unsupported player option type.';
    end if;

    if source_url is null
      or pg_catalog.length(source_url) < 1
      or pg_catalog.length(source_url) > 2048
      or source_url !~* '^https?://'
      or source_url ~ '[[:space:][:cntrl:]]' then
      raise exception using errcode = '23514', message = 'Player option URLs must use HTTP or HTTPS.';
    end if;

    select (pg_catalog.regexp_match(source_url, '^https?://([^/?#]+)', 'i'))[1]
    into source_authority;
    if source_authority is null or source_authority = '' or source_authority like '%@%' then
      raise exception using errcode = '23514', message = 'Player option URLs cannot contain credentials.';
    end if;

    source_ids := pg_catalog.array_append(source_ids, source_id_value);
    source_urls := pg_catalog.array_append(source_urls, source_url);
    source_active_values := pg_catalog.array_append(
      source_active_values,
      (source_json ->> 'active')::boolean
    );
  end loop;

  new.embed_source_ids := source_ids;
  new.embed_urls := source_urls;
  new.embed_source_active := source_active_values;
  return new;
end;
$$;

revoke all on function private.sync_channel_embed_sources() from public, anon, authenticated;

create trigger channels_sync_embed_sources
before insert or update of embed_sources, embed_urls, embed_source_ids, embed_source_active
on public.channels
for each row execute function private.sync_channel_embed_sources();
