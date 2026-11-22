"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ChannelCardData } from "@/lib/channels";
import type { GameBroadcastData, GameScheduleData } from "@/lib/games";
import { normalizeYouTubeVideoUrl } from "@/lib/youtube-video";
import {
  brasiliaDateKey,
  BRASILIA_TIME_ZONE,
  formatBrasiliaDateLong,
  formatBrasiliaTime,
  GAME_SCHEDULE_RETENTION_MS,
} from "@/lib/game-schedule";
import { TeamCrest } from "@/components/team-crest";
import { EmbedFrame } from "@/components/embed-frame";

type PublicGameScheduleProps = {
  games: GameScheduleData[];
  channels: ChannelCardData[];
  mode: "site" | "tv";
  previewCount?: number;
  showHeading?: boolean;
  showAllLink?: boolean;
};

const TV_SCHEDULE_RETURN_KEY = "canalmix.catalog-return.tv.schedule";

type TransmissionOption =
  | { kind: "youtube"; broadcast: GameBroadcastData; embedUrl: string }
  | { kind: "channel"; broadcast: GameBroadcastData; channel: ChannelCardData };

type BrazilianTransmissions =
  | { kind: "available"; options: TransmissionOption[]; names: string[] }
  | { kind: "names"; names: string[] }
  | { kind: "unconfirmed"; names: string[] };

function focusKey(gameId: string, broadcastId?: string, kind?: TransmissionOption["kind"]) {
  return broadcastId
    ? `game-${gameId}-broadcast-${broadcastId}${kind ? `-${kind}` : ""}`
    : `game-${gameId}`;
}

function rememberTvFocus(mode: "site" | "tv", slug: string) {
  if (mode !== "tv") return;
  try {
    window.sessionStorage.setItem(TV_SCHEDULE_RETURN_KEY, JSON.stringify({
      path: window.location.pathname,
      mode: "tv",
      slug,
      section: "schedule",
      categorySlug: null,
      query: "",
      scrollY: window.scrollY,
    }));
  } catch {
    // Focus falls back to the TV catalog if browser storage is unavailable.
  }
}

function groupByBrasiliaDate(games: GameScheduleData[]) {
  const groups = new Map<string, GameScheduleData[]>();
  for (const game of games) {
    const date = brasiliaDateKey(game.startsAt);
    const rows = groups.get(date) ?? [];
    rows.push(game);
    groups.set(date, rows);
  }
  return [...groups.entries()];
}

function getBrazilianTransmissions(
  game: GameScheduleData,
  publishedChannels: Map<string, ChannelCardData>,
): BrazilianTransmissions {
  const broadcasts = game.broadcasts
    .filter((broadcast) => broadcast.countryCode.toUpperCase() === "BR")
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const options: TransmissionOption[] = [];
  const names: string[] = [];
  for (const broadcast of broadcasts) {
    const embedUrl = normalizeYouTubeVideoUrl(broadcast.youtubeVideoUrl ?? "");
    const channel = broadcast.channelId
      ? publishedChannels.get(broadcast.channelId)
      : undefined;

    const broadcastOptions: TransmissionOption[] = [];
    if (channel) broadcastOptions.push({ kind: "channel", broadcast, channel });
    if (embedUrl) broadcastOptions.push({ kind: "youtube", broadcast, embedUrl });

    if (broadcastOptions.length) {
      options.push(...broadcastOptions);
      continue;
    }

    const name = /^premiere$/i.test(broadcast.broadcasterName.trim())
      ? "Premiere — canal a confirmar"
      : broadcast.broadcasterName.trim();
    if (name) names.push(name);
  }

  const uniqueNames = [...new Map(
    names.map((name) => [name.toLocaleLowerCase("pt-BR"), name]),
  ).values()];
  options.sort((left, right) =>
    Number(right.broadcast.isPrimary) - Number(left.broadcast.isPrimary)
    || left.broadcast.sortOrder - right.broadcast.sortOrder,
  );

  if (options.length) return { kind: "available", options, names: uniqueNames };
  return uniqueNames.length
    ? { kind: "names", names: uniqueNames }
    : { kind: "unconfirmed", names: [] };
}

