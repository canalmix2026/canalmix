"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ChannelReturnLinkProps = {
  href: string;
  preferHistory: boolean;
  className: string;
  dataTvScheduleItem?: boolean;
  children: ReactNode;
};

export function ChannelReturnLink({
  href,
  preferHistory,
  className,
  dataTvScheduleItem = false,
  children,
}: ChannelReturnLinkProps) {
  const router = useRouter();

  return (
    <Link
      className={className}
      data-tv-schedule-item={dataTvScheduleItem ? "" : undefined}
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
