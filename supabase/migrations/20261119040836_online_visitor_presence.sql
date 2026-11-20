create extension if not exists pg_cron with schema pg_catalog;

create table public.online_visitor_sessions (
  session_id uuid primary key,
  device_type text not null check (device_type in ('mobile', 'tablet', 'desktop', 'tv')),
  page_key text not null check (page_key in ('home', 'tv', 'schedule', 'channel', 'privacy', 'other')),
  category_slug text check (
    category_slug is null or
    (length(category_slug) between 1 and 80 and category_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
  ),
  channel_name text check (
    channel_name is null or
    (length(channel_name) between 1 and 80 and channel_name = btrim(channel_name) and channel_name !~ '[[:cntrl:]]')
  ),
  selected_option smallint check (selected_option is null or selected_option between 1 and 50),
  started_at timestamptz not null,
  last_activity_at timestamptz not null,
  constraint online_visitor_sessions_channel_context_check check (
    (page_key = 'channel') or (channel_name is null and selected_option is null)
  )
);

create index online_visitor_sessions_activity_idx
  on public.online_visitor_sessions (last_activity_at);

alter table public.online_visitor_sessions enable row level security;

create policy "Admins can read online visitor sessions"
  on public.online_visitor_sessions for select
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

revoke all on public.online_visitor_sessions from public, anon, authenticated;
grant select on public.online_visitor_sessions to authenticated;
grant select, insert, update, delete on public.online_visitor_sessions to service_role;

create function private.prune_online_visitor_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_count integer;
begin
  delete from public.online_visitor_sessions
  where last_activity_at < pg_catalog.clock_timestamp() - interval '75 seconds';

  get diagnostics removed_count = row_count;
  return removed_count;
end;
$$;

revoke all on function private.prune_online_visitor_sessions() from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname = 'canalmix-prune-online-visitor-sessions'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  perform cron.schedule(
    'canalmix-prune-online-visitor-sessions',
    '30 seconds',
    $command$select private.prune_online_visitor_sessions()$command$
  );
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'online_visitor_sessions'
  ) then
    alter publication supabase_realtime add table public.online_visitor_sessions;
  end if;
end;
$$;