export function PublicGameSchedule({
  games,
  channels,
  mode,
  previewCount,
  showHeading = true,
  showAllLink = true,
}: PublicGameScheduleProps) {
  const [scheduleClock, setScheduleClock] = useState<number | null>(null);
  const [activeYoutubeBroadcastId, setActiveYoutubeBroadcastId] = useState<string | null>(null);
  const sortedGames = [...games].sort(
    (left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt),
  );
  const retainedGames = scheduleClock === null
    ? sortedGames
    : sortedGames.filter(
      (game) => Date.parse(game.startsAt) + GAME_SCHEDULE_RETENTION_MS > scheduleClock,
    );
  const visibleGames = typeof previewCount === "number"
    ? retainedGames.slice(0, previewCount)
    : retainedGames;
  const dayGroups = groupByBrasiliaDate(visibleGames);
  const publishedChannels = new Map(
    channels
      .filter((channel) => channel.isPublished && channel.embedUrls.length > 0)
      .map((channel) => [channel.id, channel]),
  );

  useEffect(() => {
    const refreshScheduleClock = () => setScheduleClock(Date.now());
    refreshScheduleClock();
    const intervalId = window.setInterval(refreshScheduleClock, 30_000);
    window.addEventListener("focus", refreshScheduleClock);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshScheduleClock);
    };
  }, []);

  useEffect(() => {
    if (mode !== "tv") return;
    requestAnimationFrame(() => {
      try {
        const raw = window.sessionStorage.getItem(TV_SCHEDULE_RETURN_KEY);
        if (!raw) return;
        const snapshot = JSON.parse(raw) as { path?: string; mode?: string; section?: string; slug?: string };
        if (snapshot.path !== window.location.pathname || snapshot.mode !== "tv" || snapshot.section !== "schedule" || !snapshot.slug) return;
        const target = document.querySelector<HTMLElement>(`[data-schedule-focus="${CSS.escape(snapshot.slug)}"]`);
        target?.focus({ preventScroll: true });
        if (target) window.sessionStorage.removeItem(TV_SCHEDULE_RETURN_KEY);
      } catch {
        // The normal TV focus navigation remains available without the snapshot.
      }
    });
  }, [mode, visibleGames.length]);

  return (
    <section aria-labelledby="public-game-schedule-title" className={`public-game-schedule${mode === "tv" ? " public-game-schedule--tv" : ""}`}>
      {showHeading && (
        <header className="public-game-schedule__heading">
          <div>
            <p className="eyebrow">Próximos eventos</p>
            <h2 id="public-game-schedule-title">Grade de jogos</h2>
          </div>
          {showAllLink && (
            <Link
              className="public-game-schedule__all"
              data-catalog-card={mode === "tv" ? "" : undefined}
              data-list-section={mode === "tv" ? "schedule" : undefined}
              data-schedule-focus="full-schedule"
              data-slug={mode === "tv" ? "full-schedule" : undefined}
              data-tv-schedule-item={mode === "tv" ? "" : undefined}
              href={mode === "tv" ? "/grade?from=tv" : "/grade"}
              onClick={() => rememberTvFocus(mode, "full-schedule")}
            >
              Ver grade completa
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          )}
        </header>
      )}

      {visibleGames.length === 0 ? (
        <p className="public-game-schedule__empty">Nenhum jogo programado no momento</p>
      ) : (
        <div className="public-game-schedule__days">
          {dayGroups.map(([date, dayGames]) => (
            <section aria-labelledby={`schedule-day-${date}`} className="public-game-schedule__day" key={date}>
              <h3 className="public-game-schedule__day-heading" id={`schedule-day-${date}`}>
                {formatBrasiliaDateLong(dayGames[0].startsAt)}
              </h3>
              <div className="public-game-schedule__list">
                {dayGames.map((game) => {
                  const transmission = getBrazilianTransmissions(game, publishedChannels);
                  const activeYoutube = transmission.kind === "available"
                    ? transmission.options.find((option): option is Extract<TransmissionOption, { kind: "youtube" }> =>
                      option.kind === "youtube" && option.broadcast.id === activeYoutubeBroadcastId,
                    )
                    : undefined;

                  return (
                    <article className="public-game-row" id={`jogo-${game.id}`} key={game.id}>
                      <time className="public-game-row__time" dateTime={game.startsAt} title={`Horário de Brasília (${BRASILIA_TIME_ZONE})`}>
                        {formatBrasiliaTime(game.startsAt)}
                      </time>
                      <div className="public-game-row__match">
                        <div className="public-game-row__teams">
                          <div className="public-game-row__team">
                            <TeamCrest shieldUrl={game.homeTeamShieldUrl} />
                            <span className="public-game-row__team-name">{game.homeTeam}</span>
                          </div>
                          <span aria-hidden="true" className="public-game-row__versus">×</span>
                          <div className="public-game-row__team">
                            <TeamCrest shieldUrl={game.awayTeamShieldUrl} />
                            <span className="public-game-row__team-name">{game.awayTeam}</span>
                          </div>
                        </div>
                        <span className="public-game-row__competition">{game.competitionName}</span>
                      </div>
                      <div aria-label="Transmissões no Brasil" className="public-game-row__transmission" role="group">
                        {transmission.kind === "available" ? (
                          <>
                            {transmission.options.map((option) => {
                              const watchSlug = focusKey(game.id, option.broadcast.id, option.kind);

                              if (option.kind === "channel") {
                                const href = `/canais/${encodeURIComponent(option.channel.slug)}?${mode === "tv" ? "from=tv&" : ""}voltar=historico&origem=schedule`;
                                return (
                                  <Link
                                    aria-label={`Assistir no ${option.channel.name}`}
                                    className="public-game-row__watch"
                                    data-catalog-card={mode === "tv" ? "" : undefined}
                                    data-list-section={mode === "tv" ? "schedule" : undefined}
                                    data-schedule-focus={watchSlug}
                                    data-slug={mode === "tv" ? watchSlug : undefined}
                                    data-tv-schedule-item={mode === "tv" ? "" : undefined}
                                    href={href}
                                    key={`${option.broadcast.id}-channel`}
                                    onClick={() => rememberTvFocus(mode, watchSlug)}
                                  >
                                    Assistir no {option.channel.name}
                                  </Link>
                                );
                              }

                              const youtubePlayerOpen = activeYoutubeBroadcastId === option.broadcast.id;
                              return (
                                <button
                                  aria-controls={`youtube-game-${game.id}`}
                                  aria-expanded={youtubePlayerOpen}
                                  aria-label={`Assistir no YouTube: ${option.broadcast.broadcasterName}`}
                                  className="public-game-row__watch"
                                  data-catalog-card={mode === "tv" ? "" : undefined}
                                  data-list-section={mode === "tv" ? "schedule" : undefined}
                                  data-schedule-focus={watchSlug}
                                  data-slug={mode === "tv" ? watchSlug : undefined}
                                  data-tv-schedule-item={mode === "tv" ? "" : undefined}
                                  key={`${option.broadcast.id}-youtube`}
                                  onClick={() => setActiveYoutubeBroadcastId(youtubePlayerOpen ? null : option.broadcast.id)}
                                  type="button"
                                >
                                  {youtubePlayerOpen ? "Fechar player" : `Assistir no YouTube · ${option.broadcast.broadcasterName}`}
                                </button>
                              );
                            })}
                            {transmission.names.length > 0 && (
                              <span className="public-game-row__broadcasters">{transmission.names.join(" · ")}</span>
                            )}
                          </>
                        ) : transmission.kind === "names" ? (
                          <span className="public-game-row__broadcasters">{transmission.names.join(" · ")}</span>
                        ) : (
                          <span className="public-game-row__unconfirmed">Transmissão a confirmar</span>
                        )}
                      </div>
                      {activeYoutube?.kind === "youtube" && (
                        <div
                          aria-label={`Player do jogo ${game.homeTeam} x ${game.awayTeam}`}
                          className="public-game-row__youtube-player"
                          id={`youtube-game-${game.id}`}
                          role="region"
                        >
                          <EmbedFrame
                            className="public-game-row__youtube-frame"
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                            src={activeYoutube.embedUrl}
                            title={`YouTube ${activeYoutube.broadcast.broadcasterName}: ${game.homeTeam} x ${game.awayTeam}`}
                          />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
