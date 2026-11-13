"use client";

/* eslint-disable @next/next/no-img-element -- Channel artwork is admin-managed at runtime and is intentionally loaded directly instead of through the Next image optimizer. */
import { useMemo, useState, type FormEvent } from "react";
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
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { sortCategories } from "@/lib/categories";
import type { AdminCategory } from "@/lib/categories";
import { isSafeHttpsUrl } from "@/lib/channel-schema";
import { extractEmbedIframeSrc } from "@/lib/embed-code";
import { EmbedFrame } from "@/components/embed-frame";
import { AdminCategoriesManager } from "@/components/admin-categories-manager";
import type { ChannelCardData } from "@/lib/channels";
import type { EmbedReferrerPolicy } from "@/lib/embed-provider-policy-core";
import {
  deleteChannelAction,
  getAdminEmbedPreviewPolicyAction,
  saveChannelAction,
  setChannelPublishedAction,
} from "@/app/admin/actions";

type AdminChannel = ChannelCardData;
type EmbedInputMode = "url" | "code";

function iframeCodeForUrl(url: string) {
  if (!url) {
    return "";
  }

  const escapedUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<iframe src="${escapedUrl}"></iframe>`;
}

function swapItems<T>(items: T[], firstIndex: number, secondIndex: number) {
  const nextItems = [...items];
  [nextItems[firstIndex], nextItems[secondIndex]] = [
    nextItems[secondIndex],
    nextItems[firstIndex],
  ];
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
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  const [embedMode, setEmbedMode] = useState<EmbedInputMode>("url");
  const [thumbnailUrl, setThumbnailUrl] = useState(channel?.thumbnailUrl ?? "");
  const [embedUrls, setEmbedUrls] = useState<string[]>(
    channel?.embedUrls.length ? channel.embedUrls : [""],
  );
  const [embedCodes, setEmbedCodes] = useState<string[]>(
    channel?.embedUrls.map(iframeCodeForUrl) ?? [""],
  );
  const [draggedOption, setDraggedOption] = useState<number | null>(null);
  const [dropTargetOption, setDropTargetOption] = useState<number | null>(null);
  const [preview, setPreview] = useState<{
    url: string;
    option: number;
    sandbox: string | null;
    referrerPolicy: EmbedReferrerPolicy;
  } | null>(null);
  const [previewError, setPreviewError] = useState("");

  function reorderOptions(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= embedUrls.length ||
      toIndex >= embedUrls.length
    ) {
      return;
    }

    setEmbedUrls((current) => swapItems(current, fromIndex, toIndex));
    setEmbedCodes((current) => swapItems(current, fromIndex, toIndex));
    setDraggedOption(null);
    setDropTargetOption(null);
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
    if (result.success) {
      onSaved();
    }
  }

  async function openPreview(url: string, option: number) {
    url = url.trim();
    if (!isSafeHttpsUrl(url)) {
      setPreviewError("Informe uma URL HTTPS válida na opção " + option + ".");
      setPreview(null);
      return;
    }

    setPreviewError("");
    setPreviewPending(true);
    try {
      const policy = await getAdminEmbedPreviewPolicyAction(url);
      if (!policy.success) {
        setPreviewError(policy.message);
        setPreview(null);
        return;
      }
      setPreview({
        url,
        option,
        sandbox: policy.sandbox,
        referrerPolicy: policy.referrerPolicy,
      });
    } catch {
      setPreviewError("Não foi possível carregar a prévia do player.");
      setPreview(null);
    } finally {
      setPreviewPending(false);
    }
  }

  function testEmbedOption(index: number) {
    const url = embedMode === "url"
      ? embedUrls[index]
      : extractEmbedIframeSrc(embedCodes[index] ?? "") ?? "";

    if (!url) {
      setPreviewError(
        embedMode === "code"
          ? "Cole um único iframe com src HTTPS válido na opção " + (index + 1) + "."
          : "Informe uma URL HTTPS válida na opção " + (index + 1) + ".",
      );
      setPreview(null);
      return;
    }

    void openPreview(url, index + 1);
  }

  const sortedCategories = sortCategories(categories);

  return (
    <>
      <form className="channel-form" onSubmit={handleSubmit}>
        <input name="id" type="hidden" value={channel?.id ?? ""} />
        <input name="embedMode" type="hidden" value={embedMode} />
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
        <select
          defaultValue={channel?.categorySlug ?? ""}
          id="channel-category"
          name="categorySlug"
          required
        >
          <option disabled value="">
            Selecione uma categoria
          </option>
          {sortedCategories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>

        <span className="channel-form__section-label">Opções de embed</span>
        <div
          aria-label="Modo de entrada do embed"
          className="channel-form__embed-modes"
          role="group"
        >
          <button
            aria-pressed={embedMode === "url"}
            className={
              "channel-form__embed-mode" +
              (embedMode === "url" ? " is-active" : "")
            }
            onClick={() => setEmbedMode("url")}
            type="button"
          >
            Embed por URL
          </button>
          <button
            aria-pressed={embedMode === "code"}
            className={
              "channel-form__embed-mode" +
              (embedMode === "code" ? " is-active" : "")
            }
            onClick={() => setEmbedMode("code")}
            type="button"
          >
            Embed por código
          </button>
        </div>
        {embedMode === "code" && (
          <p className="channel-form__hint">
            Cole um único iframe por opção. O CanalMix salva somente a URL do src.
          </p>
        )}
        {embedUrls.length > 1 && (
          <p className="channel-form__hint">
            Arraste pelo ícone de alça ou use as setas para mudar a ordem das opções.
          </p>
        )}
        <div className="channel-form__stream-options">
          {embedUrls.map((url, index) => (
            <div
              className={
                "channel-form__stream-option" +
                (draggedOption === index ? " is-dragging" : "") +
                (dropTargetOption === index ? " is-drop-target" : "")
              }
              key={index}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTargetOption(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                if (Number.isInteger(fromIndex)) {
                  reorderOptions(fromIndex, index);
                }
              }}
            >
              <div className="channel-form__stream-option-heading">
              <label htmlFor={`channel-embed-${index}`}>
                {embedMode === "url" ? "URL do embed" : "Código do embed"} — Opção {index + 1}
              </label>
                {embedUrls.length > 1 && (
                  <div className="channel-form__reorder-actions">
                    <button
                      aria-label={`Arrastar opção ${index + 1} para reordenar`}
                      className="channel-form__drag-handle"
                      draggable
                      onDragEnd={() => {
                        setDraggedOption(null);
                        setDropTargetOption(null);
                      }}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(index));
                        setDraggedOption(index);
                      }}
                      title="Arraste para mudar a ordem"
                      type="button"
                    >
                      <GripVertical aria-hidden="true" size={18} />
                    </button>
                    <button
                      aria-label={`Mover opção ${index + 1} para cima`}
                      className="channel-form__move-option"
                      disabled={index === 0}
                      onClick={() => reorderOptions(index, index - 1)}
                      title="Mover para cima"
                      type="button"
                    >
                      <ChevronUp aria-hidden="true" size={17} />
                    </button>
                    <button
                      aria-label={`Mover opção ${index + 1} para baixo`}
                      className="channel-form__move-option"
                      disabled={index === embedUrls.length - 1}
                      onClick={() => reorderOptions(index, index + 1)}
                      title="Mover para baixo"
                      type="button"
                    >
                      <ChevronDown aria-hidden="true" size={17} />
                    </button>
                  </div>
                )}
              </div>
              <div className="channel-form__embed-row">
                {embedMode === "url" ? (
                  <input
                    autoComplete="url"
                    id={`channel-embed-${index}`}
                    name="embedUrls"
                    onChange={(event) => {
                      const nextUrl = event.currentTarget.value;
                      const nextUrls = [...embedUrls];
                      nextUrls[index] = nextUrl;
                      setEmbedUrls(nextUrls);

                      const nextCodes = [...embedCodes];
                      nextCodes[index] = iframeCodeForUrl(nextUrl);
                      setEmbedCodes(nextCodes);
                    }}
                    placeholder="https://"
                    required
                    type="url"
                    value={url}
                  />
                ) : (
                  <textarea
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    className="channel-form__embed-code"
                    id={`channel-embed-${index}`}
                    name="embedCodes"
                    onChange={(event) => {
                      const nextCode = event.currentTarget.value;
                      const nextCodes = [...embedCodes];
                      nextCodes[index] = nextCode;
                      setEmbedCodes(nextCodes);

                      const extractedUrl = extractEmbedIframeSrc(nextCode);
                      if (extractedUrl) {
                        const nextUrls = [...embedUrls];
                        nextUrls[index] = extractedUrl;
                        setEmbedUrls(nextUrls);
                      }
                    }}
                    placeholder={'<iframe src="https://..." title="..." allowfullscreen></iframe>'}
                    required
                    rows={4}
                    spellCheck={false}
                    value={embedCodes[index] ?? ""}
                  />
                )}
                <button
                  aria-label={`Testar player da opção ${index + 1}`}
                  className="outline-action"
                  disabled={previewPending}
                  onClick={() => testEmbedOption(index)}
                  type="button"
                >
                  <Play aria-hidden="true" size={15} fill="currentColor" />
                  Testar player
                </button>
                {embedUrls.length > 1 && (
                  <button
                    aria-label={`Remover opção ${index + 1}`}
                    className="icon-button icon-button--danger channel-form__remove-option"
                    onClick={() => {
                      setEmbedUrls((current) => current.filter((_, item) => item !== index));
                      setEmbedCodes((current) => current.filter((_, item) => item !== index));
                    }}
                    title={`Remover opção ${index + 1}`}
                    type="button"
                  >
                    <X aria-hidden="true" size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          className="secondary-button channel-form__add-option"
          onClick={() => {
            setEmbedUrls((current) => [...current, ""]);
            setEmbedCodes((current) => [...current, ""]);
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={17} />
          Adicionar opção de player
        </button>
        {previewError && (
          <p className="form-error" role="alert">
            {previewError}
          </p>
        )}

        <label htmlFor="channel-thumbnail">Logo ou miniatura (opcional)</label>
        <input
          autoComplete="url"
          id="channel-thumbnail"
          name="thumbnailUrl"
          onChange={(event) => setThumbnailUrl(event.currentTarget.value)}
          placeholder="https://"
          type="url"
          value={thumbnailUrl}
        />
        {isSafeHttpsUrl(thumbnailUrl.trim()) && (
          <figure className="channel-form__thumbnail-preview">
            <div className="channel-form__thumbnail-frame">
              <img
                alt="Prévia da imagem inteira do canal"
                referrerPolicy="no-referrer"
                src={thumbnailUrl.trim()}
              />
            </div>
            <figcaption>Encaixe automático, com a imagem inteira e sem cortes.</figcaption>
          </figure>
        )}

        <label htmlFor="channel-official">Link oficial (opcional)</label>
        <input
          autoComplete="url"
          defaultValue={channel?.officialUrl ?? ""}
          id="channel-official"
          name="officialUrl"
          placeholder="https://"
          type="url"
        />

        <label className="publish-choice">
          <input
            defaultChecked={channel?.isPublished ?? false}
            name="published"
            type="checkbox"
            value="true"
          />
          <span className="publish-choice__toggle" aria-hidden="true" />
          <span>Publicar no catálogo</span>
        </label>
        <p className="channel-form__hint">
          Canais novos ficam ocultos até você marcar esta opção.
        </p>

        {message && (
          <p
            className={messageIsError ? "form-error" : "form-success"}
            role="status"
          >
            {message}
          </p>
        )}

        <div className="channel-form__footer">
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="primary-button" disabled={pending} type="submit">
            {pending ? "Salvando..." : channel ? "Salvar alterações" : "Salvar canal"}
          </button>
        </div>
      </form>

      {preview && (
        <div className="preview-backdrop">
          <section
            aria-labelledby="preview-title"
            aria-label="Prévia"
            aria-modal="true"
            className="player-preview"
            role="dialog"
          >
            <header className="player-preview__header">
              <div>
                <p className="eyebrow">Prévia</p>
                <h3 id="preview-title">
                  {channel?.name
                    ? `Prévia: ${channel.name} — Opção ${preview.option}`
                    : `Prévia do player — Opção ${preview.option}`}
                </h3>
              </div>
              <button
                aria-label="Fechar prévia"
                className="icon-button"
                onClick={() => setPreview(null)}
                type="button"
              >
                <X aria-hidden="true" size={21} />
              </button>
            </header>
            <EmbedFrame
              className="channel-player__frame"
              src={preview.url}
              title={"Prévia do player do canal " + (channel?.name || "novo")}
              sandbox={preview.sandbox}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy={preview.referrerPolicy}
            />
            <p className="channel-player__notice">
              Se o player não iniciar, o provedor pode bloquear a incorporação.
            </p>
          </section>
        </div>
      )}
    </>
  );
}

export function AdminPanel({
  channels,
  categories,
}: {
  channels: AdminChannel[];
  categories: AdminCategory[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
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
            <button
              className="secondary-button"
              onClick={() => setCategoriesOpen(true)}
              type="button"
            >
              <Tags aria-hidden="true" size={18} />
              Categorias
            </button>
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
            <article className="admin-channel-row" key={channel.id}>
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
      {categoriesOpen && (
        <div className="admin-drawer-wrap">
          <button
            aria-label="Fechar gerenciamento de categorias"
            className="admin-drawer-backdrop"
            onClick={() => setCategoriesOpen(false)}
            type="button"
          />
          <aside
            aria-labelledby="category-manager-title"
            aria-modal="true"
            className="admin-drawer"
            role="dialog"
          >
            <header className="admin-drawer__heading">
              <div>
                <p className="eyebrow">Organização do catálogo</p>
                <h2 id="category-manager-title">Gerenciar categorias</h2>
              </div>
              <button
                aria-label="Fechar gerenciamento de categorias"
                className="icon-button"
                onClick={() => setCategoriesOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={22} />
              </button>
            </header>
            <AdminCategoriesManager
              categories={categories}
              channels={channels}
              onChanged={() => {
                setCategoryFilter("");
                router.refresh();
              }}
              onClose={() => setCategoriesOpen(false)}
            />
          </aside>
        </div>
      )}
    </section>
  );
}
