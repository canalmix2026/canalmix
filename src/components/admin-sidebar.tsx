"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertCircle, CalendarDays, ChevronDown, Clapperboard, Shield, Tv } from "lucide-react";

const ADMIN_SECTIONS = [
  { href: "/admin/canais", label: "Canais", icon: Tv },
  { href: "/admin/categorias", label: "Categorias", icon: Clapperboard },
  { href: "/admin/grade", label: "Grade de jogos", icon: CalendarDays },
  { href: "/admin/times", label: "Times e escudos", icon: Shield },
  { href: "/admin/problemas", label: "Problemas Reportados", icon: AlertCircle },
];

export function AdminSidebar({ pendingIssues }: { pendingIssues: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <aside className={`admin-sidebar${open ? " is-open" : ""}`}>
      <button
        aria-expanded={open}
        aria-label={open ? "Recolher menu administrativo" : "Expandir menu administrativo"}
        className="admin-sidebar__toggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>Seções do painel</span>
        <ChevronDown aria-hidden="true" size={18} />
      </button>
      <nav aria-label="Seções administrativas" className="admin-sidebar__nav">
        {ADMIN_SECTIONS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`admin-sidebar__link${active ? " is-active" : ""}`}
              href={href}
              key={href}
              onClick={() => setOpen(false)}
            >
              <Icon aria-hidden="true" size={19} />
              <span>{label}</span>
              {href === "/admin/problemas" && pendingIssues > 0 && (
                <span aria-label={`${pendingIssues} pendências`} className="admin-sidebar__count">
                  {pendingIssues > 99 ? "99+" : pendingIssues}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
