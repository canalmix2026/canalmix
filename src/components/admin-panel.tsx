"use client";

/* eslint-disable @next/next/no-img-element -- Channel artwork is admin-managed at runtime and is intentionally loaded directly instead of through the Next image optimizer. */
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { sortCategories } from "@/lib/categories";
import type { AdminCategory } from "@/lib/categories";
import { isSafeHttpUrl, isSafeHttpsUrl } from "@/lib/channel-schema";
import { parseEmbedIframeCode } from "@/lib/embed-code";
import { EmbedFrame } from "@/components/embed-frame";
import { HlsVideoPlayer } from "@/components/hls-video-player";
import {
  EMBED_SOURCE_TYPE_LABELS,
  toChannelEmbedSourceDraft,
  type ChannelEmbedSourceDraft,
  type EmbedSourceType,
} from "@/lib/channel-embed-sources";
import type { ChannelCardData } from "@/lib/channels";
import type { EmbedReferrerPolicy } from "@/lib/embed-provider-policy-core";
import {
  deleteChannelAction,
  getAdminEmbedPreviewPolicyAction,
  saveChannelAction,
  setChannelPublishedAction,
  updateChannelSourceAction,
} from "@/app/admin/actions";

type AdminChannel = ChannelCardData;

function iframeCodeForUrl(url: string) {
  if (!url) return "";
  const escapedUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<iframe src="${escapedUrl}"></iframe>`;
}

function newEmbedDraft(): ChannelEmbedSourceDraft {
  return {
    id: crypto.randomUUID(),
    isNew: true,
    type: "iframe-url",
    active: true,
    url: "",
    iframeCode: "",
  };
}

function isHlsMediaUrl(value: string) {
  try {
    return new URL(value).pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

function ChannelForm({
  channel,
  categories,
  onClose,
  onSaved,
}: {
  channel: AdminChannel | null;
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(channel?.thumbnailUrl ?? "");
  const [embedSources, setEmbedSources] = useState<ChannelEmbedSourceDraft[]>(() =>
    channel?.embedSources.length
      ? channel.embedSources.map(toChannelEmbedSourceDraft)
      : [newEmbedDraft()],
  );
  const [draggedOption, setDraggedOption] = useState<number | null>(null);
  const [dropTargetOption, setDropTargetOption] = useState<number | null>(null);
  const [sourcePendingId, setSourcePendingId] = useState("");
  const [preview, setPreview] = useState<{
    source: ChannelEmbedSourceDraft;
    option: number;
    url: string;
    referrerPolicy: EmbedReferrerPolicy;
  } | null>(null);
  const [previewError, setPreviewError] = useState("");

  function updateOption(index: number, change: Partial<ChannelEmbedSourceDraft>) {
    setEmbedSources((current) => current.map((source, item) =>
      item === index ? { ...source, ...change } : source,
    ));
  }

  async function reorderOptions(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex || fromIndex < 0 || toIndex < 0 ||
      fromIndex >= embedSources.length || toIndex >= embedSources.length
    ) return;

    const sourceId = embedSources[fromIndex].id;
    const persistedIds = new Set(channel?.embedSources.map((source) => source.id) ?? []);
    if (channel && persistedIds.has(sourceId) && embedSources.every((source) => persistedIds.has(source.id))) {
      setSourcePendingId(sourceId);
      const step = toIndex < fromIndex ? -1 : 1;
      let currentIndex = fromIndex;
      while (currentIndex !== toIndex) {
        const result = await updateChannelSourceAction(
          channel.id,
          sourceId,
          step < 0 ? "move-up" : "move-down",
        );
        if (!result.success) {
          setSourcePendingId("");
          setMessage(result.message);
          setMessageIsError(true);
          router.refresh();
          return;
        }
        currentIndex += step;
      }
      setSourcePendingId("");
      router.refresh();
    }

    setEmbedSources((current) => moveItem(current, fromIndex, toIndex));
    setDraggedOption(null);
    setDropTargetOption(null);
  }

  async function setOptionVisibility(index: number, active: boolean) {
    const source = embedSources[index];
    const isPersisted = channel?.embedSources.some((item) => item.id === source.id) ?? false;
    if (!channel || !isPersisted) {
      updateOption(index, { active });
      return;
    }

    setSourcePendingId(source.id);
    const result = await updateChannelSourceAction(
      channel.id,
      source.id,
      active ? "reactivate" : "hide",
    );
    setSourcePendingId("");
    setMessage(result.message);
    setMessageIsError(!result.success);
    if (result.success) {
      updateOption(index, { active });
      router.refresh();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setMessageIsError(false);
    const result = await saveChannelAction(new FormData(event.currentTarget));
    setPending(false);
    setMessage(result.message);
    setMessageIsError(!result.success);
    if (result.success) onSaved();
  }

  async function openPreview(
    source: ChannelEmbedSourceDraft,
    url: string,
    option: number,
  ) {
    const normalizedUrl = url.trim();
    if (!isSafeHttpUrl(normalizedUrl)) {
      setPreviewError("Informe uma URL HTTP ou HTTPS válida na opção " + option + ".");
      setPreview(null);
      return;
    }

    setPreviewError("");
    setPreviewPending(true);
    try {
      const policy = await getAdminEmbedPreviewPolicyAction(normalizedUrl);
      if (!policy.success) {
        setPreviewError(policy.message);
        setPreview(null);
        return;
      }
      setPreview({ source: { ...source }, option, url: normalizedUrl, referrerPolicy: policy.referrerPolicy });
    } catch {
      setPreviewError("Não foi possível carregar a prévia do player.");
      setPreview(null);
    } finally {
      setPreviewPending(false);
    }
  }

  function testEmbedOption(index: number) {
    const source = embedSources[index];
    const iframe = source.type === "iframe-code"
      ? parseEmbedIframeCode(source.iframeCode)
      : null;
    const url = source.type === "iframe-code" ? iframe?.src ?? "" : source.url;
    if (!url) {
      setPreviewError(source.type === "iframe-code"
        ? "Cole um iframe válido com src HTTP ou HTTPS na opção " + (index + 1) + "."
        : "Informe uma URL HTTP ou HTTPS válida na opção " + (index + 1) + ".");
      setPreview(null);
      return;
    }
    if (source.type !== "iframe-code" && !isSafeHttpUrl(url.trim())) {
      setPreviewError("Informe uma URL HTTP ou HTTPS válida na opção " + (index + 1) + ".");
      setPreview(null);
      return;
    }
    void openPreview(source, url, index + 1);
  }

  function getDraftUrl(source: ChannelEmbedSourceDraft) {
    return source.type === "iframe-code"
      ? parseEmbedIframeCode(source.iframeCode)?.src ?? ""
      : source.url.trim();
  }

  const sortedCategories = sortCategories(categories);
  const previewIframe = preview?.source.type === "iframe-code"
    ? parseEmbedIframeCode(preview.source.iframeCode)
    : null;

  return (
    <>
      <form className="channel-form" onSubmit={handleSubmit}>
        <input name="id" type="hidden" value={channel?.id ?? ""} />
        <input name="embedSources" type="hidden" value={JSON.stringify(embedSources)} />
        <label htmlFor="channel-name">Nome do canal</label>
        <input
          autoComplete="off"
          defaultValue={channel?.name ?? ""}
          id="channel-name"
          maxLength={80}
          name="name"
          required
        />

        <label htmlFor="channel-category">Categoria</label>
        <select defaultValue={channel?.categorySlug ?? ""} id="channel-category" name="categorySlug" required>
          <option disabled value="">Selecione uma categoria</option>
          {sortedCategories
            .filter((category) => category.isActive || category.slug === channel?.categorySlug)
            .map((category) => (
              <option disabled={!category.isActive} key={category.slug} value={category.slug}>
                {category.name}{category.isActive ? "" : " (oculta)"}
              </option>
            ))}
        </select>

        <span className="channel-form__section-label">Opções de transmissão</span>
        <p className="channel-form__hint">
          Cada opção mantém seu próprio tipo, endereço e estado de visibilidade.
          Se uma página HTTP for incorporada quando o CanalMix estiver em HTTPS, o navegador poderá bloqueá-la como conteúdo inseguro.
        </p>
        {embedSources.length > 1 && (
          <p className="channel-form__hint">Arraste pela alça ou use as setas para mudar a ordem das opções.</p>
        )}
        <div className="channel-form__stream-options">
          {embedSources.map((source, index) => {
            const previewUrl = getDraftUrl(source);
            const isHttp = previewUrl.toLowerCase().startsWith("http://");
            return (
              <div
                className={
                  "channel-form__stream-option" +
                  (draggedOption === index ? " is-dragging" : "") +
                  (dropTargetOption === index ? " is-drop-target" : "")
                }
                key={source.id}
                onDragOver={(event) => { event.preventDefault(); setDropTargetOption(index); }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                  if (Number.isInteger(fromIndex)) void reorderOptions(fromIndex, index);
                }}
              >
                <div className="channel-form__stream-option-heading">
                  <span className={"channel-form__source-status" + (source.active ? " is-visible" : " is-hidden")}>
                    {source.active ? "Visível" : "Oculta"}
                  </span>
                  <label htmlFor={`channel-embed-${source.id}`}>Opção {index + 1}</label>
                  <select
                    aria-label={`Tipo da opção ${index + 1}`}
                    className="channel-form__source-type"
                    onChange={(event) => {
                      const type = event.currentTarget.value as EmbedSourceType;
                      const next = { ...source, type };
                      if (type === "iframe-code" && !next.iframeCode && next.url) {
                        next.iframeCode = iframeCodeForUrl(next.url);
                      }
                      updateOption(index, next);
                    }}
                    value={source.type}
                  >
                    {(Object.entries(EMBED_SOURCE_TYPE_LABELS) as [EmbedSourceType, string][]).map(([type, label]) => (
                      <option key={type} value={type}>{label}</option>
                    ))}
                  </select>
                  {embedSources.length > 1 && (
                    <div className="channel-form__reorder-actions">
                      <button
                        aria-label={`Arrastar opção ${index + 1} para reordenar`}
                        className="channel-form__drag-handle"
                        draggable
                        onDragEnd={() => { setDraggedOption(null); setDropTargetOption(null); }}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", String(index));
                          setDraggedOption(index);
                        }}
                        title="Arraste para mudar a ordem"
                        type="button"
                      ><GripVertical aria-hidden="true" size={18} /></button>
                      <button aria-label={`Mover opção ${index + 1} para cima`} className="channel-form__move-option" disabled={index === 0 || Boolean(sourcePendingId)} onClick={() => void reorderOptions(index, index - 1)} title="Mover para cima" type="button"><ChevronUp aria-hidden="true" size={17} /></button>
                      <button aria-label={`Mover opção ${index + 1} para baixo`} className="channel-form__move-option" disabled={index === embedSources.length - 1 || Boolean(sourcePendingId)} onClick={() => void reorderOptions(index, index + 1)} title="Mover para baixo" type="button"><ChevronDown aria-hidden="true" size={17} /></button>
                    </div>
                  )}
                </div>
                <div className="channel-form__embed-row">
                  {source.type === "iframe-code" ? (
                    <textarea
                      autoCapitalize="off"
                      autoComplete="off"
                      autoCorrect="off"
                      className="channel-form__embed-code"
                      id={`channel-embed-${source.id}`}
                      onChange={(event) => {
                        const iframeCode = event.currentTarget.value;
                        const parsed = parseEmbedIframeCode(iframeCode);
                        updateOption(index, {
                          iframeCode,
                          ...(parsed ? { url: parsed.src } : {}),
                        });
                      }}
                      placeholder={'<iframe src="https://..." title="..." allow="..." allowfullscreen></iframe>'}
                      required
                      rows={4}
                      spellCheck={false}
                      value={source.iframeCode}
                    />
                  ) : (
                    <input
                      autoComplete="url"
                      id={`channel-embed-${source.id}`}
                      onChange={(event) => updateOption(index, { url: event.currentTarget.value })}
                      placeholder="https://"
                      required
                      type="url"
                      value={source.url}
                    />
                  )}
                  <button aria-label={`Testar Opção ${index + 1}`} className="outline-action" disabled={previewPending} onClick={() => testEmbedOption(index)} type="button"><Play aria-hidden="true" size={15} fill="currentColor" />Testar</button>
                  <button aria-label={(source.active ? "Ocultar" : "Reativar") + ` Opção ${index + 1}`} className="outline-action" disabled={Boolean(sourcePendingId)} onClick={() => void setOptionVisibility(index, !source.active)} type="button">{source.active ? "Ocultar" : "Reativar"}</button>
                  {embedSources.length > 1 && (
                    <button
                      aria-label={`Remover opção ${index + 1}`}
                      className="icon-button icon-button--danger channel-form__remove-option"
                      onClick={() => setEmbedSources((current) => current.filter((_, item) => item !== index))}
                      title={`Remover opção ${index + 1}`}
                      type="button"
                    ><X aria-hidden="true" size={18} /></button>
                  )}
                </div>
                {isHttp && (
                  <p className="channel-form__hint" role="status">
                    Esta URL usa HTTP. Em uma página HTTPS, o navegador pode bloquear o player por conteúdo misto.
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <button className="secondary-button channel-form__add-option" onClick={() => setEmbedSources((current) => [...current, newEmbedDraft()])} type="button">
          <Plus aria-hidden="true" size={17} />Adicionar opção de player
        </button>
        {previewError && <p className="form-error" role="alert">{previewError}</p>}

        <label htmlFor="channel-thumbnail">Logo ou miniatura (opcional)</label>
        <input autoComplete="url" id="channel-thumbnail" name="thumbnailUrl" onChange={(event) => setThumbnailUrl(event.currentTarget.value)} placeholder="https://" type="url" value={thumbnailUrl} />
        {isSafeHttpsUrl(thumbnailUrl.trim()) && (
          <figure className="channel-form__thumbnail-preview">
            <div className="channel-form__thumbnail-frame"><img alt="Prévia da imagem inteira do canal" referrerPolicy="no-referrer" src={thumbnailUrl.trim()} /></div>
            <figcaption>Encaixe automático, com a imagem inteira e sem cortes.</figcaption>
          </figure>
        )}

        <label htmlFor="channel-official">Link oficial (opcional)</label>
        <input autoComplete="url" defaultValue={channel?.officialUrl ?? ""} id="channel-official" name="officialUrl" placeholder="https://" type="url" />
        <label className="publish-choice">
          <input defaultChecked={channel?.isPublished ?? false} name="published" type="checkbox" value="true" />
          <span className="publish-choice__toggle" aria-hidden="true" /><span>Publicar no catálogo</span>
        </label>
        <p className="channel-form__hint">Canais novos ficam ocultos até você marcar esta opção.</p>
        {message && <p className={messageIsError ? "form-error" : "form-success"} role="status">{message}</p>}
        <div className="channel-form__footer">
          <button className="secondary-button" onClick={onClose} type="button">Cancelar</button>
          <button className="primary-button" disabled={pending || Boolean(sourcePendingId)} type="submit">{pending ? "Salvando..." : channel ? "Salvar alterações" : "Salvar canal"}</button>
        </div>
      </form>

      {preview && (
        <div className="preview-backdrop">
          <section aria-labelledby="preview-title" aria-label="Prévia" aria-modal="true" className="player-preview" role="dialog">
            <header className="player-preview__header">
              <div>
                <p className="eyebrow">Prévia · {EMBED_SOURCE_TYPE_LABELS[preview.source.type]}</p>
                <h3 id="preview-title">{channel?.name ? `Prévia: ${channel.name} — Opção ${preview.option}` : `Prévia do player — Opção ${preview.option}`}</h3>
              </div>
              <button aria-label="Fechar prévia" className="icon-button" onClick={() => setPreview(null)} type="button"><X aria-hidden="true" size={21} /></button>
            </header>
            {preview.source.type === "direct-url" ? (
              isHlsMediaUrl(preview.url) ? (
                <HlsVideoPlayer key={preview.url} src={preview.url} title="Prévia do link direto" muted={false} videoRef={previewVideoRef} onCanPlay={() => {}} onVolumeChange={() => {}} />
              ) : (
                <video aria-label="Prévia do link direto" className="channel-player__video" controls playsInline preload="metadata" src={preview.url} />
              )
            ) : (
              <EmbedFrame
                className="channel-player__frame"
                src={preview.url}
                title={previewIframe?.title || "Prévia do player do canal " + (channel?.name || "novo")}
                referrerPolicy={preview.referrerPolicy}
                allow={preview.source.type === "iframe-code" ? previewIframe?.allow ?? "" : undefined}
                allowFullScreen={preview.source.type === "iframe-code" ? previewIframe?.allowFullscreen ?? false : undefined}
              />
            )}
            {preview.url.toLowerCase().startsWith("http://") && (
              <p className="channel-player__notice">Uma página HTTP pode ser bloqueada pelo navegador como conteúdo inseguro quando o CanalMix estiver em HTTPS.</p>
            )}
            <p className="channel-player__notice">Se o player não iniciar, o provedor pode bloquear a incorporação ou a reprodução.</p>
          </section>
        </div>
      )}
    </>
  );
}
export function AdminPanel({
  channels,
  categories,
  pendingIssueCounts,
}: {
  channels: AdminChannel[];
  categories: AdminCategory[];
  pendingIssueCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminChannel | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState("");

  const sortedCategories = sortCategories(categories);
  const filteredChannels = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return channels
      .filter((channel) => {
        const matchesName =
          normalized.length === 0 ||
          channel.name.toLocaleLowerCase("pt-BR").includes(normalized);
        const matchesCategory =
          categoryFilter.length === 0 ||
          channel.categorySlug === categoryFilter;
        const matchesStatus =
          statusFilter.length === 0 ||
          (statusFilter === "publicado" && channel.isPublished) ||
          (statusFilter === "oculto" && !channel.isPublished);
        return matchesName && matchesCategory && matchesStatus;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [categoryFilter, channels, query, statusFilter]);

  function startNewChannel() {
    setEditing(null);
    setFormOpen(true);
    setMessage("");
  }

  function startEditing(channel: AdminChannel) {
    setEditing(channel);
    setFormOpen(true);
    setMessage("");
  }

  async function togglePublication(channel: AdminChannel) {
    setPendingId(channel.id);
    setMessage("");
    const result = await setChannelPublishedAction(
      channel.id,
      !channel.isPublished,
    );
    setPendingId("");
    setMessage(result.message);
    if (result.success) {
      router.refresh();
    }
  }

  async function removeChannel(channel: AdminChannel) {
    const confirmed = window.confirm(
      "Excluir " + channel.name + "? Esta ação não pode ser desfeita.",
    );
    if (!confirmed) {
      return;
    }

    setPendingId(channel.id);
    setMessage("");
    const result = await deleteChannelAction(channel.id);
    setPendingId("");
    setMessage(result.message);
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <section className="admin-workspace">
      <section className="admin-list-panel">
        <header className="admin-list-panel__heading">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h2>Canais</h2>
          </div>
          <div className="admin-list-panel__heading-actions">
            <button className="primary-button" onClick={startNewChannel} type="button">
              <Plus aria-hidden="true" size={19} />
              Adicionar canal
            </button>
          </div>
        </header>

        <div className="admin-filters">
          <label className="admin-filter-search">
            <Search aria-hidden="true" size={19} />
            <span className="sr-only">Buscar canal</span>
            <input
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Buscar canal"
              type="search"
              value={query}
            />
          </label>
          <label>
            <span className="sr-only">Filtrar por categoria</span>
            <select
              onChange={(event) => setCategoryFilter(event.currentTarget.value)}
              value={categoryFilter}
            >
              <option value="">Todas as categorias</option>
              {sortedCategories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por status</span>
            <select
              onChange={(event) => setStatusFilter(event.currentTarget.value)}
              value={statusFilter}
            >
              <option value="">Todos os status</option>
              <option value="publicado">Publicado</option>
              <option value="oculto">Oculto</option>
            </select>
          </label>
        </div>

        {message && (
          <p className="admin-feedback" role="status">
            {message}
          </p>
        )}

        <div className="admin-channel-list">
          {filteredChannels.map((channel) => (
            <article className="admin-channel-row" data-channel-id={channel.id} key={channel.id}>
              <div className="admin-channel-row__thumb">
                {channel.thumbnailUrl ? (
                  <img src={channel.thumbnailUrl} alt="" loading="lazy" />
                ) : (
                  <Play aria-hidden="true" size={22} fill="currentColor" />
                )}
              </div>
              <div className="admin-channel-row__main">
                <h3>{channel.name}</h3>
                <p>
                  {channel.categoryName} · {channel.embedUrls.length} {channel.embedUrls.length === 1 ? "opção" : "opções"} de player
                </p>
                {(pendingIssueCounts[channel.id] ?? 0) > 0 && (
                  <span className="admin-channel-row__issues">
                    {pendingIssueCounts[channel.id]} pendências
                  </span>
                )}
              </div>
              <span
                className={
                  "status-pill" +
                  (channel.isPublished ? " status-pill--published" : "")
                }
              >
                {channel.isPublished ? "Publicado" : "Oculto"}
              </span>
              <div className="admin-channel-row__actions">
                {channel.officialUrl && (
                  <a
                    aria-label={"Abrir link oficial de " + channel.name}
                    className="icon-button"
                    href={channel.officialUrl}
                    rel="noreferrer noopener"
                    target="_blank"
                    title="Abrir link oficial"
                  >
                    <ExternalLink aria-hidden="true" size={18} />
                  </a>
                )}
                <button
                  aria-label={"Editar " + channel.name}
                  className="icon-button"
                  onClick={() => startEditing(channel)}
                  title="Editar canal"
                  type="button"
                >
                  <Pencil aria-hidden="true" size={18} />
                </button>
                <button
                  aria-label={
                    (channel.isPublished
                      ? "Ocultar "
                      : channel.publishedAt
                        ? "Republicar "
                        : "Publicar ") + channel.name
                  }
                  className="icon-button"
                  disabled={pendingId === channel.id}
                  onClick={() => togglePublication(channel)}
                  title={channel.isPublished ? "Ocultar canal" : "Publicar canal"}
                  type="button"
                >
                  {channel.isPublished ? (
                    <EyeOff aria-hidden="true" size={19} />
                  ) : channel.publishedAt ? (
                    <Eye aria-hidden="true" size={19} />
                  ) : (
                    <Check aria-hidden="true" size={19} />
                  )}
                </button>
                <button
                  aria-label={"Excluir " + channel.name}
                  className="icon-button icon-button--danger"
                  disabled={pendingId === channel.id}
                  onClick={() => removeChannel(channel)}
                  title="Excluir canal"
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={18} />
                </button>
              </div>
            </article>
          ))}

          {filteredChannels.length === 0 && (
            <div className="admin-empty">
              <div className="admin-empty__icon">
                <Play aria-hidden="true" size={21} />
              </div>
              <h3>{channels.length === 0 ? "Nenhum canal cadastrado" : "Nenhum resultado"}</h3>
              <p>
                {channels.length === 0
                  ? "Adicione canais para organizar o catálogo."
                  : "Ajuste a busca ou os filtros selecionados."}
              </p>
              {channels.length === 0 && (
                <button className="text-button" onClick={startNewChannel} type="button">
                  Adicionar primeiro canal
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {formOpen && (
        <div className="admin-drawer-wrap">
          <button
            aria-label="Fechar formulário"
            className="admin-drawer-backdrop"
            onClick={() => setFormOpen(false)}
            type="button"
          />
          <aside
            aria-labelledby="channel-form-title"
            aria-modal="true"
            className="admin-drawer"
            role="dialog"
          >
            <header className="admin-drawer__heading">
              <div>
                <p className="eyebrow">{editing ? "Editar cadastro" : "Novo cadastro"}</p>
                <h2 id="channel-form-title">
                  {editing ? "Editar canal" : "Adicionar canal"}
                </h2>
              </div>
              <button
                aria-label="Fechar formulário"
                className="icon-button"
                onClick={() => setFormOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={22} />
              </button>
            </header>
            <ChannelForm
              channel={editing}
              categories={categories}
              key={editing?.id ?? "new"}
              onClose={() => setFormOpen(false)}
              onSaved={() => {
                setFormOpen(false);
                router.refresh();
              }}
            />
          </aside>
        </div>
      )}
    </section>
  );
}
