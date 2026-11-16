create or replace function private.sync_channel_embed_source_ids()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and new.embed_urls is distinct from old.embed_urls
    and new.embed_source_ids is not distinct from old.embed_source_ids then
    new.embed_source_ids := array(
      select gen_random_uuid()
      from generate_subscripts(new.embed_urls, 1) as option_index
      order by option_index
    );
    new.embed_source_active := array(
      select true
      from generate_subscripts(new.embed_urls, 1) as option_index
      order by option_index
    );
  elsif tg_op = 'UPDATE'
    and new.embed_source_ids is distinct from old.embed_source_ids
    and new.embed_source_active is not distinct from old.embed_source_active then
    new.embed_source_active := array(
      select coalesce(
        old.embed_source_active[pg_catalog.array_position(old.embed_source_ids, next_source.source_id)],
        true
      )
      from pg_catalog.unnest(new.embed_source_ids) with ordinality
        as next_source(source_id, source_position)
      order by next_source.source_position
    );
  elsif new.embed_source_ids is null
    or pg_catalog.cardinality(new.embed_source_ids) = 0 then
    new.embed_source_ids := array(
      select gen_random_uuid()
      from generate_subscripts(new.embed_urls, 1) as option_index
      order by option_index
    );
    new.embed_source_active := array(
      select true
      from generate_subscripts(new.embed_urls, 1) as option_index
      order by option_index
    );
  elsif new.embed_source_active is null
    or pg_catalog.cardinality(new.embed_source_active) = 0 then
    new.embed_source_active := array(
      select true
      from generate_subscripts(new.embed_urls, 1) as option_index
      order by option_index
    );
  end if;

  if pg_catalog.cardinality(new.embed_source_ids)
    is distinct from pg_catalog.cardinality(new.embed_urls)
    or pg_catalog.cardinality(new.embed_source_active)
    is distinct from pg_catalog.cardinality(new.embed_urls)
    or pg_catalog.array_position(new.embed_source_ids, null) is not null
    or pg_catalog.array_position(new.embed_source_active, null) is not null
    or (
      select pg_catalog.count(*)
      from (
        select source_id
        from pg_catalog.unnest(new.embed_source_ids) as source_id
        group by source_id
        having pg_catalog.count(*) > 1
      ) as duplicate_ids
    ) > 0 then
    raise exception using
      errcode = '23514',
      message = 'Every player option must have a unique permanent source ID and visibility state.';
  end if;

  return new;
end;
$$;
