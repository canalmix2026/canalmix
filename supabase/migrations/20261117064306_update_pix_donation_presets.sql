drop policy if exists "Visitors can read complete active Pix settings"
  on public.pix_donation_settings;

alter table public.pix_donation_settings
  drop column if exists receiver_city,
  add column preset_amount_1_cents bigint not null default 1000
    check (preset_amount_1_cents > 0 and preset_amount_1_cents <= 999999999999),
  add column preset_amount_2_cents bigint not null default 2000
    check (preset_amount_2_cents > 0 and preset_amount_2_cents <= 999999999999),
  add column preset_amount_3_cents bigint not null default 3000
    check (preset_amount_3_cents > 0 and preset_amount_3_cents <= 999999999999);

create policy "Visitors can read complete active Pix settings"
  on public.pix_donation_settings for select
  to anon, authenticated
  using (
    is_active
    and btrim(pix_key) <> ''
    and btrim(receiver_name) <> ''
  );
