import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { BrandLogo } from "@/components/brand-logo";
import { logoutAdminAction } from "@/app/admin/actions";
import { getAdminCatalog } from "@/lib/channels";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminChannelsPage() {
  if (!getSupabaseConfig()) {
    return (
      <main className="admin-gate">
        <BrandLogo />
        <h1>Supabase não configurado</h1>
        <p>Configure as variáveis do Supabase neste ambiente para abrir o painel.</p>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/admin/login");
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    redirect("/admin/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("catalog_admins")
    .select("user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    redirect("/admin/login?erro=permissao");
  }

  const catalog = await getAdminCatalog();

  return (
    <main className="admin-page">
      <header className="admin-header">
        <BrandLogo />
        <span className="admin-header__divider" />
        <h1>Painel administrativo</h1>
        <form action={logoutAdminAction}>
          <button
            className="admin-header__logout"
            type="submit"
          >
            Sair
          </button>
        </form>
      </header>
      {catalog.status === "ready" ? (
        <AdminPanel channels={catalog.channels} categories={catalog.categories} />
      ) : (
        <p className="setup-notice" role="status">
          Não foi possível carregar os canais. Verifique as migrations e o Supabase.
        </p>
      )}
    </main>
  );
}
