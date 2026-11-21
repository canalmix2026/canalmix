"use client";

import { useEffect, useState, type RefObject, type SyntheticEvent } from "react";
import type { ErrorData } from "hls.js";
import {
  getHighestBitrateLevelIndex,
  GLOBAL_VIDEO_QUALITY_POLICY,
  requestAdaptiveFallback,
} from "@/lib/video-quality-policy";

const HLS_MIME_TYPE = "application/vnd.apple.mpegurl";

type HlsPlaybackMode = "loading" | "native" | "hls.js" | "unsupported";
type HlsPlaybackStatus = "loading" | "ready" | "playing" | "error" | "unsupported";

function errorKind(error: ErrorData, hls: typeof import("hls.js").default) {
  const status = error.response?.code;
  if (status) {
    return `http-${status}`;
  }
  if (error.type === hls.ErrorTypes.NETWORK_ERROR) {
    return `network:${error.details}`;
  }
  if (error.type === hls.ErrorTypes.MEDIA_ERROR) {
    return `media:${error.details}`;
  }
  return `hls:${error.details}`;
}

function playbackErrorMessage(error: string | null) {
  if (error?.startsWith("http-403")) {
    return "A fonte recusou a reprodução incorporada neste domínio (HTTP 403). O provedor precisa liberar o player do CanalMix.";
  }
  if (error?.startsWith("network:")) {
    return "A fonte HLS não pode ser carregada neste domínio (rede/CORS). Teste outra opção ou use um player autorizado.";
  }
  return "Não foi possível reproduzir esta transmissão. Atualize o player ou teste outra opção.";
}

