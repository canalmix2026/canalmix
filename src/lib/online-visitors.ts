import type { OnlineVisitorSessionRow } from "@/lib/supabase/database.types";

export const ONLINE_VISITOR_TIMEOUT_MS = 75_000;

export const ONLINE_VISITOR_DEVICE_LABELS: Record<
  OnlineVisitorSessionRow["device_type"],
  string
> = {
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Computador",
  tv: "TV",
};

const PAGE_LABELS: Record<OnlineVisitorSessionRow["page_key"], string> = {
  home: "Início",
  tv: "Modo TV",
  schedule: "Grade de jogos",
  channel: "Canal",
  privacy: "Política de Privacidade",
  other: "Outra página",
};

export function getOnlineVisitorPageLabel(session: OnlineVisitorSessionRow) {
  if (session.category_slug) {
    return `Categoria: ${session.category_slug.replaceAll("-", " ")}`;
  }
  return PAGE_LABELS[session.page_key];
}

export function isOnlineVisitorActive(session: OnlineVisitorSessionRow, now: number) {
  const lastActivity = Date.parse(session.last_activity_at);
  return Number.isFinite(lastActivity) && now - lastActivity < ONLINE_VISITOR_TIMEOUT_MS;
}

export function formatOnlineVisitorDuration(startedAt: string, now: number) {
  const started = Date.parse(startedAt);
  const seconds = Math.max(0, Math.floor((now - started) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours} h ${String(minutes).padStart(2, "0")} min`;
  }
  if (minutes > 0) {
    return `${minutes} min ${String(remainingSeconds).padStart(2, "0")} s`;
  }
  return `${remainingSeconds} s`;
}

export function formatOnlineVisitorActivity(timestamp: string) {
  const value = new Date(timestamp);
  if (!Number.isFinite(value.getTime())) {
    return "Horário indisponível";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}
