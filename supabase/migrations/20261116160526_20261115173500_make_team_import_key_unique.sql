drop index if exists public.teams_import_key_idx;

create unique index teams_import_key_idx
  on public.teams (import_key);
