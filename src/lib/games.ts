import "server-only";
import type {
  GameBroadcastRow,
  GameRow,
  TeamRow,
} from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type GameBroadcastData = {
  id: string;
  countryCode: string;
  countryName: string;
  broadcasterName: string;
  channelId: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type GameScheduleData = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamShieldUrl: string | null;
  awayTeamShieldUrl: string | null;
  competitionName: string;
  competitionCountryCode: string;
  competitionCountryName: string;
  startsAt: string;
  externalProvider: string | null;
  externalId: string | null;
  sourceUrls: string[];
  isPublished: boolean;
  publishedAt: string | null;
  broadcasts: GameBroadcastData[];
};

export type GameScheduleResult = {
  games: GameScheduleData[];
  status: "ready" | "not-configured" | "unavailable";
};

function mapGameRows(
  games: GameRow[],
  broadcasts: GameBroadcastRow[],
  teams: TeamRow[],
) {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const broadcastsByGame = new Map<string, GameBroadcastData[]>();
  for (const broadcast of broadcasts) {
    const rows = broadcastsByGame.get(broadcast.game_id) ?? [];
    rows.push({
      id: broadcast.id,
      countryCode: broadcast.country_code,
      countryName: broadcast.country_name,
      broadcasterName: broadcast.broadcaster_name,
      channelId: broadcast.channel_id,
      sortOrder: broadcast.sort_order,
      isPrimary: broadcast.is_primary,
    });
    broadcastsByGame.set(broadcast.game_id, rows);
  }

  return games.map((game) => ({
    id: game.id,
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    homeTeamId: game.home_team_id,
    awayTeamId: game.away_team_id,
    homeTeamShieldUrl: game.home_team_id
      ? teamsById.get(game.home_team_id)?.shield_url ?? null
      : null,
    awayTeamShieldUrl: game.away_team_id
      ? teamsById.get(game.away_team_id)?.shield_url ?? null
      : null,
    competitionName: game.competition_name,
    competitionCountryCode: game.competition_country_code,
    competitionCountryName: game.competition_country_name,
    startsAt: game.starts_at,
    externalProvider: game.external_provider,
    externalId: game.external_id,
    sourceUrls: game.source_urls,
    isPublished: game.is_published,
    publishedAt: game.published_at,
    broadcasts: (broadcastsByGame.get(game.id) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    ),
  }));
}

async function loadGames(
  mode: "public" | "admin",
): Promise<GameScheduleResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { games: [], status: "not-configured" };
  }

  try {
    let gameQuery = supabase
      .from("games")
      .select("*")
      .order("starts_at", { ascending: true });
    if (mode === "public") {
      gameQuery = gameQuery
        .eq("is_published", true)
        .gte("starts_at", new Date().toISOString());
    }

    const { data: gameData, error: gameError } = await gameQuery;
    if (gameError) {
      return { games: [], status: "unavailable" };
    }
    const games = (gameData ?? []) as GameRow[];
    if (games.length === 0) {
      return { games: [], status: "ready" };
    }

    const { data: broadcastData, error: broadcastError } = await supabase
      .from("game_broadcasts")
      .select("*")
      .in("game_id", games.map((game) => game.id))
      .order("sort_order", { ascending: true });
    if (broadcastError) {
      return { games: [], status: "unavailable" };
    }

    const teamIds = [...new Set(games.flatMap((game) =>
      [game.home_team_id, game.away_team_id].filter((id): id is string => Boolean(id)),
    ))];
    const teamResult = teamIds.length
      ? await supabase.from("teams").select("*").in("id", teamIds)
      : { data: [], error: null };
    if (teamResult.error) {
      return { games: [], status: "unavailable" };
    }

    return {
      games: mapGameRows(
        games,
        (broadcastData ?? []) as GameBroadcastRow[],
        (teamResult.data ?? []) as TeamRow[],
      ),
      status: "ready",
    };
  } catch {
    return { games: [], status: "unavailable" };
  }
}

export function getPublishedGameSchedule(): Promise<GameScheduleResult> {
  return loadGames("public");
}

export function getAdminGameSchedule(): Promise<GameScheduleResult> {
  return loadGames("admin");
}
