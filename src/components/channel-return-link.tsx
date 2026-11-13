"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ChannelReturnLinkProps = {
  href: string;
  preferHistory: boolean;
  className: string;
  children: ReactNode;
};

export function ChannelReturnLink({
  href,
  preferHistory,
  className,
  children,
}: ChannelReturnLinkProps) {
  const router = useRouter();

  return (
    <Link
      className={className}
      href={href}
      onClick={(event) => {
        if (!preferHistory) {
          return;
        }

        event.preventDefault();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
