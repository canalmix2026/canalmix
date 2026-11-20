"use client";

import { useEffect, useState } from "react";
import { Activity, Clock3, Monitor, Smartphone, Tablet, Tv } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OnlineVisitorSessionRow } from "@/lib/supabase/database.types";
import {
  formatOnlineVisitorActivity,
  formatOnlineVisitorDuration,
  getOnlineVisitorPageLabel,
  isOnlineVisitorActive,
  ONLINE_VISITOR_DEVICE_LABELS,
  ONLINE_VISITOR_TIMEOUT_MS,
} from "@/lib/online-visitors";

type ConnectionState = "loading" | "connected" | "reconnecting" | "error";

function useOnlineVisitorSessions() {
  const [sessions, setSessions] = useState<OnlineVisitorSessionRow[] | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("loading");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let stopped = false;
    let connecting = false;
    let removingChannel = false;
    let hasLoadedSessions = false;
    let retryTimer: number | undefined;
    let retryAttempt = 0;
    let channel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | null = null;
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;

    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      setConnection("error");
      return;
    }

    const loadSessions = async () => {
      const cutoff = new Date(Date.now() - ONLINE_VISITOR_TIMEOUT_MS).toISOString();
      const { data, error } = await supabase
        .from("online_visitor_sessions")
        .select(
          "session_id, device_type, page_key, category_slug, channel_name, selected_option, started_at, last_activity_at",
        )
        .gte("last_activity_at", cutoff)
        .order("started_at", { ascending: false });

      if (error) throw error;
      if (!stopped) {
        hasLoadedSessions = true;
        setSessions(data ?? []);
      }
    };

    const scheduleReconnect = () => {
      if (stopped || retryTimer !== undefined) return;
      setConnection(hasLoadedSessions ? "reconnecting" : "error");
      const delay = Math.min(30_000, 1_500 * 2 ** Math.min(retryAttempt, 5));
      retryAttempt += 1;
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        void connect();
      }, delay);
    };

    const handleChange = (payload: {
      eventType: string;
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }) => {
      if (payload.eventType === "DELETE") {
        const sessionId = payload.old.session_id;
        if (typeof sessionId === "string") {
          setSessions((current) => current?.filter((session) => session.session_id !== sessionId) ?? null);
        }
        return;
      }

      const session = payload.new as unknown as OnlineVisitorSessionRow;
      if (!session.session_id) return;
      setSessions((current) => {
        const remaining = current?.filter((item) => item.session_id !== session.session_id) ?? [];
        return [...remaining, session].sort(
          (left, right) => Date.parse(right.started_at) - Date.parse(left.started_at),
        );
      });
    };

    async function connect() {
      if (stopped || connecting) return;
      connecting = true;
      setConnection(hasLoadedSessions ? "reconnecting" : "loading");

      try {
        if (channel) {
          const previousChannel = channel;
          channel = null;
          removingChannel = true;
          await supabase.removeChannel(previousChannel);
          removingChannel = false;
        }

        await loadSessions();
        if (stopped) return;

        channel = supabase
          .channel("admin-online-visitor-sessions")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "online_visitor_sessions" },
            handleChange,
          )
          .subscribe((status) => {
            if (stopped || removingChannel) return;
            if (status === "SUBSCRIBED") {
              retryAttempt = 0;
              if (retryTimer !== undefined) {
                window.clearTimeout(retryTimer);
                retryTimer = undefined;
              }
              setConnection("connected");
              void loadSessions().catch(scheduleReconnect);
            } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
              scheduleReconnect();
            }
          });
      } catch {
        scheduleReconnect();
      } finally {
        connecting = false;
      }
    }

    void connect();
    const clockInterval = window.setInterval(() => setNow(Date.now()), 1_000);

    return () => {
      stopped = true;
      window.clearInterval(clockInterval);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      if (channel) void supabase.removeChannel(channel);
    };
    // Supabase client and subscription live for the lifetime of this monitor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSessions = (sessions ?? [])
    .filter((session) => isOnlineVisitorActive(session, now))
    .sort((left, right) => Date.parse(right.started_at) - Date.parse(left.started_at));

  return { activeSessions, connection, now, sessionsLoaded: sessions !== null };
}