export function HlsVideoPlayer({
  src,
  title,
  muted,
  videoRef,
  onCanPlay,
  onVolumeChange,
}: {
  src: string;
  title: string;
  muted: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onCanPlay(event: SyntheticEvent<HTMLVideoElement>): void;
  onVolumeChange(event: SyntheticEvent<HTMLVideoElement>): void;
}) {
  const [mode, setMode] = useState<HlsPlaybackMode>("loading");
  const [status, setStatus] = useState<HlsPlaybackStatus>("loading");
  const [firstError, setFirstError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      return;
    }

    let disposed = false;
    let instance: import("hls.js").default | null = null;
    let nativeFallbackAttempted = false;
    let mediaRecoveryAttempted = false;
    let networkRecoveryAttempted = false;
    let bufferingFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let lastBufferingFallbackAt = 0;
    let lastMainFragmentLevel = -1;
    const isCurrent = () => !disposed && videoRef.current === video;

    const clearBufferingFallbackTimer = () => {
      if (bufferingFallbackTimer !== null) {
        clearTimeout(bufferingFallbackTimer);
        bufferingFallbackTimer = null;
      }
    };

    const scheduleAdaptiveFallback = () => {
      if (
        !GLOBAL_VIDEO_QUALITY_POLICY.allowAdaptiveFallback ||
        !instance?.autoLevelEnabled ||
        !isCurrent() ||
        bufferingFallbackTimer !== null ||
        Date.now() - lastBufferingFallbackAt <
          GLOBAL_VIDEO_QUALITY_POLICY.bufferingFallbackCooldownMs
      ) {
        return;
      }

      bufferingFallbackTimer = setTimeout(() => {
        bufferingFallbackTimer = null;
        const activeHls = instance;
        if (!activeHls || !isCurrent() || video.paused) {
          return;
        }

        const currentLevel =
          activeHls.currentLevel >= 0
            ? activeHls.currentLevel
            : lastMainFragmentLevel;
        const fallbackLevel = requestAdaptiveFallback(
          activeHls,
          currentLevel,
        );
        if (fallbackLevel === null) {
          return;
        }

        lastBufferingFallbackAt = Date.now();
        video.dataset.hlsAdaptiveFallbackCount = String(
          Number(video.dataset.hlsAdaptiveFallbackCount ?? "0") + 1,
        );
        video.dataset.hlsAdaptiveFallbackLevel = String(fallbackLevel);
      }, GLOBAL_VIDEO_QUALITY_POLICY.bufferingFallbackDelayMs);
    };

    const handleBuffering = () => scheduleAdaptiveFallback();
    const handlePlaybackResumed = () => clearBufferingFallbackTimer();
    const nativeHlsSupported = video.canPlayType(HLS_MIME_TYPE) !== "";
    const preferNative =
      nativeHlsSupported && "ManagedMediaSource" in window;

    const attachNativeHls = () => {
      if (!isCurrent()) {
        return;
      }
      setMode("native");
      setStatus("ready");
      video.src = src;
    };

    const fallbackToNativeHls = () => {
      if (!nativeHlsSupported || nativeFallbackAttempted || !isCurrent()) {
        return false;
      }

      nativeFallbackAttempted = true;
      clearBufferingFallbackTimer();
      const activeHls = instance;
      instance = null;
      activeHls?.destroy();
      video.removeAttribute("src");
      video.load();
      video.dataset.hlsNativeFallback = "true";
      attachNativeHls();
      return true;
    };

    const handleNativeError = () => {
      if (!isCurrent() || !video.error) {
        return;
      }
      const errorCode = `media-element-${video.error.code}`;
      setFirstError((current) => current ?? errorCode);
      setStatus("error");
    };

    video.addEventListener("error", handleNativeError);

    const cleanup = () => {
      disposed = true;
      clearBufferingFallbackTimer();
      video.removeEventListener("waiting", handleBuffering);
      video.removeEventListener("stalled", handleBuffering);
      video.removeEventListener("playing", handlePlaybackResumed);
      video.removeEventListener("error", handleNativeError);
      video.pause();
      instance?.destroy();
      instance = null;
      video.removeAttribute("src");
      video.load();
    };

    if (preferNative) {
      attachNativeHls();
      return cleanup;
    }

    void import("hls.js")
      .then(({ default: Hls }) => {
        if (!isCurrent()) {
          return;
        }

        if (Hls.isSupported()) {
          const hls = new Hls({
            autoStartLoad: false,
            capLevelToPlayerSize:
              GLOBAL_VIDEO_QUALITY_POLICY.capLevelToPlayerSize,
          });
          instance = hls;
          setMode("hls.js");

          video.addEventListener("waiting", handleBuffering);
          video.addEventListener("stalled", handleBuffering);
          video.addEventListener("playing", handlePlaybackResumed);

          hls.on(Hls.Events.FRAG_LOADING, (_event, data) => {
            if (data.frag.type === "main") {
              lastMainFragmentLevel = data.frag.level;
            }
            if (
              !isCurrent() ||
              video.dataset.hlsFirstFragmentLevel !== undefined ||
              data.frag.type !== "main"
            ) {
              return;
            }

            const levelIndex = data.frag.level;
            const level = hls.levels[levelIndex];
            if (levelIndex < 0 || !level) {
              return;
            }

            video.dataset.hlsFirstFragmentLevel = String(levelIndex);
            video.dataset.hlsFirstFragmentBitrate = String(level.bitrate);
          });

          hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
            if (!isCurrent()) {
              return;
            }

            const level = hls.levels[data.level];
            if (level) {
              video.dataset.hlsCurrentLevel = String(data.level);
              video.dataset.hlsCurrentBitrate = String(level.bitrate);
            }
          });

          hls.on(Hls.Events.ERROR, (_event, error) => {
            if (!isCurrent()) {
              return;
            }

            const kind = errorKind(error, Hls);
            setFirstError((current) => current ?? kind);

            if (!error.fatal) {
              return;
            }

            if (
              error.type === Hls.ErrorTypes.NETWORK_ERROR &&
              fallbackToNativeHls()
            ) {
              return;
            }

            if (
              error.type === Hls.ErrorTypes.MEDIA_ERROR &&
              !mediaRecoveryAttempted
            ) {
              mediaRecoveryAttempted = true;
              hls.recoverMediaError();
              return;
            }

            if (
              error.type === Hls.ErrorTypes.NETWORK_ERROR &&
              !networkRecoveryAttempted
            ) {
              networkRecoveryAttempted = true;
              setStatus("loading");
              if (hls.levels.length === 0) {
                hls.loadSource(src);
              } else {
                hls.startLoad();
              }
              return;
            }

            if (error.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.stopLoad();
            }
            setStatus("error");
          });

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (isCurrent()) {
              const levels = hls.levels;
              const initialLevel = getHighestBitrateLevelIndex(levels);
              if (initialLevel >= 0) {
                const level = levels[initialLevel];
                hls.startLevel = initialLevel;
                video.dataset.hlsInitialLevel = String(initialLevel);
                video.dataset.hlsInitialBitrate = String(level.bitrate);
                video.dataset.hlsAutoLevelEnabled = String(
                  hls.autoLevelEnabled,
                );
                if (level.width && level.height) {
                  video.dataset.hlsInitialResolution =
                    level.width + "x" + level.height;
                }
              }

              setStatus("ready");
              hls.startLoad();
            }
          });

          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            if (isCurrent()) {
              hls.loadSource(src);
            }
          });

          hls.attachMedia(video);
          return;
        }

        if (nativeHlsSupported) {
          attachNativeHls();
          return;
        }

        setMode("unsupported");
        setStatus("unsupported");
        setFirstError((current) => current ?? "hls-unsupported");
      })
      .catch(() => {
        if (!isCurrent()) {
          return;
        }
        if (nativeHlsSupported) {
          attachNativeHls();
          return;
        }
        setMode("unsupported");
        setStatus("unsupported");
        setFirstError((current) => current ?? "hls-library-unavailable");
      });

    return cleanup;
  }, [src, videoRef]);

  return (
    <>
      <video
        aria-label={title}
        className="channel-player__video"
        controls
        data-hls-first-error={firstError ?? undefined}
        data-hls-mode={mode}
        data-hls-status={status}
        muted={muted}
        onCanPlay={onCanPlay}
        onPlaying={() => setStatus("playing")}
        onVolumeChange={onVolumeChange}
        playsInline
        preload="metadata"
        ref={videoRef}
      />
      {(status === "error" || status === "unsupported") && (
        <p className="channel-player__hls-error" role="status">
          {status === "unsupported"
            ? "Este navegador não oferece suporte à reprodução HLS."
            : playbackErrorMessage(firstError)}
        </p>
      )}
    </>
  );
}
