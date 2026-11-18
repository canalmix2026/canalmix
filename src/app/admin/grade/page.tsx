import { AdminGamesManager } from "@/components/admin-games-manager";
import { AdminShell } from "@/components/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { getAdminCatalog, getAdminReportedIssues } from "@/lib/channels";
import { getAdminGameSchedule } from "@/lib/games";
import { getGameCountries } from "@/lib/game-countries";
import { getAdminTeams } from "@/lib/teams";

export const dynamic = "force-dynamic";

export default async function AdminGamesPage() {
  await requireAdminPage();
  const [catalog, games, issues, teams] = await Promise.all([
    getAdminCatalog(),
    getAdminGameSchedule(),
    getAdminReportedIssues(),
    getAdminTeams(),
  ]);
  const pendingIssues = issues.groups.reduce((total, group) => total + group.pendingCount, 0);

  return (
    <AdminShell pendingIssues={pendingIssues}>
      {catalog.status === "ready" && games.status === "ready" && teams.status === "ready" ? (
        <AdminGamesManager channels={catalog.channels} countries={getGameCountries()} games={games.games} teams={teams.teams} />
      ) : (
        <section className="admin-list-panel" role="status">
          <p>Não foi possível carregar a grade local. Verifique as migrations do Supabase.</p>
        </section>
      )}
    </AdminShell>
  );
}
