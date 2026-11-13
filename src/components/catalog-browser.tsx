"use client";

/* eslint-disable @next/next/no-img-element -- Channel artwork is admin-managed at runtime and is intentionally loaded directly instead of through the Next image optimizer. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import {
  getCategoryIcon,
  sortCategories,
} from "@/lib/categories";
import type { ChannelCardData, CatalogResult } from "@/lib/channels";
import type { CategoryOption } from "@/lib/categories";

type CatalogBrowserProps = {
  channels: ChannelCardData[];
  categories: CategoryOption[];
  mode: "site" | "tv";
  status: CatalogResult["status"];
  initialCategorySlug?: string;
  initialFocusSlug?: string;
};

function ChannelCard({
  channel,
  mode,
}: {
  channel: ChannelCardData;
  mode: "site" | "tv";
}) {
  const returnParams = new URLSearchParams();
  if (mode === "tv") {
    returnParams.set("from", "tv");
  }
  returnParams.set("voltar", "historico");
  const href =
    "/canais/" +
    encodeURIComponent(channel.slug) +
    "?" +
    returnParams.toString();

  return (
    <Link
      className={"channel-card" + (mode === "tv" ? " channel-card--tv" : "")}
      href={href}
      data-catalog-card
      data-slug={channel.slug}
      aria-label={"Assistir " + channel.name}
      onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.set("categoria", channel.categorySlug);
        url.searchParams.set("foco", channel.slug);
        window.history.replaceState(
          window.history.state,
          "",
          url.pathname + url.search + url.hash,
        );
      }}
    >
      <span className="channel-card__image">
        {channel.thumbnailUrl ? (
          <img
            src={channel.thumbnailUrl}
            alt={"Logo ou miniatura de " + channel.name}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="channel-card__placeholder" aria-hidden="true">
            <span className="brand__symbol brand__symbol--small">
              <span className="brand__screen brand__screen--back" />
              <span className="brand__screen brand__screen--front">
                <span className="play-triangle" />
              </span>
            </span>
          </span>
        )}
      </span>
      <span className="channel-card__details">
        <span className="channel-card__name">{channel.name}</span>
        <span className="channel-card__category">{channel.categoryName}</span>
        <span className="channel-card__play" aria-hidden="true">
          <span className="play-triangle" />
        </span>
      </span>
    </Link>
  );
}

export function CatalogBrowser({
  channels,
  categories: categoryOptions,
  mode,
  status,
  initialCategorySlug,
  initialFocusSlug,
}: CatalogBrowserProps) {
  const [categorySlug, setCategorySlug] = useState<string | null>(() =>
    typeof window === "undefined"
      ? initialCategorySlug ?? null
      : new URLSearchParams(window.location.search).get("categoria"),
  );
  const [focusSlug, setFocusSlug] = useState<string | null>(() =>
    typeof window === "undefined"
      ? initialFocusSlug ?? null
      : new URLSearchParams(window.location.search).get("foco"),
  );
  const [query, setQuery] = useState("");
  const [lastCategorySlug, setLastCategorySlug] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function syncCategoryFromHistory() {
      const params = new URLSearchParams(window.location.search);
      const nextCategorySlug = params.get("categoria");

      setLastCategorySlug((current) => categorySlug ?? current);
      setCategorySlug(nextCategorySlug);
      setFocusSlug(params.get("foco"));
      setQuery("");
    }

    window.addEventListener("popstate", syncCategoryFromHistory);
    return () => window.removeEventListener("popstate", syncCategoryFromHistory);
  }, [categorySlug]);

  const selectedCategory = categorySlug
    ? categoryOptions.find((category) => category.slug === categorySlug)
    : undefined;
  const categories = sortCategories(categoryOptions);
  const matchingChannels = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return channels.filter((channel) => {
      const matchesCategory =
        categorySlug === null || channel.categorySlug === categorySlug;
      const matchesName =
        normalizedQuery.length === 0 ||
        channel.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
      return matchesCategory && matchesName;
    });
  }, [categorySlug, channels, query]);

  const focusCatalogCard = useCallback(
    (slug?: string | null) => {
      if (mode !== "tv") {
        return;
      }

      requestAnimationFrame(() => {
        const escapedSlug =
          slug && typeof CSS !== "undefined" && CSS.escape
            ? CSS.escape(slug)
            : slug;
        const target = escapedSlug
          ? gridRef.current?.querySelector<HTMLElement>(
              '[data-slug="' + escapedSlug + '"]',
            )
          : gridRef.current?.querySelector<HTMLElement>("[data-catalog-card]");
        target?.focus({ preventScroll: false });
      });
    },
    [mode],
  );

  useEffect(() => {
    if (mode !== "tv") {
      return;
    }
    focusCatalogCard(categorySlug ? focusSlug : lastCategorySlug);
  }, [
    categorySlug,
    focusCatalogCard,
    focusSlug,
    lastCategorySlug,
    mode,
  ]);

  function returnToCategories() {
    setLastCategorySlug(categorySlug);
    setQuery("");

    const currentHistoryState = window.history.state as
      | (Record<string, unknown> & { canalMixCategoryEntry?: boolean })
      | null;

    if (currentHistoryState?.canalMixCategoryEntry) {
      window.history.back();
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("categoria");
    url.searchParams.delete("foco");
    window.history.replaceState(currentHistoryState, "", url.pathname + url.search + url.hash);
    setCategorySlug(null);
    setFocusSlug(null);
  }

  function selectCategory(slug: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("categoria", slug);
    url.searchParams.delete("foco");

    const currentHistoryState =
      window.history.state && typeof window.history.state === "object"
        ? (window.history.state as Record<string, unknown>)
        : {};

    window.history.pushState(
      { ...currentHistoryState, canalMixCategoryEntry: true },
      "",
      url.pathname + url.search + url.hash,
    );
    setLastCategorySlug(slug);
    setCategorySlug(slug);
    setFocusSlug(null);
    setQuery("");
  }

  function handleGridKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (mode !== "tv") {
      return;
    }

    if (event.key === "Escape" && categorySlug) {
      event.preventDefault();
      returnToCategories();
      return;
    }

    const focusedCard = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-catalog-card]",
    );
    if (!focusedCard || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }

    const cards = Array.from(
      gridRef.current?.querySelectorAll<HTMLElement>("[data-catalog-card]") ?? [],
    );
    const currentIndex = cards.indexOf(focusedCard);
    if (currentIndex < 0 || cards.length === 0) {
      return;
    }

    const columns = Math.max(
      1,
      gridRef.current
        ? getComputedStyle(gridRef.current).gridTemplateColumns.split(" ").length
        : 1,
    );
    const movement =
      event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowLeft"
          ? -1
          : event.key === "ArrowDown"
            ? columns
            : -columns;
    const nextCard = cards[currentIndex + movement];

    if (nextCard) {
      event.preventDefault();
      nextCard.focus({ preventScroll: false });
    }
  }

  const showSearchResults = query.trim().length > 0;
  const showCategories = !selectedCategory && !showSearchResults;

  return (
    <main
      className={"catalog catalog--" + mode}
      onKeyDown={handleGridKeyDown}
    >
      <section className="catalog__intro">
        {selectedCategory ? (
          <button
            className="back-link"
            onClick={returnToCategories}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={19} />
            <span>Categorias</span>
          </button>
        ) : (
          <p className="eyebrow">
            {mode === "tv" ? "Sua programação, em um só lugar" : "Catálogo gratuito"}
          </p>
        )}
        <h1>
          {selectedCategory?.name ??
            (showSearchResults ? "Resultados da busca" : "Encontre seu próximo canal")}
        </h1>
        <p className="catalog__lead">
          {selectedCategory
            ? "Escolha um canal para assistir."
            : "Explore canais da internet em categorias feitas para você."}
        </p>
      </section>

      <label className="search-field">
        <Search aria-hidden="true" size={21} />
        <span className="sr-only">Buscar canal pelo nome</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={
            selectedCategory
              ? "Buscar nesta categoria"
              : "Buscar por nome do canal"
          }
          autoComplete="off"
        />
        {query && (
          <button
            className="search-field__clear"
            type="button"
            aria-label="Limpar busca"
            onClick={() => setQuery("")}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </label>

      {status === "not-configured" && (
        <p className="setup-notice" role="status">
          Configure o Supabase para carregar os canais do catálogo.
        </p>
      )}
      {status === "unavailable" && (
        <p className="setup-notice" role="status">
          Não foi possível conectar ao Supabase. Confira a URL e a chave configuradas.
        </p>
      )}

      {showCategories ? (
        <section aria-label="Categorias" className="category-grid" ref={gridRef}>
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.slug);
            const count = channels.filter(
              (channel) => channel.categorySlug === category.slug,
            ).length;

            return (
              <button
                className="category-card"
                data-catalog-card
                data-slug={category.slug}
                key={category.slug}
                onClick={() => selectCategory(category.slug)}
                type="button"
              >
                <span className="category-card__icon">
                  <Icon size={27} strokeWidth={1.8} />
                </span>
                <span className="category-card__copy">
                  <span className="category-card__name">{category.name}</span>
                  <span className="category-card__count">
                    {count === 1 ? "1 canal" : count + " canais"}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="category-card__arrow"
                  size={19}
                />
              </button>
            );
          })}
        </section>
      ) : (
        <section
          aria-label={selectedCategory ? selectedCategory.name : "Canais encontrados"}
          className="channel-grid"
          ref={gridRef}
        >
          {matchingChannels.map((channel) => (
            <ChannelCard channel={channel} key={channel.id} mode={mode} />
          ))}
          {matchingChannels.length === 0 && (
            <div className="empty-state">
              <span className="empty-state__icon" aria-hidden="true">
                <Search size={25} />
              </span>
              <h2>
                {channels.length === 0
                  ? "Ainda não há canais publicados"
                  : "Nenhum canal encontrado"}
              </h2>
              <p>
                {channels.length === 0
                  ? "Quando novos canais forem publicados, eles aparecerão aqui."
                  : "Tente outra busca ou volte para escolher uma categoria."}
              </p>
              {selectedCategory && (
                <button
                  className="text-button"
                  onClick={returnToCategories}
                  type="button"
                >
                  Voltar às categorias
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {mode === "tv" && (
        <p className="tv-hint">
          Use as setas para navegar <span aria-hidden="true">·</span> OK ou Enter para abrir
        </p>
      )}
      <footer className="catalog-footer">
        <span>CanalMix</span>
        <span>Canais da internet em um só lugar.</span>
        <Link href="/admin/login">Área administrativa</Link>
      </footer>
    </main>
  );
}
