"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  deleteCategoryAction,
  saveCategoryAction,
  setCategoryActiveAction,
} from "@/app/admin/actions";
import type { ChannelCardData } from "@/lib/channels";
import type { AdminCategory } from "@/lib/categories";
import { sortCategories } from "@/lib/categories";
import { slugifyChannelName } from "@/lib/channel-schema";

export function AdminCategoriesManager({
  categories,
  channels,
}: {
  categories: AdminCategory[];
  channels: ChannelCardData[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingCategoryId, setPendingCategoryId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminCategory | null>(null);
  const [transferTargetId, setTransferTargetId] = useState("");

  const sortedCategories = useMemo(() => sortCategories(categories), [categories]);

  function startEditing(category: AdminCategory) {
    setEditing(category);
    setName(category.name);
    setMessage("");
  }

  function cancelEditing() {
    setEditing(null);
    setName("");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const result = await saveCategoryAction(new FormData(event.currentTarget));
    setPending(false);
    setMessage(result.message);
    setMessageIsError(!result.success);
    if (result.success) {
      setEditing(null);
      setName("");
      router.refresh();
    }
  }

  async function toggleCategory(category: AdminCategory) {
    setPendingCategoryId(category.id);
    setMessage("");
    const result = await setCategoryActiveAction(category.id, !category.isActive);
    setPendingCategoryId(null);
    setMessage(result.message);
    setMessageIsError(!result.success);
    if (result.success) router.refresh();
  }

  async function removeCategory(category: AdminCategory) {
    const channelCount = channels.filter(
      (channel) => channel.categorySlug === category.slug,
    ).length;
    if (channelCount > 0) {
      setPendingDelete(category);
      setTransferTargetId(
        String(
          sortedCategories.find(
            (candidate) => candidate.id !== category.id && candidate.isActive,
          )?.id ?? "",
        ),
      );
      setMessage("");
      return;
    }

    if (!window.confirm(`Excluir a categoria “${category.name}”?`)) return;
    setPendingCategoryId(category.id);
    setMessage("");
    const result = await deleteCategoryAction(category.id);
    setPendingCategoryId(null);
    setMessage(result.message);
    setMessageIsError(!result.success);
    if (result.success) {
      if (editing?.id === category.id) cancelEditing();
      router.refresh();
    }
  }

  async function transferAndDelete() {
    if (!pendingDelete || !transferTargetId) return;
    const channelCount = channels.filter(
      (channel) => channel.categorySlug === pendingDelete.slug,
    ).length;
    const target = sortedCategories.find((item) => item.id === Number(transferTargetId));
    if (!target) return;
    if (
      !window.confirm(
        `Transferir ${channelCount} ${channelCount === 1 ? "canal" : "canais"} para “${target.name}” e excluir “${pendingDelete.name}”?`,
      )
    ) {
      return;
    }

    setPendingCategoryId(pendingDelete.id);
    setMessage("");
    const result = await deleteCategoryAction(
      pendingDelete.id,
      Number(transferTargetId),
    );
    setPendingCategoryId(null);
    setMessage(result.message);
    setMessageIsError(!result.success);
    if (result.success) {
      if (editing?.id === pendingDelete.id) cancelEditing();
      setPendingDelete(null);
      setTransferTargetId("");
      router.refresh();
    }
  }

  const generatedSlug = name.trim() ? slugifyChannelName(name) : "novo-slug";

  return (
    <div className="category-manager">
      <p className="channel-form__hint">
        As categorias ativas aparecem no catálogo e no cadastro de canais.
      </p>

      <form className="channel-form category-manager__form" onSubmit={handleSubmit}>
        <input name="id" type="hidden" value={editing?.id ?? ""} />
        <label htmlFor="category-name">Nome da categoria</label>
        <input
          autoComplete="off"
          id="category-name"
          maxLength={60}
          name="name"
          onChange={(event) => setName(event.currentTarget.value)}
          required
          value={name}
        />
        <p className="channel-form__hint category-manager__slug">
          Endereço interno: <code>{generatedSlug}</code>
        </p>
        <div className="channel-form__footer">
          {editing ? (
            <button
              className="secondary-button"
              disabled={pending}
              onClick={cancelEditing}
              type="button"
            >
              Cancelar edição
            </button>
          ) : <span />}
          <button className="primary-button" disabled={pending} type="submit">
            {editing ? <Pencil aria-hidden="true" size={17} /> : <Plus aria-hidden="true" size={17} />}
            {pending ? "Salvando…" : editing ? "Salvar categoria" : "Adicionar categoria"}
          </button>
        </div>
      </form>

      {message && (
        <p className={messageIsError ? "form-error" : "form-success"} role="status">
          {message}
        </p>
      )}

      {pendingDelete && (
        <section
          aria-labelledby="category-transfer-title"
          aria-modal="true"
          className="category-manager__transfer"
          role="dialog"
        >
          <h3 id="category-transfer-title">Transferir canais antes de excluir</h3>
          <p>
            {channels.filter((channel) => channel.categorySlug === pendingDelete.slug).length} canais usam “{pendingDelete.name}”.
            Escolha a categoria de destino para mover todos antes de excluir.
          </p>
          <label htmlFor="category-transfer-target">Nova categoria</label>
          <select
            id="category-transfer-target"
            onChange={(event) => setTransferTargetId(event.currentTarget.value)}
            value={transferTargetId}
          >
            <option value="">Selecione uma categoria ativa</option>
            {sortedCategories
              .filter((category) => category.id !== pendingDelete.id && category.isActive)
              .map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <div className="channel-form__footer">
            <button
              className="secondary-button"
              onClick={() => setPendingDelete(null)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={!transferTargetId || pendingCategoryId !== null}
              onClick={() => void transferAndDelete()}
              type="button"
            >
              Transferir e excluir
            </button>
          </div>
        </section>
      )}

      <div className="category-manager__list">
        {sortedCategories.map((category) => {
          const channelCount = channels.filter(
            (channel) => channel.categorySlug === category.slug,
          ).length;
          return (
            <article className="category-manager__row" key={category.id}>
              <div className="category-manager__copy">
                <h3>{category.name}</h3>
                <p>
                  {category.slug} · {channelCount === 1 ? "1 canal" : `${channelCount} canais`}
                  {" · "}{category.isActive ? "Ativa" : "Oculta"}
                </p>
              </div>
              <div className="category-manager__actions">
                <button
                  aria-label={`${category.isActive ? "Ocultar" : "Reativar"} categoria ${category.name}`}
                  className="icon-button"
                  disabled={pending || pendingCategoryId !== null}
                  onClick={() => void toggleCategory(category)}
                  title={category.isActive ? "Ocultar categoria" : "Reativar categoria"}
                  type="button"
                >
                  {category.isActive ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
                </button>
                <button
                  aria-label={`Editar categoria ${category.name}`}
                  className="icon-button"
                  disabled={pending || pendingCategoryId !== null}
                  onClick={() => startEditing(category)}
                  title="Editar categoria"
                  type="button"
                >
                  <Pencil aria-hidden="true" size={17} />
                </button>
                <button
                  aria-label={`Excluir categoria ${category.name}`}
                  className="icon-button icon-button--danger"
                  disabled={pending || pendingCategoryId !== null}
                  onClick={() => void removeCategory(category)}
                  title="Excluir categoria"
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={17} />
                </button>
              </div>
            </article>
          );
        })}
        {categories.length === 0 && (
          <p className="channel-form__hint">Ainda não há categorias cadastradas.</p>
        )}
      </div>
    </div>
  );
}
