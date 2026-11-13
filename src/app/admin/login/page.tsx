import { BrandLogo } from "@/components/brand-logo";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ erro?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const configured = getSupabaseConfig() !== null;
  const params = await searchParams;

  return (
    <main className="admin-login">
      <div className="admin-login__card">
        <BrandLogo />
        <p className="admin-login__eyebrow">Painel administrativo</p>
        <h1>Entrar</h1>
        <p className="admin-login__lead">
          Acesse com a conta de administrador configurada no Supabase.
        </p>
        {configured ? (
          <AdminLoginForm accessDenied={params.erro === "permissao"} />
        ) : (
          <div className="setup-notice" role="status">
            Configure o Supabase neste ambiente para habilitar o login.
          </div>
        )}
        <p className="admin-login__no-signup">
          O painel não permite criar contas de administrador.
        </p>
      </div>
    </main>
  );
}
