import { AdminPanel } from "@/components/admin-panel";
import { AdminShell } from "@/components/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import {
  getAdminCatalog,
  getAdminReportedIssues,
} from "@/lib/channels";

export const dynamic = "force-dynamic";

export default async function AdminChannelsPage() {
  await requireAdminPage();
  const [catalog, reportedIssues] = await Promise.all([
    getAdminCatalog(),
    getAdminReportedIssues(),
  ]);
  const pendingIssueCounts: Record<string, number> = {};
  for (const issue of reportedIssues.groups) {
    pendingIssueCounts[issue.channelId] =
      (pendingIssueCounts[issue.channelId] ?? 0) + issue.pendingCount;
  }

  if (catalog.status !== "ready") {
    return (
      <AdminShell pendingIssues={Object.values(pendingIssueCounts).reduce((sum, count) => sum + count, 0)}>
        <p className="setup-notice" role="status">
          Não foi possível carregar os canais. Verifique as migrations e o Supabase local.
        </p>
      </AdminShell>
    );
  }

  return (
    <AdminShell pendingIssues={Object.values(pendingIssueCounts).reduce((sum, count) => sum + count, 0)}>
      <AdminPanel
        channels={catalog.channels}
        categories={catalog.categories}
        pendingIssueCounts={pendingIssueCounts}
      />
    </AdminShell>
  );
}