export function AdminOnlineVisitorCounter() {
  const { activeSessions, sessionsLoaded } = useOnlineVisitorSessions();

  return (
    <p aria-live="polite" className="admin-online-counter" role="status">
      <Activity aria-hidden="true" size={18} />
      <span>Usuários online agora: {sessionsLoaded ? activeSessions.length : "—"}</span>
    </p>
  );
}

function DeviceIcon({ device }: { device: OnlineVisitorSessionRow["device_type"] }) {
  const Icon = device === "mobile"
    ? Smartphone
    : device === "tablet"
      ? Tablet
      : device === "tv"
        ? Tv
        : Monitor;
  return <Icon aria-hidden="true" size={20} />;
}

function formatRecentActivity(timestamp: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(timestamp)) / 1000));
  if (seconds < 60) return `há ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.floor(minutes / 60)} h`;
}

export function AdminOnlineVisitors() {
  const { activeSessions, connection, now, sessionsLoaded } = useOnlineVisitorSessions();

  return (
    <section className="admin-list-panel admin-list-panel--compact admin-online-visitors">
      <header className="admin-list-panel__heading">
        <div>
          <p className="eyebrow">Presença no site</p>
          <h2>Usuários online</h2>
        </div>
        <p aria-live="polite" className={`admin-online-visitors__connection is-${connection}`} role="status">
          <span aria-hidden="true" className="admin-online-visitors__connection-dot" />
          <strong className="admin-online-visitors__count">
            {sessionsLoaded ? activeSessions.length : "—"} online
          </strong>
          <span className="admin-online-visitors__connection-label">
            {connection === "connected"
              ? "Atualizando em tempo real"
              : connection === "loading"
                ? "Conectando…"
                : "Conexão instável; tentando reconectar"}
          </span>
        </p>
      </header>

      <p className="admin-online-visitors__estimate">
        O contador representa uma estimativa de sessões ativas. Uma mesma pessoa pode aparecer em mais de um dispositivo.
      </p>

      {!sessionsLoaded && connection !== "loading" && (
        <p className="admin-online-visitors__message is-error" role="alert">
          Não foi possível carregar as sessões online. A conexão será tentada novamente automaticamente.
        </p>
      )}

      {!sessionsLoaded && connection === "loading" && (
        <p className="admin-online-visitors__message" role="status">Carregando sessões ativas…</p>
      )}

      {sessionsLoaded && activeSessions.length === 0 && (
        <p className="admin-online-visitors__empty" role="status">
          Nenhuma sessão ativa no momento.
        </p>
      )}

      {activeSessions.length > 0 && (
        <div aria-label="Sessões ativas no site" className="admin-online-visitors__grid">
          {activeSessions.map((session) => (
            <article className="admin-online-visitor" key={session.session_id}>
              <header className="admin-online-visitor__heading">
                <span className="admin-online-visitor__device">
                  <DeviceIcon device={session.device_type} />
                  <span>{ONLINE_VISITOR_DEVICE_LABELS[session.device_type]}</span>
                </span>
                <span className="admin-online-visitor__badge">
                  Visitante {session.session_id.replaceAll("-", "").slice(-4).toUpperCase()}
                </span>
              </header>
              <dl className="admin-online-visitor__details">
                <div>
                  <dt>Página ou categoria</dt>
                  <dd>{getOnlineVisitorPageLabel(session)}</dd>
                </div>
                {session.channel_name && (
                  <div>
                    <dt>Canal</dt>
                    <dd>
                      {session.channel_name}
                      {session.selected_option ? ` · Opção ${session.selected_option}` : ""}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Tempo conectado</dt>
                  <dd>{formatOnlineVisitorDuration(session.started_at, now)}</dd>
                </div>
                <div>
                  <dt>Última atividade</dt>
                  <dd>
                    <Clock3 aria-hidden="true" size={15} />
                    <span>às {formatOnlineVisitorActivity(session.last_activity_at)}</span>
                    <small>{formatRecentActivity(session.last_activity_at, now)}</small>
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
