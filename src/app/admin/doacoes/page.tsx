import { AdminDonationsManager } from "@/components/admin-donations-manager";
import { AdminShell } from "@/components/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { getAdminReportedIssues } from "@/lib/channels";
import { formatPixAmount } from "@/lib/pix";

export const dynamic = "force-dynamic";

export default async function AdminPixDonationsPage() {
  const { supabase } = await requireAdminPage();
  const [settingsResult, issues] = await Promise.all([
    supabase
      .from("pix_donation_settings")
      .select("pix_key, receiver_name, is_active, preset_amount_1_cents, preset_amount_2_cents, preset_amount_3_cents")
      .eq("id", true)
      .maybeSingle(),
    getAdminReportedIssues(),
  ]);
  const pendingIssues = issues.groups.reduce((total, group) => total + group.pendingCount, 0);
  const settings = settingsResult.data ? {
    pixKey: settingsResult.data.pix_key,
    receiverName: settingsResult.data.receiver_name,
    isActive: settingsResult.data.is_active,
    presetAmounts: [
      formatPixAmount(settingsResult.data.preset_amount_1_cents).replace(".", ","),
      formatPixAmount(settingsResult.data.preset_amount_2_cents).replace(".", ","),
      formatPixAmount(settingsResult.data.preset_amount_3_cents).replace(".", ","),
    ] as [string, string, string],
  } : null;

  return (
    <AdminShell pendingIssues={pendingIssues}>
      <section className="admin-list-panel admin-list-panel--compact">
        <header className="admin-list-panel__heading">
          <div>
            <p className="eyebrow">Apoio voluntário ao CanalMix</p>
            <h2>Doações Pix</h2>
          </div>
        </header>
        {settings ? (
          <AdminDonationsManager initialSettings={settings} />
        ) : (
          <p className="setup-notice" role="status">
            Não foi possível carregar as configurações Pix. Verifique as migrations do Supabase local.
          </p>
        )}
      </section>
    </AdminShell>
  );
}
