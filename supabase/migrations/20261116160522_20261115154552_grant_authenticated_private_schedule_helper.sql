-- The helper validates catalog_admins and is not exposed by the PostgREST API.
-- Authenticated callers need schema visibility only to execute the guarded helper
-- called by public.save_game; anonymous and public roles remain excluded.
grant usage on schema private to authenticated;
