"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink } from "lucide-react";
import { resolveStreamIssueSourceAction } from "@/app/admin/actions";
import type { StreamIssueOptionGroup } from "@/lib/channels";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function AdminReportedIssues({
  groups,
  status,
}: {
  groups: StreamIssueOptionGroup[];
  status: "ready" | "not-configured" | "unavailable";
}) {
  const router = useRouter();
  const [pendingSource, setPendingSource] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"pending" | "resolved">("pending");
  const pendingTotal = groups.reduce((total, group) => total + group.pendingCount, 0);
  const resolvedTotal = groups.reduce((total, group) => total + group.resolvedCount, 0);
  const channels = new Map<string, { name: string; groups: StreamIssueOptionGroup[] }>();

  for (const group of groups) {
    const channel = channels.get(group.channelId) ?? {
      name: group.channelName,
      groups: [],
    };
    channel.groups.push(group);
    channels.set(group.channelId, channel);
  }

  async function resolve(group: StreamIssueOptionGroup) {
    const key = group.channelId + ":" + group.sourceId;
    setPendingSource(key);
    setMessage("");
    const result = await resolveStreamIssueSourceAction(
      group.channelId,
      group.sourceId,
    );
    setPendingSource(null);
    setMessage(result.message);
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <section aria-labelledby="reported-issues-title" className="admin-problems-panel">
      <header className="admin-problems-panel__heading">
        <h2 id="reported-issues-title">Problemas reportados</h2>
        <span className="admin-problems-panel__total">
          {pendingTotal} pendências
        </span>
      </header>

      {message && (
        <p className="admin-feedback" role="status">
          {message}
        </p>
      )}

      <div aria-label="Filtrar problemas" className="admin-problems-panel__filters" role="group">
        <button
          aria-pressed={filter === "pending"}
          className={filter === "pending" ? "is-active" : ""}
          onClick={() => setFilter("pending")}
          type="button"
        >
          Pendentes <span>{pendingTotal}</span>
        </button>
        <button
          aria-pressed={filter === "resolved"}
          className={filter === "resolved" ? "is-active" : ""}
          onClick={() => setFilter("resolved")}
          type="button"
        >
          Resolvidos <span>{resolvedTotal}</span>
        </button>
      </div>

      {status !== "ready" ? (
        <p className="admin-problems-panel__empty" role="status">
          Não foi possível carregar os relatos. Confira se a migração local foi aplicada.
        </p>
      ) : groups.every((group) => filter === "pending" ? group.pendingCount === 0 : group.resolvedCount === 0) ? (
        <p className="admin-problems-panel__empty">
          {filter === "pending" ? "Nenhum problema pendente." : "Nenhum problema resolvido."}
        </p>
      ) : (
        [...channels.entries()].map(([channelId, channel]) => (
          <section
            className="admin-problem-channel"
            key={channelId}
            hidden={channel.groups.every((group) => filter === "pending" ? group.pendingCount === 0 : group.resolvedCount === 0)}
          >
            <h3>{channel.name}</h3>
            {channel.groups.filter((group) => filter === "pending" ? group.pendingCount > 0 : group.resolvedCount > 0).map((group) => {
              const key = group.channelId + ":" + group.sourceId;
              const sourceHost = (() => {
                try { return new URL(group.sourceUrl).host; } catch { return "Fonte reportada"; }
              })();
              return (
                <article className="admin-problem-option" key={key}>
                  <div className="admin-problem-option__summary">
                    <div>
                      <h4>{group.sourceLabel}</h4>
                      <p>
                        {group.pendingCount} {group.pendingCount === 1 ? "relato pendente" : "relatos pendentes"}
                        {" · "}{group.resolvedCount} {group.resolvedCount === 1 ? "resolvido" : "resolvidos"}
                        {" · "}último relato em {formatDate(group.latestAt)}
                      </p>
                      <p>Fonte: {sourceHost}</p>
                    </div>
                    <div className="admin-problem-option__actions">
                      <a
                        className="secondary-button"
                        href={group.sourceUrl}
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        <ExternalLink aria-hidden="true" size={16} />
                        Testar opção
                      </a>
                    {group.pendingCount > 0 && (
                      <button
                        className="secondary-button"
                        disabled={pendingSource === key}
                        onClick={() => void resolve(group)}
                        type="button"
                      >
                        <Check aria-hidden="true" size={16} />
                        {pendingSource === key ? "Salvando…" : "Marcar como resolvido"}
                      </button>
                    )}
                    </div>
                  </div>
                  <ol aria-label={"Histórico de " + group.sourceLabel} className="admin-problem-history">
                    {group.history.map((entry) => (
                      <li key={entry.reportId}>
                        {formatDate(entry.createdAt)} · {entry.sourceLabel} · {entry.status === "pending" ? "Pendente" : "Resolvido"}
                        {entry.resolvedAt ? " em " + formatDate(entry.resolvedAt) : ""}
                        {" · Protocolo CM-" + entry.reportId.replaceAll("-", "").slice(0, 10).toUpperCase()}
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </section>
        ))
      )}
    </section>
  );
}
