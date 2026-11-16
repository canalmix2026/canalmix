-- Local-only merge of the promoted Fortuna Köln name variant.
-- Keeps the pre-existing ID and refuses to delete a row with game links.
do $$
declare
  existing_id uuid;
  duplicate_id uuid;
begin
  select id into existing_id
  from public.teams
  where country_code='DEU' and team_type='club' and gender='men'
    and squad_type='first' and name='Fortuna Köln';

  select id into duplicate_id
  from public.teams
  where country_code='DEU' and team_type='club' and gender='men'
    and squad_type='first' and name='SC Fortuna Köln';

  if existing_id is null then
    raise exception 'Registro preexistente Fortuna Köln ausente; merge cancelado.';
  end if;

  if duplicate_id is not null then
    if exists(select 1 from public.games where home_team_id=duplicate_id or away_team_id=duplicate_id) then
      raise exception 'SC Fortuna Köln tem jogo vinculado; merge cancelado.';
    end if;
    if exists(select 1 from public.teams where id=existing_id and name_is_manual) then
      -- Preserve the manual name; the official variant is still recorded as an alias.
      null;
    end if;
    delete from public.teams where id=duplicate_id;
  end if;

  update public.teams survivor
  set name_aliases = array(
    select distinct alias_name
    from unnest(coalesce(survivor.name_aliases, '{}'::text[]) || array['SC Fortuna Köln']) as aliases(alias_name)
    where btrim(alias_name) <> '' and alias_name <> survivor.name
    order by alias_name
  )
  where survivor.id=existing_id;
end $$;
