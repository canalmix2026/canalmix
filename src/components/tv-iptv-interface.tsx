"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Tv2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ChannelPlayer } from "@/components/channel-player";
import type { CatalogResult, ChannelCardData } from "@/lib/channels";
import type { CategoryOption } from "@/lib/categories";
import {
  DEFAULT_EMBED_REFERRER_POLICY,
  type EmbedReferrerPolicy,
} from "@/lib/embed-provider-policy-core";
import { getTvRemoteKey } from "@/lib/tv-remote";

type TvIptvProps = {
  channels: ChannelCardData[];
  categories: CategoryOption[];
  status: CatalogResult["status"];
  referrerPoliciesByChannel: Record<string, EmbedReferrerPolicy[]>;
};

type TvIptvOption = {
  key: string;
  channel: ChannelCardData;
  sourceId: string;
  url: string;
  optionNumber: number;
  referrerPolicy: EmbedReferrerPolicy;
};

type TvIptvView =
  | { kind: "categories" }
  | { kind: "options"; categorySlug: string };

const TV_ITEM_SELECTOR = "[data-tv-iptv-item]";

function getTvIptvRemoteKey(event: KeyboardEvent) {
  const key = getTvRemoteKey(event.nativeEvent);
  if (key !== event.key) return key;

  switch (event.keyCode || event.which) {
    case 19:
      return "ArrowUp";
    case 20:
      return "ArrowDown";
    case 21:
      return "ArrowLeft";
    case 22:
      return "ArrowRight";
    default:
      return key;
  }
}

