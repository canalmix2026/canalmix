alter table public.channels
  add column embed_source_ids uuid[] not null default array[]::uuid[];

update public.channels
set embed_source_ids = array(
  select gen_random_uuid()
  from generate_subscripts(public.channels.embed_urls, 1) as option_index
  order by option_index
);

alter table public.channels
  alter column embed_source_ids drop default;

create function private.sync_channel_embed_source_ids()
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
  elsif new.embed_source_ids is null
    or pg_catalog.cardinality(new.embed_source_ids) = 0 then
    new.embed_source_ids := array(
      select gen_random_uuid()
      from generate_subscripts(new.embed_urls, 1) as option_index
      order by option_index
    );
  end if;

  if pg_catalog.cardinality(new.embed_source_ids)
    is distinct from pg_catalog.cardinality(new.embed_urls)
    or pg_catalog.array_position(new.embed_source_ids, null) is not null
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
      message = 'Every player option must have a unique permanent source ID.';
  end if;

  return new;
end;
$$;

revoke all on function private.sync_channel_embed_source_ids()
  from public, anon, authenticated;

create trigger channels_sync_embed_source_ids
before insert or update of embed_urls, embed_source_ids on public.channels
for each row execute function private.sync_channel_embed_source_ids();

create table public.stream_issue_reports (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null,
  fingerprint_hash text not null check (fingerprint_hash ~ '^[a-f0-9]{64}$'),
  channel_id uuid not null,
  channel_name text not null check (pg_catalog.length(channel_name) between 2 and 80),
  created_at timestamptz not null default now(),
  unique (fingerprint_hash, idempotency_key)
);

create index stream_issue_reports_fingerprint_created_idx
  on public.stream_issue_reports (fingerprint_hash, created_at desc);
create index stream_issue_reports_channel_created_idx
  on public.stream_issue_reports (channel_id, created_at desc);

create table public.stream_issue_report_options (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.stream_issue_reports (id) on delete cascade,
  channel_id uuid not null,
  source_id uuid not null,
  source_position integer not null check (source_position > 0),
  source_label text not null check (pg_catalog.length(source_label) between 1 and 40),
  source_url text not null check (pg_catalog.length(source_url) between 1 and 2048),
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  unique (report_id, source_id),
  check (
    (status = 'pending' and resolved_at is null)
    or (status = 'resolved' and resolved_at is not null)
  )
);

create index stream_issue_options_channel_source_idx
  on public.stream_issue_report_options (channel_id, source_id);
create index stream_issue_options_pending_idx
  on public.stream_issue_report_options (channel_id, source_id)
  where status = 'pending';
create index stream_issue_options_report_idx
  on public.stream_issue_report_options (report_id);

alter table public.stream_issue_reports enable row level security;
alter table public.stream_issue_report_options enable row level security;

revoke all on public.stream_issue_reports, public.stream_issue_report_options
  from public, anon, authenticated;
grant select on public.stream_issue_reports to authenticated;
grant select, update on public.stream_issue_report_options to authenticated;
grant select, insert, update, delete on public.stream_issue_reports to service_role;
grant select, insert, update, delete on public.stream_issue_report_options to service_role;

create policy "Admins can read stream issue reports"
  on public.stream_issue_reports for select
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create policy "Admins can read stream issue options"
  on public.stream_issue_report_options for select
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create policy "Admins can resolve stream issue options"
  on public.stream_issue_report_options for update
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

create function public.submit_stream_issue(
  p_channel_id uuid,
  p_selected_source_ids uuid[],
  p_idempotency_key uuid,
  p_fingerprint_hash text
)
returns table (report_id uuid, protocol text, duplicate boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  channel_name_value text;
  source_ids uuid[];
  source_urls text[];
  new_report_id uuid;
  selected_id uuid;
  option_index integer;
  existing_report_id uuid;
  recent_report_count integer;
begin
  if p_channel_id is null
    or p_idempotency_key is null
    or p_fingerprint_hash is null
    or p_fingerprint_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_request';
  end if;

  if p_selected_source_ids is null
    or pg_catalog.cardinality(p_selected_source_ids) = 0
    or pg_catalog.cardinality(p_selected_source_ids) > 32
    or pg_catalog.array_position(p_selected_source_ids, null) is not null
    or (
      select pg_catalog.count(*)
      from (
        select source_id
        from pg_catalog.unnest(p_selected_source_ids) as source_id
        group by source_id
        having pg_catalog.count(*) > 1
      ) as duplicate_ids
    ) > 0 then
    raise exception using errcode = '22023', message = 'invalid_options';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_fingerprint_hash, 0)
  );

  select reports.id
  into existing_report_id
  from public.stream_issue_reports as reports
  where reports.fingerprint_hash = p_fingerprint_hash
    and reports.idempotency_key = p_idempotency_key;

  if existing_report_id is not null then
    return query select
      existing_report_id,
      'CM-' || pg_catalog.upper(pg_catalog.left(pg_catalog.replace(existing_report_id::text, '-', ''), 10)),
      true;
    return;
  end if;

  select channels.name, channels.embed_source_ids, channels.embed_urls
  into channel_name_value, source_ids, source_urls
  from public.channels as channels
  where channels.id = p_channel_id
    and channels.is_published
  for share;

  if channel_name_value is null then
    raise exception using errcode = '22023', message = 'invalid_channel';
  end if;

  foreach selected_id in array p_selected_source_ids loop
    if not (selected_id = any(source_ids)) then
      raise exception using errcode = '22023', message = 'invalid_options';
    end if;
  end loop;

  select pg_catalog.count(*)
  into recent_report_count
  from public.stream_issue_reports as reports
  where reports.fingerprint_hash = p_fingerprint_hash
    and reports.created_at > pg_catalog.now() - interval '15 minutes';

  if recent_report_count >= 8 then
    raise exception using errcode = 'P0001', message = 'rate_limited';
  end if;

  insert into public.stream_issue_reports (
    idempotency_key,
    fingerprint_hash,
    channel_id,
    channel_name
  ) values (
    p_idempotency_key,
    p_fingerprint_hash,
    p_channel_id,
    channel_name_value
  )
  returning id into new_report_id;

  foreach selected_id in array p_selected_source_ids loop
    option_index := pg_catalog.array_position(source_ids, selected_id);
    insert into public.stream_issue_report_options (
      report_id,
      channel_id,
      source_id,
      source_position,
      source_label,
      source_url
    ) values (
      new_report_id,
      p_channel_id,
      selected_id,
      option_index,
      'Opção ' || option_index,
      source_urls[option_index]
    );
  end loop;

  return query select
    new_report_id,
    'CM-' || pg_catalog.upper(pg_catalog.left(pg_catalog.replace(new_report_id::text, '-', ''), 10)),
    false;
end;
$$;

revoke all on function public.submit_stream_issue(uuid, uuid[], uuid, text)
  from public, anon, authenticated;
grant execute on function public.submit_stream_issue(uuid, uuid[], uuid, text)
  to service_role;
