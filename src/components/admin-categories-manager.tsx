"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteCategoryAction, saveCategoryAction } from "@/app/admin/actions";
import type { ChannelCardData } from "@/lib/channels";
import type { AdminCategory } from "@/lib/categories";
import { slugifyChannelName } from "@/lib/channel-schema";

export function AdminCategoriesManager({
  categories,
  channels,
  onClose,
  onChanged,
}: {
  categories: AdminCategory[];
  channels: ChannelCardData[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

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
      onChanged();
    }
  }

  async function removeCategory(category: AdminCategory) {
    const confirmed = window.confirm(
      `Excluir a categoria "${category.name}"? Categorias com canais vinculados não podem ser excluídas.`,
    );
    if (!confirmed) {
      return;
    }

    setPendingDeleteId(category.id);
    setMessage("");
    const result = await deleteCategoryAction(category.id);
    setPendingDeleteId(null);
    setMessage(result.message);
    setMessageIsError(!result.success);
    if (result.success) {
      if (editing?.id === category.id) {
        cancelEditing();
      }
      onChanged();
    }
  }

  const generatedSlug = name.trim() ? slugifyChannelName(name) : "novo-slug";

  return (
    <div className="category-manager">
      <p className="channel-form__hint">
        As categorias aparecem no catálogo público e no formulário dos canais.
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
          ) : (
            <span />
          )}
          <button className="primary-button" disabled={pending} type="submit">
            {editing ? (
              <Pencil aria-hidden="true" size={17} />
            ) : (
              <Plus aria-hidden="true" size={17} />
            )}
            {pending
              ? "Salvando..."
              : editing
                ? "Salvar categoria"
                : "Adicionar categoria"}
          </button>
        </div>
      </form>

      {message && (
        <p
          className={messageIsError ? "form-error" : "form-success"}
          role="status"
        >
          {message}
        </p>
      )}

      <div className="category-manager__list">
        {categories.map((category) => {
          const channelCount = channels.filter(
            (channel) => channel.categorySlug === category.slug,
          ).length;

          return (
            <article className="category-manager__row" key={category.id}>
              <div className="category-manager__copy">
                <h3>{category.name}</h3>
                <p>
                  {category.slug} · {channelCount === 1 ? "1 canal" : `${channelCount} canais`}
                </p>
              </div>
              <div className="category-manager__actions">
                <button
                  aria-label={`Editar categoria ${category.name}`}
                  className="icon-button"
                  disabled={pending || pendingDeleteId !== null}
                  onClick={() => startEditing(category)}
                  title="Editar categoria"
                  type="button"
                >
                  <Pencil aria-hidden="true" size={17} />
                </button>
                <button
                  aria-label={`Excluir categoria ${category.name}`}
                  className="icon-button icon-button--danger"
                  disabled={pending || pendingDeleteId !== null}
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

      <div className="channel-form__footer category-manager__footer">
        <button className="secondary-button" onClick={onClose} type="button">
          Fechar
        </button>
      </div>
    </div>
  );
}
