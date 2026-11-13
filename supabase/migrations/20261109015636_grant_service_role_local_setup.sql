-- The local provisioning script uses the local service key to create the first
-- administrator. This role is never sent to browser code.
grant usage on schema public to service_role;
grant select on public.categories to service_role;
grant select, insert, delete on public.catalog_admins to service_role;
grant select, insert, update, delete on public.channels to service_role;
