"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";
import { Flag, Maximize2, Minimize2, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmbedFrame } from "@/components/embed-frame";
import { DashVideoPlayer } from "@/components/dash-video-player";
import { HlsVideoPlayer } from "@/components/hls-video-player";
import { YouTubeEmbedFrame } from "@/components/youtube-embed-frame";
import { ReportStreamIssueDialog } from "@/components/report-stream-issue-dialog";
import { useVisitorPlaybackPresence } from "@/components/visitor-presence-provider";
import type { EmbedReferrerPolicy } from "@/lib/embed-provider-policy-core";
import type { ChannelEmbedSource } from "@/lib/channel-embed-sources";
import { getChannelPlayerMode } from "@/lib/channel-player-mode";

function isYouTubeEmbed(src: string) {
  try {
    const url = new URL(src);
    const hostname = url.hostname.toLowerCase();
    return (
      [
        "youtube.com",
        "www.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(hostname) && url.pathname.startsWith("/embed/")
    );
  } catch {
    return false;
  }
}

function isAutoplayBlockedError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "NotAllowedError"
  );
}

function getMediaErrorName(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
    ? error.name
    : "UnknownError";
}

export function ChannelPlayer({
  channelId,
  channelName,
  officialUrl,
  embedUrls,
  embedSources,
  embedSourceIds,
  referrerPolicies,
  tvMode = false,
  returnOnEscape = false,
}: {
  channelId: string;
  channelName: string;
  officialUrl?: string | null;
  embedUrls: string[];
  embedSources: ChannelEmbedSource[];
  embedSourceIds: string[];
  referrerPolicies: EmbedReferrerPolicy[];
  tvMode?: boolean;
  returnOnEscape?: boolean;
}) {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState(0);
  useVisitorPlaybackPresence(channelId, channelName, selectedOption + 1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlockedWithSound, setAutoplayBlockedWithSound] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const playerContainerRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const attemptedVideoAutoplay = useRef(new WeakSet<HTMLVideoElement>());
  const optionButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const refreshButton = useRef<HTMLButtonElement | null>(null);
  const reportButton = useRef<HTMLButtonElement | null>(null);
  const [reportIdempotencyKey, setReportIdempotencyKey] = useState<string | null>(null);
  const embedUrl = embedUrls[selectedOption] ?? embedUrls[0] ?? "";
  const embedSource = embedSources[selectedOption] ?? embedSources[0];
  const playerKey = channelId + ":" + (embedSource?.id ?? selectedOption) + ":" + refreshKey;
  const playerMode = getChannelPlayerMode(embedSource?.type, embedUrl);
  const isDash = playerMode === "mpeg-dash";
  const isHls = playerMode === "hls";
  const isNativeVideo = playerMode === "native-video";
  const isDirectSource = isHls || isNativeVideo;
  const isYouTube = embedSource?.type === "iframe-url" && isYouTubeEmbed(embedUrl);
  const iframeContent =
    embedSource?.type === "iframe-code" && "src" in embedSource.content
      ? embedSource.content
      : null;
  const iframeAllowsFullscreen =
    Boolean(iframeContent?.allowFullscreen) ||
    Boolean(
      iframeContent?.allow
        ?.split(";")
        .some((permission) => permission.trim().toLowerCase() === "fullscreen"),
    );
  const iframeAllow = iframeContent
    ? [
        iframeContent.allow ?? "",
        iframeAllowsFullscreen &&
        !iframeContent.allow
          ?.split(";")
          .some((permission) => permission.trim().toLowerCase() === "fullscreen")
          ? "fullscreen"
          : "",
      ]
        .filter(Boolean)
        .join("; ")
    : undefined;
  const isIframeSource =
    embedSource?.type === "iframe-url" || embedSource?.type === "iframe-code";
  const canRequestFullscreen =
    isDirectSource ||
    isDash ||
    embedSource?.type === "iframe-url" ||
    iframeAllowsFullscreen;
  const syncMutedState = useCallback((muted: boolean) => {
    setIsMuted(muted);
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === playerContainerRef.current);
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  const handleVideoVolumeChange = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      syncMutedState(event.currentTarget.muted);
    },
    [syncMutedState],
  );

  const handleVideoPlaying = useCallback(() => {
    setAutoplayBlockedWithSound(false);
  }, []);

  const attemptVideoAutoplay = useCallback(
    async (video: HTMLVideoElement) => {
      if (
        video !== videoRef.current ||
        attemptedVideoAutoplay.current.has(video)
      ) {
        return;
      }

      attemptedVideoAutoplay.current.add(video);
      video.removeAttribute("data-autoplay-error");
      video.muted = false;
      video.volume = 1;
      video.dataset.autoplayStatus = "attempting-unmuted";
      setAutoplayBlockedWithSound(false);

      try {
        await video.play();
        if (video === videoRef.current) {
          video.dataset.autoplayStatus = "started-unmuted";
        }
      } catch (error) {
        if (video !== videoRef.current) {
          return;
        }

        video.dataset.autoplayError ??= getMediaErrorName(error);

        if (!isAutoplayBlockedError(error)) {
          video.dataset.autoplayStatus = `rejected:${getMediaErrorName(error)}`;
          return;
        }

        video.dataset.autoplayStatus = "blocked-unmuted";
        setAutoplayBlockedWithSound(true);
      }
    },
    [],
  );

  const handleVideoCanPlay = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      void attemptVideoAutoplay(event.currentTarget);
    },
    [attemptVideoAutoplay],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (
      (isNativeVideo || isHls || isDash) &&
      video &&
      video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    ) {
      void attemptVideoAutoplay(video);
    }
  }, [attemptVideoAutoplay, isDash, isHls, isNativeVideo, playerKey]);

  const handleYouTubeApiError = useCallback(() => undefined, []);

  useEffect(() => {
    if (!tvMode || embedUrls.length === 0) {
      return;
    }

    (optionButtons.current[0] ?? refreshButton.current)?.focus({
      preventScroll: true,
    });
  }, [embedUrls.length, tvMode]);

  function changeOption(nextOption: number) {
    videoRef.current?.pause();
    setIsMuted(false);
    setAutoplayBlockedWithSound(false);
    setSelectedOption(nextOption);
  }

  function refreshPlayer() {
    videoRef.current?.pause();
    setIsMuted(false);
    setAutoplayBlockedWithSound(false);
    setRefreshKey((currentKey) => currentKey + 1);
  }

  useEffect(() => {
    const currentVideo = videoRef.current;
    return () => currentVideo?.pause();
  }, [playerKey]);

  function handleOptionKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (tvMode && event.key === "ArrowDown") {
      event.preventDefault();
      refreshButton.current?.focus({ preventScroll: true });
      return;
    }

    if (embedUrls.length < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextOption =
      (selectedOption + direction + embedUrls.length) % embedUrls.length;
    changeOption(nextOption);
    optionButtons.current[nextOption]?.focus();
  }

  function handleRefreshKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!tvMode) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      reportButton.current?.focus({ preventScroll: true });
      return;
    }

    if (
      embedUrls.length > 1 &&
      ["ArrowLeft", "ArrowUp"].includes(event.key)
    ) {
      event.preventDefault();
      optionButtons.current[selectedOption]?.focus({ preventScroll: true });
    }
  }

  function handleReportButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!tvMode) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      refreshButton.current?.focus({ preventScroll: true });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (embedUrls.length > 1) {
        optionButtons.current[selectedOption]?.focus({ preventScroll: true });
      } else {
        refreshButton.current?.focus({ preventScroll: true });
      }
    }
  }

  function openReportDialog() {
    setReportIdempotencyKey(window.crypto.randomUUID());
  }

  async function toggleFullscreen() {
    const target = playerContainerRef.current;
    setFullscreenError(null);

    if (!target) {
      setFullscreenError("A tela cheia não está disponível para esta opção.");
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
      }
    } catch {
      setFullscreenError(
        isIframeSource
          ? "A tela cheia foi bloqueada pelo navegador ou pela política de permissões do provedor desta incorporação."
          : "O navegador bloqueou a tela cheia para esta opção.",
      );
    }
  }

  function closeReportDialog() {
    setReportIdempotencyKey(null);
    requestAnimationFrame(() => {
      reportButton.current?.focus({ preventScroll: true });
    });
  }

  function handlePlayerKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!tvMode || !["Escape", "Backspace", "BrowserBack", "GoBack"].includes(event.key)) {
      return;
    }

    if (document.fullscreenElement) {
      if (typeof document.exitFullscreen === "function") {
        event.preventDefault();
        void document.exitFullscreen().catch(() => {});
      }
      return;
    }

    if (returnOnEscape) {
      event.preventDefault();
      try {
        if (
          window.opener &&
          !window.opener.closed &&
          window.opener.location.origin === window.location.origin
        ) {
          window.close();
          if (window.closed) {
            return;
          }
        }
      } catch {
        // A cross-origin opener cannot be inspected, so return through app history.
      }
      router.back();
    }
  }

  function handlePlayerKeyDownCapture(event: KeyboardEvent<HTMLElement>) {
    if (
      !tvMode ||
      !["Escape", "Backspace", "BrowserBack", "GoBack"].includes(event.key) ||
      !document.fullscreenElement
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (typeof document.exitFullscreen === "function") {
      void document.exitFullscreen().catch(() => {});
    }
  }

  return (
    <section
      className="channel-player"
      aria-label={"Player de " + channelName}
      onKeyDownCapture={handlePlayerKeyDownCapture}
      onKeyDown={handlePlayerKeyDown}
      ref={playerContainerRef}
    >
      {embedUrls.length > 0 && <div className="channel-player__controls">
        {embedUrls.length > 1 && (
          <div
            aria-label="Opções de reprodução"
            className="channel-player__options"
            onKeyDown={handleOptionKeyDown}
            role="group"
          >
            {embedUrls.map((_, index) => (
              <button
                aria-pressed={selectedOption === index}
                className="channel-player__option"
                key={index}
                ref={(element) => {
                  optionButtons.current[index] = element;
                }}
            onClick={() => changeOption(index)}
                type="button"
              >
                Opção {index + 1}
              </button>
            ))}
          </div>
        )}
        <div className="channel-player__controls-actions">
          {canRequestFullscreen && (
            <button
              aria-pressed={isFullscreen}
              className="channel-player__fullscreen"
              onClick={() => void toggleFullscreen()}
              type="button"
            >
              {isFullscreen ? (
                <Minimize2 aria-hidden="true" size={18} />
              ) : (
                <Maximize2 aria-hidden="true" size={18} />
              )}
              {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            </button>
          )}
          <button
            className="channel-player__refresh"
            onClick={refreshPlayer}
            onKeyDown={handleRefreshKeyDown}
            ref={refreshButton}
            type="button"
          >
            <RotateCw aria-hidden="true" size={18} />
            Atualizar player
          </button>
          <button
            className="channel-player__report"
            onClick={openReportDialog}
            onKeyDown={handleReportButtonKeyDown}
            ref={reportButton}
            type="button"
          >
            <Flag aria-hidden="true" size={18} />
            Reportar problema
          </button>
        </div>
      </div>}
      {fullscreenError && (
        <p className="channel-player__fullscreen-error" role="status">
          {fullscreenError}
        </p>
      )}
      {embedUrls.length === 0 ? (
        <p className="channel-player__unavailable" role="status">
          Nenhuma opção disponível
        </p>
      ) : (
        <div className="channel-player__stage">
          {isDash ? (
        <DashVideoPlayer
          key={playerKey}
          src={embedUrl}
          title={"Player do canal " + channelName}
          videoRef={videoRef}
          muted={isMuted}
          onCanPlay={handleVideoCanPlay}
          onPlaying={handleVideoPlaying}
          onVolumeChange={handleVideoVolumeChange}
        />
      ) : isHls ? (
        <HlsVideoPlayer
          key={playerKey}
          src={embedUrl}
          title={"Player do canal " + channelName}
          officialUrl={officialUrl}
          videoRef={videoRef}
          muted={isMuted}
          onCanPlay={handleVideoCanPlay}
          onPlaying={handleVideoPlaying}
          onVolumeChange={handleVideoVolumeChange}
        />
      ) : isDirectSource ? (
        <video
          aria-label={"Vídeo do canal " + channelName}
          autoPlay
          className="channel-player__video"
          key={playerKey}
          muted={isMuted}
          onPlaying={handleVideoPlaying}
          onVolumeChange={handleVideoVolumeChange}
          playsInline
          preload="metadata"
          ref={videoRef}
          src={embedUrl}
          onCanPlay={handleVideoCanPlay}
          controls
        />
      ) : isYouTube ? (
        <YouTubeEmbedFrame
          key={playerKey}
          src={embedUrl}
          frameRef={iframeRef}
          title={"Player do canal " + channelName}
          referrerPolicy={referrerPolicies[selectedOption]}
          muted={isMuted}
          onMutedChange={syncMutedState}
          onApiError={handleYouTubeApiError}
        />
      ) : (
        <EmbedFrame
          key={playerKey}
          className="channel-player__frame"
          frameRef={iframeRef}
          src={embedUrl}
          title={
            embedSource?.type === "iframe-code" && "src" in embedSource.content
              ? embedSource.content.title || "Player do canal " + channelName
              : "Player do canal " + channelName
          }
          referrerPolicy={referrerPolicies[selectedOption]}
          allow={iframeAllow}
          allowFullScreen={iframeContent ? iframeAllowsFullscreen : undefined}
        />
          )}
        </div>
      )}
      {reportIdempotencyKey && (
        <ReportStreamIssueDialog
          channelId={channelId}
          channelName={channelName}
          sourceIds={embedSourceIds}
          selectedOption={selectedOption}
          idempotencyKey={reportIdempotencyKey}
          tvMode={tvMode}
          onClose={closeReportDialog}
        />
      )}
      {autoplayBlockedWithSound && (
        <p className="channel-player__notice" role="status">
          O navegador bloqueou o autoplay com som. Pressione Play para iniciar a transmissão.
        </p>
      )}
      {embedUrls.length > 0 && <p className="channel-player__notice" role="status">
        {embedUrls.length === 0
          ? "Nenhuma opção disponível"
          : embedUrls.length > 1
          ? "Se uma opção não iniciar, teste outra. A reprodução depende das permissões do provedor."
          : "Se o player não iniciar, a transmissão pode estar temporariamente indisponível ou o provedor pode bloquear a incorporação."}
      </p>}
    </section>
  );
}
