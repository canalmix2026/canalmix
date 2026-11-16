-- Local-only reconciliation of unreferenced alternate team records.
-- All deletions below are guarded against existing game links.
do $$
declare
  pair record;
  old_id uuid;
  current_id uuid;
  survivor_id uuid;
  duplicate_id uuid;
  old_manual boolean;
  current_manual boolean;
  old_has_games boolean;
  current_has_games boolean;
  stale_id uuid;
begin
  for pair in
    select * from (values
      ('DEU','first','SV 07 Elversberg','SV Elversberg'),
      ('DEU','first','TSG 1899 Hoffenheim','TSG Hoffenheim'),
      ('DEU','first','Waldhof Mannheim','SV Waldhof Mannheim'),
      ('DEU','first','Wacker Burghausen','SV Wacker Burghausen'),
      ('DEU','reserve','1899 Hoffenheim II','TSG Hoffenheim II'),
      ('ENG','first','Bolton Wanderers','Bolton Wanderers FC'),
      ('ENG','first','Cardiff City','Cardiff City FC'),
      ('ENG','first','Lincoln City','Lincoln City FC'),
      ('ESP','first','Cultural Leonesa','CyD Leonesa'),
      ('ESP','first','Deportivo La Coruña','RC Deportivo La Coruña'),
      ('ESP','first','Racing Santander','Real Racing Club de Santander'),
      ('FRA','first','ES Troyes AC','ESTAC Troyes'),
      ('ITA','first','Empoli FC','Empoli'),
      ('ITA','first','Clodiense SSD','Union Clodiense Chioggia'),
      ('ITA','first','Team Altamura','Altamura')
    ) as names(country_code, squad_type, old_name, current_name)
  loop
    select id, name_is_manual into old_id, old_manual
    from public.teams
    where country_code = pair.country_code and team_type = 'club' and gender = 'men'
      and squad_type = pair.squad_type and name = pair.old_name;
    if not found then raise exception 'Registro original ausente: % / %', pair.country_code, pair.old_name; end if;

    select id, name_is_manual into current_id, current_manual
    from public.teams
    where country_code = pair.country_code and team_type = 'club' and gender = 'men'
      and squad_type = pair.squad_type and name = pair.current_name;
    if not found then raise exception 'Registro atual ausente: % / %', pair.country_code, pair.current_name; end if;
    if old_id = current_id then raise exception 'IDs iguais no par % / %', pair.old_name, pair.current_name; end if;

    select exists(select 1 from public.games where home_team_id = old_id or away_team_id = old_id) into old_has_games;
    select exists(select 1 from public.games where home_team_id = current_id or away_team_id = current_id) into current_has_games;
    if old_manual then
      survivor_id := old_id;
    elsif current_manual or (current_has_games and not old_has_games) then
      survivor_id := current_id;
    elsif old_has_games or not current_has_games then
      survivor_id := old_id;
    else
      survivor_id := current_id;
    end if;
    duplicate_id := case when survivor_id = old_id then current_id else old_id end;
    if exists(select 1 from public.games where home_team_id = duplicate_id or away_team_id = duplicate_id) then
      raise exception 'Registro duplicado % ainda tem jogo vinculado.', duplicate_id;
    end if;

    update public.teams survivor
    set name_aliases = array(
      select distinct alias_name
      from unnest(coalesce(survivor.name_aliases, '{}'::text[]) || array[pair.old_name, pair.current_name]) as aliases(alias_name)
      where btrim(alias_name) <> '' and alias_name <> survivor.name
      order by alias_name
    )
    where survivor.id = survivor_id;

    delete from public.teams where id = duplicate_id;
  end loop;

  -- Real Sociedad B is a reserve team. The pre-existing row carried the
  -- wrong category, so reuse its ID after removing the duplicate reserve row.
  select id into old_id from public.teams
  where country_code='ESP' and team_type='club' and gender='men' and squad_type='first' and name='Real Sociedad B';
  select id into current_id from public.teams
  where country_code='ESP' and team_type='club' and gender='men' and squad_type='reserve' and name='Real Sociedad B';
  if old_id is null or current_id is null then raise exception 'Real Sociedad B não tem os dois registros esperados.'; end if;
  if exists(select 1 from public.games where home_team_id=current_id or away_team_id=current_id) then
    raise exception 'O registro reserve de Real Sociedad B tem jogo vinculado.';
  end if;
  delete from public.teams where id=current_id;
  update public.teams
  set squad_type='reserve', import_key='canalmix:v1:ESP:men:reserve:real-sociedad-b'
  where id=old_id;

  -- A second pre-existing Hoffenheim II spelling had no game links.
  select id into stale_id from public.teams
  where country_code='DEU' and team_type='club' and gender='men' and squad_type='reserve'
    and name='TSG 1899 Hoffenheim II';
  if stale_id is not null then
    if exists(select 1 from public.games where home_team_id=stale_id or away_team_id=stale_id) then
      raise exception 'TSG 1899 Hoffenheim II ainda tem jogo vinculado.';
    end if;
    update public.teams survivor
    set name_aliases = array(
      select distinct alias_name
      from unnest(coalesce(survivor.name_aliases, '{}'::text[]) || array['TSG 1899 Hoffenheim II']) as aliases(alias_name)
      where btrim(alias_name) <> '' and alias_name <> survivor.name
      order by alias_name
    )
    where survivor.country_code='DEU' and survivor.name='1899 Hoffenheim II' and survivor.squad_type='reserve';
    delete from public.teams where id=stale_id;
  end if;

  -- Event-specific suffix rows are not distinct teams and have no games.
  for stale_id in
    select id from public.teams
    where (country_code='ENG' and ((name like 'Barnsley FC%[postponed]%') or (name like 'Cardiff City%[postponed]%')))
       or (country_code='FRA' and name like 'Stade Lavallois%[postponed]%')
  loop
    if exists(select 1 from public.games where home_team_id=stale_id or away_team_id=stale_id) then
      raise exception 'Registro de partida adiada % ainda tem jogo vinculado.', stale_id;
    end if;
    delete from public.teams where id=stale_id;
  end loop;
end $$;
