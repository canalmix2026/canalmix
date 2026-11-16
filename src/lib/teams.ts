import "server-only";
import type { TeamRow } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TeamScheduleData = {
  id: string;
  name: string;
  officialName: string;
  countryCode: string | null;
  countryName: string | null;
  teamType: TeamRow["team_type"];
  gender: TeamRow["gender"];
  squadType: TeamRow["squad_type"];
  externalProvider: string | null;
  externalId: string | null;
  importKey: string | null;
  nameAliases: string[];
  shieldUrl: string | null;
  shieldStatus: TeamRow["shield_status"];
  shieldSourceUrl: string | null;
  shieldLicense: string | null;
  sourceDataName: string | null;
  sourceDataUrl: string | null;
  sourceDataLicense: string | null;
  sourceCompetitionKey: string | null;
  sourceSeasonYear: number | null;
  nameIsManual: boolean;
  catalogNote: string | null;
};

export type TeamScheduleResult = {
  teams: TeamScheduleData[];
  status: "ready" | "not-configured" | "unavailable";
};

function mapTeam(row: TeamRow): TeamScheduleData {
  return {
    id: row.id,
    name: row.name,
    officialName: row.official_name,
    countryCode: row.country_code,
    countryName: row.country_name,
    teamType: row.team_type,
    gender: row.gender,
    squadType: row.squad_type,
    externalProvider: row.external_provider,
    externalId: row.external_id,
    importKey: row.import_key,
    nameAliases: row.name_aliases,
    shieldUrl: row.shield_url,
    shieldStatus: row.shield_status,
    shieldSourceUrl: row.shield_source_url,
    shieldLicense: row.shield_license,
    sourceDataName: row.source_data_name,
    sourceDataUrl: row.source_data_url,
    sourceDataLicense: row.source_data_license,
    sourceCompetitionKey: row.source_competition_key,
    sourceSeasonYear: row.source_season_year,
    nameIsManual: row.name_is_manual,
    catalogNote: row.catalog_note,
  };
}

export async function getAdminTeams(): Promise<TeamScheduleResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { teams: [], status: "not-configured" };

  try {
    const rows: TeamRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name", { ascending: true })
        .range(offset, offset + 499);
      if (error) return { teams: [], status: "unavailable" };
      rows.push(...((data ?? []) as TeamRow[]));
      if (!data || data.length < 500) break;
    }
    return { teams: rows.map(mapTeam), status: "ready" };
  } catch {
    return { teams: [], status: "unavailable" };
  }
}
