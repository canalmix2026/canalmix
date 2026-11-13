create policy "Admins can add categories"
  on public.categories for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

create policy "Admins can update categories"
  on public.categories for update
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

create policy "Admins can delete categories"
  on public.categories for delete
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  );

grant insert, update, delete on public.categories to authenticated;
grant usage, select on sequence public.categories_id_seq to authenticated;
