alter table public.channels
  add column embed_urls text[] not null default array[]::text[];

update public.channels
set embed_urls = array[embed_url];

alter table public.channels
  drop column embed_url,
  alter column embed_urls drop default,
  add constraint channels_embed_urls_nonempty_check
    check (
      pg_catalog.cardinality(embed_urls) > 0
      and pg_catalog.array_position(embed_urls, null) is null
    );

create function private.validate_channel_embed_urls()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  embed_option text;
begin
  if pg_catalog.cardinality(new.embed_urls) is null
    or pg_catalog.cardinality(new.embed_urls) = 0
    or pg_catalog.array_position(new.embed_urls, null) is not null then
    raise exception using
      errcode = '23514',
      message = 'At least one non-empty embed URL is required.';
  end if;

  foreach embed_option in array new.embed_urls loop
    if pg_catalog.char_length(embed_option) > 2048
      or pg_catalog.left(pg_catalog.lower(embed_option), 8) <> 'https://' then
      raise exception using
        errcode = '23514',
        message = 'Every embed URL must use HTTPS and be at most 2048 characters.';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.validate_channel_embed_urls()
  from public, anon, authenticated;

create trigger channels_validate_embed_urls
before insert or update of embed_urls on public.channels
for each row execute function private.validate_channel_embed_urls();
