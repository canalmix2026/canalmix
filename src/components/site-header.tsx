import Link from "next/link";
import { ArrowLeft, Tv2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { PublicInspectionShortcutGuard } from "@/components/public-inspection-shortcut-guard";

export function SiteHeader({ tv = false }: { tv?: boolean }) {
  return (
    <>
      <PublicInspectionShortcutGuard />
      <header className="site-header">
        <div className="site-header__inner">
          <BrandLogo href={tv ? "/tv" : "/"} />
          <p className="site-header__tagline">Canais da internet em um só lugar.</p>
          {tv ? (
            <Link className="mode-button mode-button--active" href="/">
              <ArrowLeft aria-hidden="true" size={18} />
              <span>Sair do Modo TV</span>
            </Link>
          ) : (
            <Link className="mode-button" href="/tv">
              <Tv2 aria-hidden="true" size={18} />
              <span>Modo TV</span>
            </Link>
          )}
        </div>
      </header>
    </>
  );
}
