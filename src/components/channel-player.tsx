"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";
import {
  Maximize2,
  Minimize2,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { EmbedFrame } from "@/components/embed-frame";
import { YouTubeEmbedFrame } from "@/components/youtube-embed-frame";
import type { EmbedReferrerPolicy } from "@/lib/embed-provider-policy-core";

function getNativeVideoMimeType(src: string) {
  try {
    const extension = new URL(src).pathname.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "mp4":
      case "m4v":
        return "video/mp4";
      case "webm":
        return "video/webm";
      case "ogv":
      case "ogg":
        return "video/ogg";
      default:
        return null;
    }
  } catch {
    return null;
  }
}

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

export function ChannelPlayer({
  channelName,
  embedUrls,
  sandboxValues,
  referrerPolicies,
  tvMode = false,
  returnOnEscape = false,
}: {
  channelName: string;
  embedUrls: string[];
  sandboxValues: Array<string | null>;
  referrerPolicies: EmbedReferrerPolicy[];
  tvMode?: boolean;
  returnOnEscape?: boolean;
}) {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [youtubeApiFailureKey, setYoutubeApiFailureKey] = useState<string | null>(
    null,
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const attemptedVideoAutoplay = useRef(new WeakSet<HTMLVideoElement>());
  const restoreFullscreenAfterPlayerChange = useRef(false);
  const mutedState = useRef(false);
  const optionButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const refreshButton = useRef<HTMLButtonElement | null>(null);
  const fullscreenButton = useRef<HTMLButtonElement | null>(null);
  const audioButton = useRef<HTMLButtonElement | null>(null);
  const embedUrl = embedUrls[selectedOption] ?? embedUrls[0] ?? "";
  const playerKey = selectedOption + ":" + refreshKey;
  const nativeVideoMimeType = getNativeVideoMimeType(embedUrl);
  const isNativeVideo = nativeVideoMimeType !== null;
  const isYouTube = isYouTubeEmbed(embedUrl);
  const audioControlAvailable =
    isNativeVideo || (isYouTube && youtubeApiFailureKey !== playerKey);

  const syncMutedState = useCallback((muted: boolean) => {
    mutedState.current = muted;
    setIsMuted(muted);
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

      try {
        await video.play();
      } catch (error) {
        if (
          video !== videoRef.current ||
          video.muted ||
          !isAutoplayBlockedError(error)
        ) {
          return;
        }

        video.muted = true;
        syncMutedState(true);
        try {
          await video.play();
        } catch {
          // Keep the native Play control available if muted autoplay is blocked too.
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
      isNativeVideo &&
      video &&
      video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    ) {
      void attemptVideoAutoplay(video);
    }
  }, [attemptVideoAutoplay, isNativeVideo, playerKey]);

  const handleYouTubeApiError = useCallback(() => {
    setYoutubeApiFailureKey(playerKey);
  }, [playerKey]);

  useEffect(() => {
    if (!tvMode) {
      return;
    }

    (optionButtons.current[0] ?? refreshButton.current)?.focus({
      preventScroll: true,
    });
  }, [tvMode]);

  const isPlayerFullscreen = useCallback(() => {
    const fullscreenElement = document.fullscreenElement;
    return (
      fullscreenElement !== null &&
      (fullscreenElement === videoRef.current ||
        fullscreenElement === iframeRef.current)
    );
  }, []);

  function changeOption(nextOption: number) {
    videoRef.current?.pause();
    if (isPlayerFullscreen()) {
      restoreFullscreenAfterPlayerChange.current = true;
    }
    setSelectedOption(nextOption);
  }

  function refreshPlayer() {
    videoRef.current?.pause();
    if (isPlayerFullscreen()) {
      restoreFullscreenAfterPlayerChange.current = true;
    }
    setRefreshKey((currentKey) => currentKey + 1);
  }

  useEffect(() => {
    const currentVideo = videoRef.current;
    return () => currentVideo?.pause();
  }, [playerKey]);

  useEffect(() => {
    if (!restoreFullscreenAfterPlayerChange.current) {
      return;
    }

    const target = isNativeVideo ? videoRef.current : iframeRef.current;
    restoreFullscreenAfterPlayerChange.current = false;
    if (!target) {
      return;
    }

    if (typeof target.requestFullscreen !== "function") {
      setFullscreenError(
        "Não foi possível restaurar a tela cheia após atualizar o player.",
      );
      return;
    }

    void target
      .requestFullscreen()
      .then(() => target.focus({ preventScroll: true }))
      .catch(() => {
        setFullscreenError(
          "Não foi possível restaurar a tela cheia após atualizar o player.",
        );
      });
  }, [isNativeVideo, playerKey]);

  useEffect(() => {
    function syncFullscreenState() {
      const fullscreen = isPlayerFullscreen();
      setIsFullscreen(fullscreen);

      if (fullscreen) {
        setFullscreenError(null);
      } else if (
        tvMode &&
        (document.activeElement === videoRef.current ||
          document.activeElement === iframeRef.current)
      ) {
        fullscreenButton.current?.focus({ preventScroll: true });
      }
    }

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, [isPlayerFullscreen, tvMode]);

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
      fullscreenButton.current?.focus({ preventScroll: true });
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

  function handleFullscreenKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!tvMode) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      refreshButton.current?.focus({ preventScroll: true });
      return;
    }

    if (event.key === "ArrowRight" && audioControlAvailable) {
      event.preventDefault();
      audioButton.current?.focus({ preventScroll: true });
      return;
    }

    if (event.key === "ArrowUp" && embedUrls.length > 1) {
      event.preventDefault();
      optionButtons.current[selectedOption]?.focus({ preventScroll: true });
    }
  }

  function handleAudioKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!tvMode) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      fullscreenButton.current?.focus({ preventScroll: true });
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

  function handlePlayerKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!tvMode || event.key !== "Escape") {
      return;
    }

    if (!isPlayerFullscreen()) {
      if (returnOnEscape) {
        event.preventDefault();
        router.back();
      }
      return;
    }

    event.preventDefault();
    if (typeof document.exitFullscreen !== "function") {
      setFullscreenError("Não é possível sair da tela cheia neste navegador.");
      return;
    }

    void document.exitFullscreen().catch(() => {
      setFullscreenError("Não foi possível sair da tela cheia neste navegador.");
    });
  }

  async function toggleFullscreen() {
    const target = isNativeVideo ? videoRef.current : iframeRef.current;
    if (!target) {
      setFullscreenError("A tela cheia não está disponível neste navegador.");
      return;
    }

    setFullscreenError(null);

    try {
      if (isPlayerFullscreen()) {
        if (typeof document.exitFullscreen !== "function") {
          setFullscreenError("Não é possível sair da tela cheia neste navegador.");
          return;
        }

        await document.exitFullscreen();
        return;
      }

      if (typeof target.requestFullscreen !== "function") {
        setFullscreenError("A tela cheia não está disponível neste navegador.");
        return;
      }

      await target.requestFullscreen();
      target.focus({ preventScroll: true });
    } catch {
      setFullscreenError(
        "Não foi possível alterar a tela cheia. O navegador ou dispositivo pode não permitir esse recurso.",
      );
    }
  }

  function toggleAudio() {
    if (isNativeVideo) {
      const video = videoRef.current;
      if (video) {
        video.muted = !video.muted;
      }
      return;
    }

    if (isYouTube && audioControlAvailable) {
      syncMutedState(!mutedState.current);
    }
  }

  return (
    <section
      className="channel-player"
      aria-label={"Player de " + channelName}
      onKeyDown={handlePlayerKeyDown}
    >
      <div className="channel-player__controls">
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
            aria-pressed={isFullscreen}
            className="channel-player__fullscreen"
            onClick={toggleFullscreen}
            onKeyDown={handleFullscreenKeyDown}
            ref={fullscreenButton}
            type="button"
          >
            {isFullscreen ? (
              <Minimize2 aria-hidden="true" size={18} />
            ) : (
              <Maximize2 aria-hidden="true" size={18} />
            )}
            {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          </button>
          <button
            aria-pressed={isMuted}
            className="channel-player__audio"
            disabled={!audioControlAvailable}
            onClick={toggleAudio}
            onKeyDown={handleAudioKeyDown}
            ref={audioButton}
            type="button"
          >
            {isMuted ? (
              <VolumeX aria-hidden="true" size={18} />
            ) : (
              <Volume2 aria-hidden="true" size={18} />
            )}
            {isMuted ? "Ativar som" : "Silenciar"}
          </button>
          {!audioControlAvailable && (
            <span className="channel-player__audio-hint">
              Use o controle de som do player
            </span>
          )}
        </div>
      </div>
      {isNativeVideo ? (
        <video
          aria-label={"Vídeo do canal " + channelName}
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
          sandbox={sandboxValues[selectedOption]}
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
          title={"Player do canal " + channelName}
          sandbox={sandboxValues[selectedOption]}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy={referrerPolicies[selectedOption]}
        />
      )}
      {fullscreenError && (
        <p className="channel-player__fullscreen-error" role="alert">
          {fullscreenError}
        </p>
      )}
      <p className="channel-player__notice" role="status">
        {embedUrls.length > 1
          ? "Se uma opção não iniciar, teste outra. A reprodução depende das permissões do provedor."
          : "Se o player não iniciar, a transmissão pode estar temporariamente indisponível ou o provedor pode bloquear a incorporação."}
      </p>
    </section>
  );
}
