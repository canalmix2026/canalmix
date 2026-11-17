create table public.pix_donation_settings (
  id boolean primary key default true check (id),
  pix_key text not null default '' check (char_length(pix_key) <= 77),
  receiver_name text not null default '' check (char_length(receiver_name) <= 25),
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.pix_donation_settings (id) values (true);

create trigger pix_donation_settings_touch_updated_at
before update on public.pix_donation_settings
for each row execute function private.touch_updated_at();

alter table public.pix_donation_settings enable row level security;

create policy "Visitors can read complete active Pix settings"
  on public.pix_donation_settings for select
  to anon, authenticated
  using (
    is_active
    and btrim(pix_key) <> ''
    and btrim(receiver_name) <> ''
  );

create policy "Admins can read Pix settings"
  on public.pix_donation_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create policy "Admins can update Pix settings"
  on public.pix_donation_settings for update
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

revoke all on public.pix_donation_settings from public, anon, authenticated;
grant select on public.pix_donation_settings to anon, authenticated;
grant update on public.pix_donation_settings to authenticated;
grant all on public.pix_donation_settings to service_role;
