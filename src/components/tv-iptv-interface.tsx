"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Play, Tv2 } from "lucide-react";
import { ChannelPlayer } from "@/components/channel-player";
import type { CatalogResult, ChannelCardData } from "@/lib/channels";
import type { CategoryOption } from "@/lib/categories";
import {
  DEFAULT_EMBED_REFERRER_POLICY,
  type EmbedReferrerPolicy,
} from "@/lib/embed-provider-policy-core";
import { getTvRemoteKey } from "@/lib/tv-remote";
import { getChannelEmbedSourceUrl, type ChannelEmbedSource } from "@/lib/channel-embed-sources";

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
  source: ChannelEmbedSource;
  url: string;
  optionNumber: number;
  referrerPolicy: EmbedReferrerPolicy;
};

type TvIptvView =
  | { kind: "categories" }
  | { kind: "options"; categorySlug: string };

const TV_ITEM_SELECTOR = "[data-tv-iptv-item]";
const TV_PLAYER_SELECTOR = ".tv-iptv__main .channel-player";

type TvIptvKeyboardEvent = Pick<
  globalThis.KeyboardEvent,
  "key" | "code" | "keyCode" | "which"
>;

function getTvIptvRemoteKey(event: TvIptvKeyboardEvent) {
  if (
    [
      "Enter",
      "NumpadEnter",
      "Return",
      "Accept",
      "Select",
      "OK",
      "Ok",
      "Go",
      "BrowserSelect",
      " ",
      "Spacebar",
    ].includes(event.key) ||
    ["Enter", "NumpadEnter", "Space"].includes(event.code)
  ) {
    return "Enter";
  }

  const remoteKeyAliases: Record<string, string> = {
    arrowup: "ArrowUp",
    up: "ArrowUp",
    dpadup: "ArrowUp",
    navigateup: "ArrowUp",
    arrowdown: "ArrowDown",
    down: "ArrowDown",
    dpaddown: "ArrowDown",
    navigatedown: "ArrowDown",
    arrowleft: "ArrowLeft",
    left: "ArrowLeft",
    dpadleft: "ArrowLeft",
    navigateleft: "ArrowLeft",
    arrowright: "ArrowRight",
    right: "ArrowRight",
    dpadright: "ArrowRight",
    navigateright: "ArrowRight",
  };

  for (const value of [event.key, event.code]) {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const alias = remoteKeyAliases[normalized];
    if (alias) return alias;
  }
  const key = getTvRemoteKey(event);
  if (key !== event.key) return key;

  switch (event.keyCode || event.which) {
    case 13:
    case 23:
    case 66:
    case 160:
      return "Enter";
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
  const [focusedItemKey, setFocusedItemKey] = useState<string | null>(() =>
    categories[0] ? `category:${categories[0].slug}` : null,
  );
  const initialFocusedItemKey = categories[0]
    ? `category:${categories[0].slug}`
    : null;
  const lastFocusedItemKeyRef = useRef<string | null>(initialFocusedItemKey);
  const lastCategorySlugRef = useRef<string | null>(null);
  const lastEnterKeyDownAtRef = useRef(0);
  const lastArrowKeyDownRef = useRef<string | null>(null);
  const categoryButtonsRef = useRef(new Map<string, HTMLButtonElement>());
  const optionButtonsRef = useRef(new Map<string, HTMLButtonElement>());
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const playerStageRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLElement | null>(null);

  const options = useMemo(() => {
    const result: TvIptvOption[] = [];

    for (const channel of channels) {
      channel.embedSources.forEach((source, index) => {
        const url = getChannelEmbedSourceUrl(source).trim();
        if (!url) return;
        const optionNumber = index + 1;
        const sourceId = source.id;
        const fallbackPolicy = DEFAULT_EMBED_REFERRER_POLICY;
        result.push({
          key: `${channel.id}:${sourceId || "source"}:${index}`,
          channel,
          sourceId,
          source,
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
  const visibleOptions = useMemo(
    () =>
      view.kind === "options"
        ? optionsByCategory.get(view.categorySlug) ?? []
        : [],
    [optionsByCategory, view],
  );

  const focusListItem = useCallback((item: HTMLElement | null) => {
    if (!item) return;
    const itemKey = item.dataset.tvIptvKey;
    if (itemKey) {
      lastFocusedItemKeyRef.current = itemKey;
      setFocusedItemKey(itemKey);
    }
    try {
      item.focus({ preventScroll: true });
    } catch {
      item.focus();
    }

    if (document.activeElement !== item) item.focus();

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
    const focusVisibleItem = () => {
      if (view.kind === "categories") {
        const rememberedKey = lastFocusedItemKeyRef.current;
        const rememberedSlug = rememberedKey?.startsWith("category:")
          ? rememberedKey.slice("category:".length)
          : null;
        const slug =
          rememberedSlug ?? lastCategorySlugRef.current ?? categories[0]?.slug;
        focusListItem(slug ? categoryButtonsRef.current.get(slug) ?? null : null);
        return;
      }

      const firstOption = visibleOptions[0];
      focusListItem(
        firstOption
          ? optionButtonsRef.current.get(firstOption.key) ?? null
          : backButtonRef.current,
      );
    };

    const frame = window.requestAnimationFrame(focusVisibleItem);
    const startupFocusFallback =
      view.kind === "categories"
        ? window.setTimeout(() => {
            if (
              document.activeElement === document.body ||
              document.activeElement === document.documentElement
            ) {
              focusVisibleItem();
            }
          }, 350)
        : null;

    return () => {
      window.cancelAnimationFrame(frame);
      if (startupFocusFallback !== null) {
        window.clearTimeout(startupFocusFallback);
      }
    };
  }, [categories, focusListItem, view, visibleOptions]);

  const openCategory = useCallback(
    (categorySlug: string) => {
      lastCategorySlugRef.current = categorySlug;
      const firstOption = optionsByCategory.get(categorySlug)?.[0];
      const nextFocusedKey = firstOption ? `option:${firstOption.key}` : "back";
      lastFocusedItemKeyRef.current = nextFocusedKey;
      setFocusedItemKey(nextFocusedKey);
      if (listRef.current) listRef.current.scrollTop = 0;
      setView({ kind: "options", categorySlug });
    },
    [optionsByCategory],
  );

  const returnToCategories = useCallback(() => {
    const categorySlug = lastCategorySlugRef.current ?? categories[0]?.slug;
    const nextFocusedKey = categorySlug ? `category:${categorySlug}` : null;
    lastFocusedItemKeyRef.current = nextFocusedKey;
    setFocusedItemKey(nextFocusedKey);
    if (listRef.current) listRef.current.scrollTop = 0;
    setView({ kind: "categories" });
  }, [categories]);

  function handleSidebarBlur(event: FocusEvent<HTMLElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setFocusedItemKey(null);
  }

  const getSidebarItem = useCallback(
    (target: EventTarget | null) => {
      const sidebar = sidebarRef.current;
      if (!sidebar) return null;

      const items = Array.from(
        sidebar.querySelectorAll<HTMLElement>(TV_ITEM_SELECTOR),
      ).filter((item) => !item.hasAttribute("disabled"));
      const targetElement = target instanceof Element ? target : null;
      const activeElement =
        document.activeElement instanceof Element ? document.activeElement : null;

      for (const candidate of [targetElement, activeElement]) {
        const item = candidate?.closest<HTMLElement>(TV_ITEM_SELECTOR);
        if (item && sidebar.contains(item)) return item;
      }

      const preferredKey = lastFocusedItemKeyRef.current ?? focusedItemKey;
      return (
        items.find((item) => item.dataset.tvIptvKey === preferredKey) ??
        items[0] ??
        null
      );
    },
    [focusedItemKey],
  );

  const focusPlayer = useCallback(() => {
    const stage = playerStageRef.current;
    const target = stage?.querySelector<HTMLElement>("iframe, video") ?? stage;
    if (!target) return;

    target.focus({ preventScroll: true });
    setFocusedItemKey(null);
  }, []);

  useEffect(() => {
    function isInsidePlayer(target: EventTarget | null) {
      return target instanceof Element && Boolean(target.closest(TV_PLAYER_SELECTOR));
    }

    function shouldHandleRemoteInput(
      event: globalThis.KeyboardEvent,
      key: string,
    ) {
      const target = event.target instanceof Element ? event.target : null;
      const activeElement =
        document.activeElement instanceof Element ? document.activeElement : null;

      const isCategoryVerticalNavigation =
        view.kind === "categories" &&
        (key === "ArrowUp" || key === "ArrowDown");

      if (isInsidePlayer(target)) return false;
      if (isCategoryVerticalNavigation) return true;
      if (isInsidePlayer(activeElement)) return false;

      const sidebar = sidebarRef.current;
      if (
        sidebar &&
        ((target && sidebar.contains(target)) ||
          (activeElement && sidebar.contains(activeElement)))
      ) {
        return true;
      }

      if (target === playerStageRef.current || activeElement === playerStageRef.current) {
        return true;
      }

      return (
        !activeElement ||
        activeElement === document.body ||
        activeElement === document.documentElement
      );
    }

    function handleRemoteKey(
      event: globalThis.KeyboardEvent,
      phase: "down" | "up",
    ) {
      const key = getTvIptvRemoteKey(event);
      if (!shouldHandleRemoteInput(event, key)) return;

      const isVerticalNavigationKey = key === "ArrowUp" || key === "ArrowDown";
      if (isVerticalNavigationKey) {
        if (phase === "down") {
          lastArrowKeyDownRef.current = key;
        } else if (lastArrowKeyDownRef.current === key) {
          lastArrowKeyDownRef.current = null;
          return;
        }
      } else if (phase === "down") {
        lastArrowKeyDownRef.current = null;
      }

      if (phase === "down" && key !== "Enter") {
        lastEnterKeyDownAtRef.current = 0;
      }

      if (
        phase === "down" &&
        (key === "Back" || key === "ArrowLeft") &&
        view.kind === "options"
      ) {
        event.preventDefault();
        event.stopPropagation();
        returnToCategories();
        return;
      }

      if (phase === "up" && key !== "Enter" && !isVerticalNavigationKey) return;

      if (key === "Enter") {
        const item = getSidebarItem(event.target);
        if (!item) return;

        event.preventDefault();
        event.stopPropagation();
        if (phase === "up") {
          if (Date.now() - lastEnterKeyDownAtRef.current < 900) {
            lastEnterKeyDownAtRef.current = 0;
            return;
          }
        } else {
          lastEnterKeyDownAtRef.current = Date.now();
        }

        if (!event.repeat) item.click();
        return;
      }

      if (phase === "up" && !isVerticalNavigationKey) return;

      const eventTarget = event.target instanceof Element ? event.target : null;
      const activeElement =
        document.activeElement instanceof Element ? document.activeElement : null;
      const stageHasFocus =
        eventTarget === playerStageRef.current ||
        activeElement === playerStageRef.current;

      if (key === "ArrowLeft" && stageHasFocus) {
        event.preventDefault();
        event.stopPropagation();
        focusListItem(getSidebarItem(event.target));
        return;
      }

      if (key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        focusPlayer();
        return;
      }

      if (key !== "ArrowUp" && key !== "ArrowDown") return;

      const sidebar = sidebarRef.current;
      if (!sidebar) return;
      const items = Array.from(
        sidebar.querySelectorAll<HTMLElement>(TV_ITEM_SELECTOR),
      ).filter((item) => !item.hasAttribute("disabled"));
      if (items.length === 0) return;

      const rememberedItem = items.find(
        (item) => item.dataset.tvIptvKey === lastFocusedItemKeyRef.current,
      );
      const currentItem = rememberedItem ?? getSidebarItem(event.target);
      const currentIndex = currentItem ? items.indexOf(currentItem) : -1;
      const direction = key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        currentIndex < 0
          ? 0
          : Math.max(0, Math.min(items.length - 1, currentIndex + direction));

      event.preventDefault();
      event.stopPropagation();
      focusListItem(items[nextIndex]);
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) =>
      handleRemoteKey(event, "down");
    const handleKeyUp = (event: globalThis.KeyboardEvent) =>
      handleRemoteKey(event, "up");

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [focusListItem, focusPlayer, getSidebarItem, returnToCategories, view]);

  return (
    <main className="tv-iptv">
      <div className="tv-iptv__workspace">
        <aside
          aria-label="Navegação de canais"
          className="tv-iptv__sidebar"
          onBlurCapture={handleSidebarBlur}
          ref={sidebarRef}
        >
          <div className="tv-iptv__sidebar-top">
            <span aria-label="CanalMix" className="brand" role="img">
              <span aria-hidden="true" className="brand__symbol">
                <span className="brand__screen brand__screen--back" />
                <span className="brand__screen brand__screen--front">
                  <Play fill="currentColor" size={22} strokeWidth={1.5} />
                </span>
              </span>
              <span className="brand__wordmark">
                Canal<span>Mix</span>
              </span>
            </span>
            <Link
              className={
                "tv-iptv__exit" +
                (focusedItemKey === "exit" ? " tv-iptv__exit--focused" : "")
              }
              data-tv-iptv-item
              data-tv-iptv-key="exit"
              href="/"
              onFocus={() => {
                lastFocusedItemKeyRef.current = "exit";
                setFocusedItemKey("exit");
              }}
            >
              <ArrowLeft aria-hidden="true" size={17} />
              <span>Sair do Modo TV</span>
            </Link>
          </div>

          {view.kind === "options" && (
            <button
              className={
                "tv-iptv__back" +
                (focusedItemKey === "back" ? " tv-iptv__item--focused" : "")
              }
              data-tv-iptv-key="back"
              data-tv-iptv-item
              autoFocus={visibleOptions.length === 0}
              onClick={returnToCategories}
              onFocus={() => {
                lastFocusedItemKeyRef.current = "back";
                setFocusedItemKey("back");
              }}
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
                      className={
                        "tv-iptv__item" +
                        (focusedItemKey === `category:${category.slug}`
                          ? " tv-iptv__item--focused"
                          : "")
                      }
                      data-tv-iptv-key={`category:${category.slug}`}
                      data-tv-iptv-item
                      autoFocus={focusedItemKey === `category:${category.slug}`}
                      key={category.slug}
                      onClick={() => openCategory(category.slug)}
                      onFocus={() =>
                        {
                          lastFocusedItemKeyRef.current =
                            `category:${category.slug}`;
                          setFocusedItemKey(`category:${category.slug}`);
                        }
                      }
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
                      (focusedItemKey === `option:${option.key}`
                        ? " tv-iptv__item--focused"
                        : "") +
                      (isPlaying ? " tv-iptv__item--playing" : "")
                    }
                    data-tv-iptv-key={`option:${option.key}`}
                    data-tv-iptv-item
                    autoFocus={option.key === visibleOptions[0]?.key}
                    key={option.key}
                    onClick={() => setPlayingOptionKey(option.key)}
                    onFocus={() => {
                      lastFocusedItemKeyRef.current = `option:${option.key}`;
                      setFocusedItemKey(`option:${option.key}`);
                    }}
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
          <div
            className="tv-iptv__video-stage"
            ref={playerStageRef}
            tabIndex={-1}
          >
            {activeOption ? (
              <>
                <ChannelPlayer
                  key={activeOption.key}
                  channelId={activeOption.channel.id}
                  channelName={activeOption.channel.name}
                  officialUrl={activeOption.channel.officialUrl}
                  embedUrls={[activeOption.url]}
                  embedSources={[activeOption.source]}
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
        <span className="tv-iptv__hint tv-iptv__hint--player">
          <kbd>→</kbd><span>Focar player</span>
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
