import { AdminShell } from "@/components/admin-shell";
import { AdminTeamsManager } from "@/components/admin-teams-manager";
import { requireAdminPage } from "@/lib/admin-auth";
import { getAdminReportedIssues } from "@/lib/channels";
import { getAdminTeams } from "@/lib/teams";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  await requireAdminPage();
  const [teams, issues] = await Promise.all([
    getAdminTeams(),
    getAdminReportedIssues(),
  ]);
  const pendingIssues = issues.groups.reduce((total, group) => total + group.pendingCount, 0);

  return (
    <AdminShell pendingIssues={pendingIssues}>
      {teams.status === "ready" ? (
        <AdminTeamsManager teams={teams.teams} />
      ) : (
        <section className="admin-list-panel" role="status">
          <p>Não foi possível carregar os times. Verifique as migrations do Supabase local.</p>
        </section>
      )}
    </AdminShell>
  );
}
