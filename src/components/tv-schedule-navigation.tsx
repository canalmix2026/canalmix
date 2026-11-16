"use client";

import type { KeyboardEvent, ReactNode } from "react";

export function TvScheduleNavigation({
  children,
  className,
  enabled,
}: {
  children: ReactNode;
  className: string;
  enabled: boolean;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!enabled || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const active = (event.target as HTMLElement).closest<HTMLElement>("[data-tv-schedule-item]");
    if (!active) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("[data-tv-schedule-item]"),
    ).filter((item) => item.getClientRects().length > 0 && !item.hasAttribute("disabled"));
    const rect = active.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!direction) return;
    const [dx, dy] = direction;
    const next = items
      .filter((item) => item !== active)
      .map((item) => {
        const candidate = item.getBoundingClientRect();
        const deltaX = candidate.left + candidate.width / 2 - x;
        const deltaY = candidate.top + candidate.height / 2 - y;
        const forward = dx ? deltaX * dx : deltaY * dy;
        const cross = dx ? Math.abs(deltaY) : Math.abs(deltaX);
        return { item, score: forward > 0 ? forward + cross * 1.7 : Number.POSITIVE_INFINITY };
      })
      .filter((candidate) => Number.isFinite(candidate.score))
      .sort((a, b) => a.score - b.score)[0]?.item;
    if (next) {
      event.preventDefault();
      next.focus({ preventScroll: false });
    }
  }

  return <main className={className} onKeyDown={handleKeyDown}>{children}</main>;
}
