import Link from "next/link";
import { Play } from "lucide-react";

type BrandLogoProps = {
  href?: string;
  compact?: boolean;
};

export function BrandLogo({ href = "/", compact = false }: BrandLogoProps) {
  return (
    <Link className={"brand" + (compact ? " brand--compact" : "")} href={href}>
      <span className="brand__symbol" aria-hidden="true">
        <span className="brand__screen brand__screen--back" />
        <span className="brand__screen brand__screen--front">
          <Play size={22} fill="currentColor" strokeWidth={1.5} />
        </span>
      </span>
      <span className="brand__wordmark">
        Canal<span>Mix</span>
      </span>
    </Link>
  );
}
