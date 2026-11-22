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
import { HlsVideoPlayer } from "@/components/hls-video-player";
import { YouTubeEmbedFrame } from "@/components/youtube-embed-frame";
import { ReportStreamIssueDialog } from "@/components/report-stream-issue-dialog";
import { useVisitorPlaybackPresence } from "@/components/visitor-presence-provider";
import type { EmbedReferrerPolicy } from "@/lib/embed-provider-policy-core";
import type { ChannelEmbedSource } from "@/lib/channel-embed-sources";

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

function isHlsSource(src: string) {
  try {
    return new URL(src).pathname.toLowerCase().endsWith(".m3u8");
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
  const [isMuted, setIsMuted] = useState(
    embedSources[0]?.type === "direct-url",
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
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
  const isDirectSource = embedSource?.type === "direct-url";
  const isHls = isHlsSource(embedUrl);
  const isNativeVideo = isDirectSource && !isHls;
  const isYouTube = embedSource?.type === "iframe-url" && isYouTubeEmbed(embedUrl);
  const canRequestFullscreen =
    isDirectSource ||
    embedSource?.type === "iframe-url" ||
    (embedSource?.type === "iframe-code" &&
      "src" in embedSource.content &&
      embedSource.content.allowFullscreen);
  const syncMutedState = useCallback((muted: boolean) => {
    setIsMuted(muted);
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
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
      video.dataset.autoplayStatus = "attempting-unmuted";

      try {
        await video.play();
        if (video === videoRef.current) {
          video.dataset.autoplayStatus = video.muted
            ? "started-muted"
            : "started-unmuted";
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

        if (video.muted) {
          video.dataset.autoplayStatus = "blocked";
          return;
        }

        video.dataset.autoplayStatus = "blocked-unmuted-retrying-muted";
        video.muted = true;
        syncMutedState(true);
        try {
          await video.play();
          if (video === videoRef.current) {
            video.dataset.autoplayStatus = "started-muted";
          }
        } catch (retryError) {
          // Keep the native Play control available if muted autoplay is blocked too.
          if (video === videoRef.current) {
            video.dataset.autoplayError ??= getMediaErrorName(retryError);
            video.dataset.autoplayStatus = isAutoplayBlockedError(retryError)
              ? "blocked"
              : `rejected:${getMediaErrorName(retryError)}`;
          }
        }
      }
    },
    [syncMutedState],
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
      (isNativeVideo || isHls) &&
      video &&
      video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    ) {
      void attemptVideoAutoplay(video);
    }
  }, [attemptVideoAutoplay, isHls, isNativeVideo, playerKey]);

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
    setIsMuted(embedSources[nextOption]?.type === "direct-url");
    setSelectedOption(nextOption);
  }

  function refreshPlayer() {
    videoRef.current?.pause();
    if (isDirectSource) {
      setIsMuted(true);
    }
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
    const target = iframeRef.current ?? videoRef.current;
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
      setFullscreenError("O navegador bloqueou a tela cheia para esta opção.");
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
          {isDirectSource && isHls ? (
        <HlsVideoPlayer
          key={playerKey}
          src={embedUrl}
          title={"Player do canal " + channelName}
          officialUrl={officialUrl}
          videoRef={videoRef}
          muted={isMuted}
          onCanPlay={handleVideoCanPlay}
          onVolumeChange={handleVideoVolumeChange}
        />
      ) : isDirectSource ? (
        <video
          aria-label={"Vídeo do canal " + channelName}
          autoPlay
          className="channel-player__video"
          key={playerKey}
          muted={isMuted}
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
          allow={
            embedSource?.type === "iframe-code" && "src" in embedSource.content
              ? embedSource.content.allow ?? ""
              : undefined
          }
          allowFullScreen={
            embedSource?.type === "iframe-code" && "src" in embedSource.content
              ? embedSource.content.allowFullscreen ?? false
              : undefined
          }
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
