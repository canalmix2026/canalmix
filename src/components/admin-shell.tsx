import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminOnlineVisitorCounter } from "@/components/admin-online-visitors";
import { logoutAdminAction } from "@/app/admin/actions";

export function AdminShell({
  children,
  pendingIssues,
  showOnlineCounter = false,
}: {
  children: ReactNode;
  pendingIssues: number;
  showOnlineCounter?: boolean;
}) {
  return (
    <main className="admin-page">
      <header className="admin-header">
        <BrandLogo />
        <span aria-hidden="true" className="admin-header__divider" />
        <h1>Painel administrativo</h1>
        <form action={logoutAdminAction}>
          <button className="admin-header__logout" type="submit">Sair</button>
        </form>
      </header>
      <div className="admin-shell-layout">
        <AdminSidebar pendingIssues={pendingIssues} />
        <div className="admin-shell-layout__content">
          {showOnlineCounter && <AdminOnlineVisitorCounter />}
          {children}
        </div>
      </div>
    </main>
  );
}
