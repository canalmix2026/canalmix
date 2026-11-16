import { AdminCategoriesManager } from "@/components/admin-categories-manager";
import { AdminShell } from "@/components/admin-shell";
import { getAdminCatalog, getAdminReportedIssues } from "@/lib/channels";
import { requireAdminPage } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminPage();
  const [catalog, issues] = await Promise.all([
    getAdminCatalog(),
    getAdminReportedIssues(),
  ]);
  const pendingIssues = issues.groups.reduce((total, group) => total + group.pendingCount, 0);

  return (
    <AdminShell pendingIssues={pendingIssues}>
      <section className="admin-list-panel admin-list-panel--compact">
        <header className="admin-list-panel__heading">
          <div>
            <p className="eyebrow">Organização do catálogo</p>
            <h2>Categorias</h2>
          </div>
        </header>
        {catalog.status === "ready" ? (
          <AdminCategoriesManager
            categories={catalog.categories}
            channels={catalog.channels}
          />
        ) : (
          <p className="setup-notice" role="status">
            Não foi possível carregar as categorias no Supabase local.
          </p>
        )}
      </section>
    </AdminShell>
  );
}
