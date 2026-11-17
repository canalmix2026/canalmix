create extension if not exists pg_cron with schema pg_catalog;

create index if not exists games_expiration_starts_at_idx
  on public.games (starts_at);

delete from public.games
where starts_at <= now() - interval '3 hours';

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname = 'canalmix-expire-games-after-three-hours'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  perform cron.schedule(
    'canalmix-expire-games-after-three-hours',
    '* * * * *',
    $command$delete from public.games where starts_at <= now() - interval '3 hours'$command$
  );
end;
$$;
