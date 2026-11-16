import { AdminReportedIssues } from "@/components/admin-reported-issues";
import { AdminShell } from "@/components/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { getAdminReportedIssues } from "@/lib/channels";

export const dynamic = "force-dynamic";

export default async function AdminReportedProblemsPage() {
  await requireAdminPage();
  const issues = await getAdminReportedIssues();
  const pendingIssues = issues.groups.reduce((total, group) => total + group.pendingCount, 0);

  return (
    <AdminShell pendingIssues={pendingIssues}>
      <section className="admin-list-panel admin-list-panel--compact">
        <header className="admin-list-panel__heading">
          <div>
            <p className="eyebrow">Acompanhamento do catálogo</p>
            <h2>Problemas Reportados</h2>
          </div>
        </header>
        <AdminReportedIssues groups={issues.groups} status={issues.status} />
      </section>
    </AdminShell>
  );
}
