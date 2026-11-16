-- Local-only cleanup for Brazilian team aliases discovered during the
-- 2026 CBF import. Run only against the CanalMix local Supabase stack.
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
begin
  for pair in
    select * from (values
      ('CA Mineiro', 'Atlético Mineiro'),
      ('CA Paranaense', 'Athletico Paranaense - PR'),
      ('Chapecoense AF', 'Chapecoense - SC'),
      ('Clube do Remo', 'Remo - PA'),
      ('Coritiba FBC', 'Coritiba SAF - PR'),
      ('CR Flamengo', 'Flamengo - RJ'),
      ('CR Vasco da Gama', 'Vasco da Gama Saf - RJ'),
      ('Cruzeiro EC', 'Cruzeiro - MG'),
      ('EC Bahia', 'Bahia - BA'),
      ('EC Vitória', 'Vitória - BA'),
      ('Fluminense FC', 'Fluminense - RJ'),
      ('Grêmio FBPA', 'Grêmio - RS'),
      ('Mirassol FC', 'Mirassol - SP'),
      ('RB Bragantino', 'Red Bull Bragantino - SP'),
      ('São Paulo FC', 'São Paulo - SP'),
      ('SC Corinthians Paulista', 'Corinthians - SP'),
      ('SC Internacional', 'Internacional - RS'),
      ('SE Palmeiras', 'Palmeiras - SP'),
      ('Amazonas FC', 'Amazonas SAF - AM'),
      ('Athletic MG', 'Athletic SAF - MG'),
      ('Atlético Goianiense', 'Atlético Goianiense Saf - GO'),
      ('CR Brasil AL', 'CRB - AL'),
      ('Grêmio Novorizontino SP', 'Gremio Novorizontino - Saf - SP'),
      ('Operário Ferroviário PR', 'Operário - PR'),
      ('Barra', 'Barra Futebol Clube - SC'),
      ('Botafogo PB', 'Botafogo Pb Saf - PB'),
      ('Fortaleza EC', 'Fortaleza SAF - CE'),
      ('Ituano', 'ITUANO FC SAF - SP'),
      ('Juventude EC', 'Juventude - RS'),
      ('Londrina', 'Londrina SAF - PR'),
      ('Maringá', 'Maringá FC SAF - PR'),
      ('São Bernardo FC', 'São Bernardo SAF - SP'),
      ('SC Sport Recife', 'Sport Recife - PE')
    ) as names(old_name, current_name)
  loop
    select id, name_is_manual into old_id, old_manual
    from public.teams
    where country_code = 'BRA' and team_type = 'club' and gender = 'men'
      and squad_type = 'first' and name = pair.old_name;
    if not found then raise exception 'Registro original ausente: %', pair.old_name; end if;

    select id, name_is_manual into current_id, current_manual
    from public.teams
    where country_code = 'BRA' and team_type = 'club' and gender = 'men'
      and squad_type = 'first' and name = pair.current_name;
    if not found then raise exception 'Registro CBF ausente: %', pair.current_name; end if;
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
      raise exception 'O registro duplicado % ainda tem jogos; nenhuma alteração aplicada.', duplicate_id;
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
end $$;