export function TvIptvInterface({
  channels,
  categories,
  status,
  referrerPoliciesByChannel,
}: TvIptvProps) {
  const [view, setView] = useState<TvIptvView>({ kind: "categories" });
  const [playingOptionKey, setPlayingOptionKey] = useState<string | null>(null);
  const lastCategorySlugRef = useRef<string | null>(null);
  const categoryButtonsRef = useRef(new Map<string, HTMLButtonElement>());
  const optionButtonsRef = useRef(new Map<string, HTMLButtonElement>());
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLElement | null>(null);

  const options = useMemo(() => {
    const result: TvIptvOption[] = [];

    for (const channel of channels) {
      const seenUrls = new Set<string>();
      let optionNumber = 0;

      channel.embedUrls.forEach((rawUrl, index) => {
        const url = rawUrl.trim();
        if (!url || seenUrls.has(url)) return;
        seenUrls.add(url);
        optionNumber += 1;

        const sourceId = channel.embedSourceIds[index] ?? "";
        const fallbackPolicy = DEFAULT_EMBED_REFERRER_POLICY;
        result.push({
          key: `${channel.id}:${sourceId || "source"}:${index}`,
          channel,
          sourceId,
          url,
          optionNumber,
          referrerPolicy:
            referrerPoliciesByChannel[channel.id]?.[index] ?? fallbackPolicy,
        });
      });
    }

    return result;
  }, [channels, referrerPoliciesByChannel]);

  const optionsByCategory = useMemo(() => {
    const grouped = new Map<string, TvIptvOption[]>(
      categories.map((category) => [category.slug, []]),
    );

    for (const option of options) {
      grouped.get(option.channel.categorySlug)?.push(option);
    }

    return grouped;
  }, [categories, options]);

  const activeOption = options.find((option) => option.key === playingOptionKey) ?? null;
  const activeCategory =
    view.kind === "options"
      ? categories.find((category) => category.slug === view.categorySlug) ?? null
      : null;
  const visibleOptions =
    view.kind === "options"
      ? optionsByCategory.get(view.categorySlug) ?? []
      : [];

  const focusListItem = useCallback((item: HTMLElement | null) => {
    if (!item) return;
    item.focus({ preventScroll: true });

    const list = listRef.current;
    if (!list?.contains(item)) return;

    const itemRect = item.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    if (itemRect.top < listRect.top) {
      list.scrollTop -= listRect.top - itemRect.top;
    } else if (itemRect.bottom > listRect.bottom) {
      list.scrollTop += itemRect.bottom - listRect.bottom;
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (view.kind === "categories") {
        const slug = lastCategorySlugRef.current ?? categories[0]?.slug;
        focusListItem(slug ? categoryButtonsRef.current.get(slug) ?? null : null);
        return;
      }

      const firstOption = visibleOptions[0];
      focusListItem(
        firstOption
          ? optionButtonsRef.current.get(firstOption.key) ?? null
          : backButtonRef.current,
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [categories, focusListItem, view, visibleOptions]);

  function openCategory(categorySlug: string) {
    lastCategorySlugRef.current = categorySlug;
    if (listRef.current) listRef.current.scrollTop = 0;
    setView({ kind: "options", categorySlug });
  }

  function returnToCategories() {
    if (listRef.current) listRef.current.scrollTop = 0;
    setView({ kind: "categories" });
  }

  function handleRemoteNavigation(event: KeyboardEvent<HTMLElement>) {
    const key = getTvIptvRemoteKey(event);

    if ((key === "Back" || key === "ArrowLeft") && view.kind === "options") {
      event.preventDefault();
      event.stopPropagation();
      returnToCategories();
      return;
    }

    const focusedItem =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLElement>(TV_ITEM_SELECTOR)
        : null;
    if (!focusedItem || !event.currentTarget.contains(focusedItem)) return;

    if (key === "Enter") {
      event.preventDefault();
      if (focusedItem instanceof HTMLButtonElement) focusedItem.click();
      return;
    }

    if (key !== "ArrowUp" && key !== "ArrowDown") return;

    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(TV_ITEM_SELECTOR),
    ).filter((item) => !item.hasAttribute("disabled"));
    const currentIndex = items.indexOf(focusedItem);
    if (currentIndex < 0 || items.length < 1) return;

    event.preventDefault();
    const direction = key === "ArrowDown" ? 1 : -1;
    const nextIndex = (currentIndex + direction + items.length) % items.length;
    focusListItem(items[nextIndex]);
  }

  return (
    <main className="tv-iptv">
      <div className="tv-iptv__workspace">
        <aside
          aria-label="Navegação de canais"
          className="tv-iptv__sidebar"
          onKeyDown={handleRemoteNavigation}
        >
          <div className="tv-iptv__sidebar-top">
            <BrandLogo href="/tv" />
            <Link className="tv-iptv__exit" href="/">
              <ArrowLeft aria-hidden="true" size={17} />
              <span>Sair do Modo TV</span>
            </Link>
          </div>

          {view.kind === "options" && (
            <button
              className="tv-iptv__back"
              data-tv-iptv-item
              onClick={returnToCategories}
              ref={backButtonRef}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={20} />
              <span>Voltar às categorias</span>
            </button>
          )}

          <header className="tv-iptv__sidebar-heading">
            <h1>{activeCategory?.name ?? "Categorias"}</h1>
          </header>

          {status !== "ready" && (
            <p className="tv-iptv__status" role="status">
              {status === "not-configured"
                ? "O catálogo não está configurado neste ambiente."
                : "Não foi possível carregar o catálogo agora."}
            </p>
          )}

          <nav
            aria-label={
              view.kind === "categories"
                ? "Categorias de canais"
                : `Opções de ${activeCategory?.name ?? "canais"}`
            }
            className="tv-iptv__list"
            ref={listRef}
          >
            {view.kind === "categories" ? (
              categories.length > 0 ? (
                categories.map((category) => {
                  const count = optionsByCategory.get(category.slug)?.length ?? 0;
                  return (
                    <button
                      aria-label={`${category.name}, ${count} ${count === 1 ? "opção" : "opções"}`}
                      className="tv-iptv__item"
                      data-tv-iptv-item
                      key={category.slug}
                      onClick={() => openCategory(category.slug)}
                      ref={(element) => {
                        if (element) categoryButtonsRef.current.set(category.slug, element);
                        else categoryButtonsRef.current.delete(category.slug);
                      }}
                      type="button"
                    >
                      <span className="tv-iptv__item-copy">
                        <span>{category.name}</span>
                        <span className="tv-iptv__item-subtitle">
                          {count} {count === 1 ? "opção" : "opções"}
                        </span>
                      </span>
                      <ChevronRight aria-hidden="true" size={22} />
                    </button>
                  );
                })
              ) : (
                <p className="tv-iptv__empty-list">Nenhuma categoria disponível.</p>
              )
            ) : visibleOptions.length > 0 ? (
              visibleOptions.map((option) => {
                const isPlaying = option.key === playingOptionKey;
                return (
                  <button
                    aria-current={isPlaying ? "true" : undefined}
                    aria-label={`${option.channel.name} (Opção ${option.optionNumber})${isPlaying ? ", reproduzindo" : ""}`}
                    className={
                      "tv-iptv__item tv-iptv__option" +
                      (isPlaying ? " tv-iptv__item--playing" : "")
                    }
                    data-tv-iptv-item
                    key={option.key}
                    onClick={() => setPlayingOptionKey(option.key)}
                    ref={(element) => {
                      if (element) optionButtonsRef.current.set(option.key, element);
                      else optionButtonsRef.current.delete(option.key);
                    }}
                    type="button"
                  >
                    {option.channel.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Channel artwork is managed at runtime and may come from any provider.
                      <img
                        alt=""
                        className="tv-iptv__channel-image"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        src={option.channel.thumbnailUrl}
                      />
                    ) : (
                      <span aria-hidden="true" className="tv-iptv__channel-icon">
                        <Tv2 size={22} />
                      </span>
                    )}
                    <span className="tv-iptv__option-name">
                      {option.channel.name} (Opção {option.optionNumber})
                    </span>
                    {isPlaying && <span className="tv-iptv__playing-label">No ar</span>}
                  </button>
                );
              })
            ) : (
              <p className="tv-iptv__empty-list">
                Nenhuma opção disponível nesta categoria.
              </p>
            )}
          </nav>
        </aside>

        <section aria-label="Player de TV" className="tv-iptv__main">
          <div className="tv-iptv__video-stage">
            {activeOption ? (
              <>
                <ChannelPlayer
                  key={activeOption.key}
                  channelId={activeOption.channel.id}
                  channelName={activeOption.channel.name}
                  embedUrls={[activeOption.url]}
                  embedSourceIds={[activeOption.sourceId]}
                  referrerPolicies={[activeOption.referrerPolicy]}
                />
                <span className="tv-iptv__live-badge">AO VIVO</span>
              </>
            ) : (
              <div aria-live="polite" className="tv-iptv__empty-player" role="status">
                <div>
                  <p>Player pronto</p>
                  <span>Escolha uma opção e pressione OK para assistir.</span>
                </div>
              </div>
            )}
          </div>

          <p aria-live="polite" className="tv-iptv__now-playing">
            {activeOption ? (
              <>
                <strong>Assistindo agora:</strong> {activeOption.channel.name}
                <span> · Opção {activeOption.optionNumber}</span>
              </>
            ) : (
              "Selecione uma fonte para iniciar a transmissão."
            )}
          </p>
        </section>
      </div>

      <footer aria-label="Atalhos do controle remoto" className="tv-iptv__remote-bar">
        <span className="tv-iptv__hint">
          <kbd>↑</kbd><kbd>↓</kbd><span>Navegar</span>
        </span>
        <span className="tv-iptv__hint">
          <kbd>OK</kbd><span>{view.kind === "categories" ? "Abrir categoria" : "Assistir"}</span>
        </span>
        {view.kind === "options" && (
          <span className="tv-iptv__hint">
            <kbd>←</kbd><span>Voltar às categorias</span>
          </span>
        )}
      </footer>
    </main>
  );
}
