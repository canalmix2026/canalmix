"use client";

/* eslint-disable @next/next/no-img-element -- Channel artwork is admin-managed at runtime and is intentionally loaded directly instead of through the Next image optimizer. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { getCategoryIcon, sortCategories } from "@/lib/categories";
import type { ChannelCardData, CatalogResult } from "@/lib/channels";
import type { CategoryOption } from "@/lib/categories";
import type { GameScheduleData } from "@/lib/games";
import { PublicGameSchedule } from "@/components/public-game-schedule";
import {
  EMPTY_LOCAL_CHANNEL_LIBRARY,
  readLocalChannelLibrary,
  subscribeToLocalChannelLibrary,
  type LocalChannelLibrary,
} from "@/lib/local-channel-library";

type CatalogBrowserProps = {
  channels: ChannelCardData[];
  games: GameScheduleData[];
  categories: CategoryOption[];
  mode: "site" | "tv";
  status: CatalogResult["status"];
  initialCategorySlug?: string;
  initialFocusSlug?: string;
  initialQuery?: string;
};

type CatalogReturnSnapshot = {
  path: string;
  mode: "site" | "tv";
  slug: string;
  section: string;
  categorySlug: string | null;
  query: string;
  scrollY: number;
};

function returnSnapshotKey(mode: "site" | "tv") {
  return "canalmix.catalog-return." + mode;
}

function readReturnSnapshot(mode: "site" | "tv"): CatalogReturnSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(returnSnapshotKey(mode));
    if (!raw) {
      return null;
    }
    const snapshot = JSON.parse(raw) as Partial<CatalogReturnSnapshot>;
    if (
      snapshot.path !== window.location.pathname ||
      snapshot.mode !== mode ||
      typeof snapshot.slug !== "string" ||
      typeof snapshot.section !== "string" ||
      typeof snapshot.scrollY !== "number"
    ) {
      return null;
    }
    return snapshot as CatalogReturnSnapshot;
  } catch {
    return null;
  }
}

function ChannelCard({
  channel,
  mode,
  section,
  categorySlug,
  query,
}: {
  channel: ChannelCardData;
  mode: "site" | "tv";
  section: string;
  categorySlug: string | null;
  query: string;
}) {
  const returnParams = new URLSearchParams();
  if (mode === "tv") {
    returnParams.set("from", "tv");
  }
  returnParams.set("voltar", "historico");
  returnParams.set("origem", section);
  if (section === "catalog" && categorySlug) {
    returnParams.set("categoria", categorySlug);
  }
  if (section === "catalog" && query.trim()) {
    returnParams.set("busca", query.trim());
  }
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
      data-list-section={section}
      data-slug={channel.slug}
      aria-label={"Assistir " + channel.name}
      onClick={() => {
        const url = new URL(window.location.href);
        if (section === "catalog" && categorySlug) {
          url.searchParams.set("categoria", categorySlug);
        } else {
          url.searchParams.delete("categoria");
        }
        if (section === "catalog" && query.trim()) {
          url.searchParams.set("busca", query.trim());
        } else {
          url.searchParams.delete("busca");
        }
        url.searchParams.set("foco", channel.slug);
        try {
          const snapshot: CatalogReturnSnapshot = {
            path: window.location.pathname,
            mode,
            slug: channel.slug,
            section,
            categorySlug,
            query,
            scrollY: window.scrollY,
          };
          window.sessionStorage.setItem(returnSnapshotKey(mode), JSON.stringify(snapshot));
        } catch {
          // Return navigation and browser focus still work when session storage is disabled.
        }
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
  games,
  categories: categoryOptions,
  mode,
  status,
  initialCategorySlug,
  initialFocusSlug,
  initialQuery,
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
  const [query, setQuery] = useState(() =>
    typeof window === "undefined"
      ? initialQuery ?? ""
      : new URLSearchParams(window.location.search).get("busca") ?? "",
  );
  const [lastCategorySlug, setLastCategorySlug] = useState<string | null>(null);
  const [library, setLibrary] = useState<LocalChannelLibrary>(EMPTY_LOCAL_CHANNEL_LIBRARY);
  const catalogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const syncLibrary = () => setLibrary(readLocalChannelLibrary());
    syncLibrary();
    return subscribeToLocalChannelLibrary(syncLibrary);
  }, []);

  useEffect(() => {
    function syncCategoryFromHistory() {
      const params = new URLSearchParams(window.location.search);
      const nextCategorySlug = params.get("categoria");
      setLastCategorySlug((current) => categorySlug ?? current);
      setCategorySlug(nextCategorySlug);
      setFocusSlug(params.get("foco"));
      setQuery(params.get("busca") ?? "");
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
  const channelById = useMemo(
    () => new Map(channels.filter((channel) => channel.isPublished).map((channel) => [channel.id, channel])),
    [channels],
  );
  const favoriteChannels = library.favorites
    .map((id) => channelById.get(id))
    .filter((channel): channel is ChannelCardData => Boolean(channel));

  const focusCatalogCard = useCallback(
    (slug?: string | null, section?: string | null, preventScroll = false) => {
      if (mode !== "tv") {
        return;
      }

      requestAnimationFrame(() => {
        const root = catalogRef.current;
        if (!root) {
          return;
        }
        const escapedSlug =
          slug && typeof CSS !== "undefined" && CSS.escape ? CSS.escape(slug) : slug;
      const sectionSelector = section ? `[data-list-section="${section}"]` : "";
        const target = escapedSlug
          ? root.querySelector<HTMLElement>(
              `[data-catalog-card][data-slug="${escapedSlug}"]${sectionSelector ? `[data-list-section="${section}"]` : ""}`,
            )
          : null;
        const fallbackSelector = selectedCategory
          ? '[data-list-section="catalog"][data-catalog-card], [data-list-section="categories"][data-catalog-card], [data-catalog-card]'
          : '[data-list-section="categories"][data-catalog-card], [data-catalog-card]';
        const fallback = root.querySelector<HTMLElement>(fallbackSelector);
        if (target) {
          target.focus({ preventScroll });
        } else {
          fallback?.focus({ preventScroll: false });
        }
      });
    },
    [mode, selectedCategory],
  );

  useEffect(() => {
    if (mode !== "tv") {
      return;
    }
    const snapshot = readReturnSnapshot(mode);
    if (snapshot) {
      try {
        window.sessionStorage.removeItem(returnSnapshotKey(mode));
      } catch {
        // The snapshot is optional; focus falls back to the catalog below.
      }
      if (snapshot.categorySlug === categorySlug) {
        window.scrollTo({ top: snapshot.scrollY, behavior: "auto" });
        focusCatalogCard(snapshot.slug, snapshot.section, true);
        return;
      }
    }
    focusCatalogCard(
      categorySlug ? focusSlug : lastCategorySlug,
      categorySlug ? "catalog" : "categories",
    );
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

    if (["Escape", "Backspace", "BrowserBack", "GoBack"].includes(event.key) && categorySlug) {
      event.preventDefault();
      returnToCategories();
      return;
    }

    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }
    const focusedCard = (event.target as HTMLElement).closest<HTMLElement>("[data-catalog-card]");
    if (!focusedCard) {
      return;
    }
    const items = Array.from(
      catalogRef.current?.querySelectorAll<HTMLElement>("[data-catalog-card]") ?? [],
    ).filter((item) => !item.hasAttribute("disabled"));
    const rect = focusedCard.getBoundingClientRect();
    const currentX = rect.left + rect.width / 2;
    const currentY = rect.top + rect.height / 2;
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!direction) {
      return;
    }
    const [dx, dy] = direction;
    const nextItem = items
      .filter((item) => item !== focusedCard)
      .map((item) => {
        const candidate = item.getBoundingClientRect();
        const deltaX = candidate.left + candidate.width / 2 - currentX;
        const deltaY = candidate.top + candidate.height / 2 - currentY;
        const forward = dx !== 0 ? deltaX * dx : deltaY * dy;
        const cross = dx !== 0 ? Math.abs(deltaY) : Math.abs(deltaX);
        return { item, score: forward > 0 ? forward + cross * 1.7 : Number.POSITIVE_INFINITY };
      })
      .filter((candidate) => Number.isFinite(candidate.score))
      .sort((first, second) => first.score - second.score)[0]?.item;

    if (nextItem) {
      event.preventDefault();
      nextItem.focus({ preventScroll: false });
    }
  }

  const showSearchResults = query.trim().length > 0;
  const showCategories = !selectedCategory && !showSearchResults;

  return (
    <main
      className={"catalog catalog--" + mode}
      onKeyDown={handleGridKeyDown}
      ref={catalogRef}
    >
      <section className="catalog__intro">
        {selectedCategory ? (
          <button className="back-link" onClick={returnToCategories} type="button">
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
          placeholder={selectedCategory ? "Buscar nesta categoria" : "Buscar por nome do canal"}
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

      {showCategories && (
        <>
          <section aria-labelledby="my-channels-title" className="channel-library-section">
            <div className="channel-library-section__heading">
              <h2 id="my-channels-title">Meus canais</h2>
            </div>
            {favoriteChannels.length > 0 ? (
              <div aria-label="Meus canais" className="channel-grid">
                {favoriteChannels.map((channel) => (
                  <ChannelCard
                    categorySlug={null}
                    channel={channel}
                    key={channel.id}
                    mode={mode}
                    query=""
                    section="favorites"
                  />
                ))}
              </div>
            ) : (
              <p className="channel-library-section__empty">
                Favorite um canal para encontrá-lo aqui.
              </p>
            )}
          </section>
          <PublicGameSchedule
            channels={channels}
            games={games}
            mode={mode}
            previewCount={5}
          />
        </>
      )}

      {showCategories ? (
        <section aria-labelledby="categories-title" className="catalog-categories-section">
          <div className="channel-library-section__heading">
            <h2 id="categories-title">Categorias</h2>
          </div>
          <div className="category-grid">
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.slug);
              const count = channels.filter((channel) => channel.categorySlug === category.slug).length;
              return (
                <button
                  className="category-card"
                  data-catalog-card
                  data-list-section="categories"
                  data-slug={category.slug}
                  key={category.slug}
                  onClick={() => selectCategory(category.slug)}
                  type="button"
                >
                  <span className="category-card__icon"><Icon size={27} strokeWidth={1.8} /></span>
                  <span className="category-card__copy">
                    <span className="category-card__name">{category.name}</span>
                    <span className="category-card__count">{count === 1 ? "1 canal" : count + " canais"}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="category-card__arrow" size={19} />
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section
          aria-label={selectedCategory ? selectedCategory.name : "Canais encontrados"}
          className="channel-grid"
        >
          {matchingChannels.map((channel) => (
            <ChannelCard
              categorySlug={categorySlug}
              channel={channel}
              key={channel.id}
              mode={mode}
              query={query}
              section="catalog"
            />
          ))}
          {matchingChannels.length === 0 && (
            <div className="empty-state">
              <span className="empty-state__icon" aria-hidden="true"><Search size={25} /></span>
              <h2>{channels.length === 0 ? "Ainda não há canais publicados" : "Nenhum canal encontrado"}</h2>
              <p>
                {channels.length === 0
                  ? "Quando novos canais forem publicados, eles aparecerão aqui."
                  : "Tente outra busca ou volte para escolher uma categoria."}
              </p>
              {selectedCategory && (
                <button className="text-button" onClick={returnToCategories} type="button">
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
        <Link className="catalog-footer__about" href="/sobre-nos">Sobre nós</Link>
        <Link href="/admin/login">Área administrativa</Link>
      </footer>
    </main>
  );
}
