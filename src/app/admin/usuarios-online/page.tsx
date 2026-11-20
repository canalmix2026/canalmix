import { AdminOnlineVisitors } from "@/components/admin-online-visitors";
import { AdminShell } from "@/components/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { getAdminReportedIssues } from "@/lib/channels";

export const dynamic = "force-dynamic";

export default async function AdminOnlineVisitorsPage() {
  await requireAdminPage();
  const issues = await getAdminReportedIssues();
  const pendingIssues = issues.groups.reduce((total, group) => total + group.pendingCount, 0);

  return (
    <AdminShell pendingIssues={pendingIssues}>
      <AdminOnlineVisitors />
    </AdminShell>
  );
}
