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

function focusKey(gameId: string, broadcastId?: string) {
  return broadcastId ? `game-${gameId}-broadcast-${broadcastId}` : `game-${gameId}`;
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

function getBrazilianTransmission(
  game: GameScheduleData,
  publishedChannels: Map<string, ChannelCardData>,
) {
  const broadcasts = game.broadcasts
    .filter((broadcast) => broadcast.countryCode.toUpperCase() === "BR")
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const available: TransmissionOption[] = broadcasts.flatMap<TransmissionOption>((broadcast): TransmissionOption[] => {
    const embedUrl = normalizeYouTubeVideoUrl(broadcast.youtubeVideoUrl ?? "");
    if (embedUrl) return [{ kind: "youtube" as const, broadcast, embedUrl }];

    const channel = broadcast.channelId
      ? publishedChannels.get(broadcast.channelId)
      : undefined;
    return channel ? [{ kind: "channel" as const, broadcast, channel }] : [];
  });
  const selected = available.find(({ broadcast }) => broadcast.isPrimary) ?? available[0];
  if (selected) return selected;

  const names = [...new Map(
    broadcasts.map((broadcast) => {
      const name = /^premiere$/i.test(broadcast.broadcasterName.trim())
        ? "Premiere — canal a confirmar"
        : broadcast.broadcasterName.trim();
      return [name.toLocaleLowerCase("pt-BR"), name];
    }),
  ).values()];
  return names.length
    ? { kind: "names" as const, names }
    : { kind: "unconfirmed" as const, names: [] as string[] };
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
                  const transmission = getBrazilianTransmission(game, publishedChannels);
                  const watchSlug = focusKey(
                    game.id,
                    transmission.kind === "channel" || transmission.kind === "youtube"
                      ? transmission.broadcast.id
                      : undefined,
                  );
                  const youtubePlayerOpen = transmission.kind === "youtube"
                    && activeYoutubeBroadcastId === transmission.broadcast.id;
                  const href = transmission.kind === "channel"
                    ? `/canais/${encodeURIComponent(transmission.channel.slug)}?${mode === "tv" ? "from=tv&" : ""}voltar=historico&origem=schedule`
                    : null;

                  return (
                    <article className="public-game-row" id={`jogo-${game.id}`} key={game.id}>
                      <time className="public-game-row__time" dateTime={game.startsAt} title={`Horário de Brasília (${BRASILIA_TIME_ZONE})`}>
                        {formatBrasiliaTime(game.startsAt)}
                      </time>
                      <div className="public-game-row__match">
                        <div className="public-game-row__teams">
                          <TeamCrest shieldUrl={game.homeTeamShieldUrl} />
                          <span className="public-game-row__team-name">{game.homeTeam}</span>
                          <span aria-hidden="true" className="public-game-row__versus">×</span>
                          <TeamCrest shieldUrl={game.awayTeamShieldUrl} />
                          <span className="public-game-row__team-name">{game.awayTeam}</span>
                        </div>
                        <span className="public-game-row__competition">{game.competitionName}</span>
                      </div>
                      <div aria-label="Transmissão no Brasil" className="public-game-row__transmission">
                        {transmission.kind === "channel" && href ? (
                          <Link
                            aria-label={`Assistir no ${transmission.channel.name}`}
                            className="public-game-row__watch"
                            data-catalog-card={mode === "tv" ? "" : undefined}
                            data-list-section={mode === "tv" ? "schedule" : undefined}
                            data-schedule-focus={watchSlug}
                            data-slug={mode === "tv" ? watchSlug : undefined}
                            data-tv-schedule-item={mode === "tv" ? "" : undefined}
                            href={href}
                            onClick={() => rememberTvFocus(mode, watchSlug)}
                          >
                            Assistir no {transmission.channel.name}
                          </Link>
                        ) : transmission.kind === "youtube" ? (
                          <button
                            aria-controls={`youtube-game-${game.id}`}
                            aria-expanded={youtubePlayerOpen}
                            className="public-game-row__watch"
                            data-catalog-card={mode === "tv" ? "" : undefined}
                            data-list-section={mode === "tv" ? "schedule" : undefined}
                            data-schedule-focus={watchSlug}
                            data-slug={mode === "tv" ? watchSlug : undefined}
                            data-tv-schedule-item={mode === "tv" ? "" : undefined}
                            onClick={() => setActiveYoutubeBroadcastId(youtubePlayerOpen ? null : transmission.broadcast.id)}
                            type="button"
                          >
                            {youtubePlayerOpen ? "Fechar player" : `Assistir no ${transmission.broadcast.broadcasterName}`}
                          </button>
                        ) : transmission.kind === "names" ? (
                          <span className="public-game-row__broadcasters">{transmission.names.join(" · ")}</span>
                        ) : (
                          <span className="public-game-row__unconfirmed">Transmissão a confirmar</span>
                        )}
                      </div>
                      {transmission.kind === "youtube" && youtubePlayerOpen && (
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
                            src={transmission.embedUrl}
                            title={`${transmission.broadcast.broadcasterName}: ${game.homeTeam} x ${game.awayTeam}`}
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
