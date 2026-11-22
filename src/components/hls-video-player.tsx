"use client";

import { useEffect, useState, type RefObject, type SyntheticEvent } from "react";
import {
  getHighestBitrateLevelIndex,
  GLOBAL_VIDEO_QUALITY_POLICY,
  requestAdaptiveFallback,
} from "@/lib/video-quality-policy";
import {
  getHlsNetworkMetadata,
  getHlsPlaybackErrorMessage,
  getHlsPlaybackFailure,
  getSafeHostname,
  type HlsPlaybackFailure,
} from "@/lib/hls-playback-diagnostics";

const HLS_MIME_TYPE = "application/vnd.apple.mpegurl";

type HlsPlaybackMode = "loading" | "native" | "hls.js" | "unsupported";
type HlsPlaybackStatus = "loading" | "ready" | "playing" | "error" | "unsupported";

export function HlsVideoPlayer({
  src,
  title,
  officialUrl,
  muted,
  videoRef,
  onCanPlay,
  onVolumeChange,
}: {
  src: string;
  title: string;
  officialUrl?: string | null;
  muted: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onCanPlay(event: SyntheticEvent<HTMLVideoElement>): void;
  onVolumeChange(event: SyntheticEvent<HTMLVideoElement>): void;
}) {
  const [mode, setMode] = useState<HlsPlaybackMode>("loading");
  const [status, setStatus] = useState<HlsPlaybackStatus>("loading");
  const [failure, setFailure] = useState<HlsPlaybackFailure | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      return;
    }

    setMode("loading");
    setStatus("loading");
    setFailure(null);

    let disposed = false;
    let instance: import("hls.js").default | null = null;
    let mediaRecoveryAttempted = false;
    let networkRecoveryAttempted = false;
    let bufferingFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let lastBufferingFallbackAt = 0;
    let lastMainFragmentLevel = -1;
    const reportedResources = new Set<string>();
    const isCurrent = () => !disposed && videoRef.current === video;

    const clearBufferingFallbackTimer = () => {
      if (bufferingFallbackTimer !== null) {
        clearTimeout(bufferingFallbackTimer);
        bufferingFallbackTimer = null;
      }
    };

    const reportLoadedResource = (
      resource: string,
      key: string,
      networkDetails: unknown,
      fallbackUrl?: string,
    ) => {
      if (reportedResources.has(key)) return;
      reportedResources.add(key);
      const metadata = getHlsNetworkMetadata(networkDetails, fallbackUrl);
      console.info("[CanalMix HLS]", {
        event: "resource-loaded",
        resource,
        status: metadata.status,
        host: metadata.host ?? getSafeHostname(src),
      });
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

    const attachNativeHls = () => {
      if (!isCurrent()) {
        return;
      }
      setMode("native");
      setStatus("ready");
      video.src = src;
    };

    const handleNativeError = () => {
      if (!isCurrent() || !video.error) {
        return;
      }
      const nativeCode = video.error.code;
      const nativeFailure: HlsPlaybackFailure = {
        code: `media-element-${nativeCode}`,
        kind: nativeCode === 2 ? "network" : "media",
        stage: "transmissão HLS",
        status: null,
        host: getSafeHostname(src),
      };
      setFailure((current) => current ?? nativeFailure);
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

          hls.on(Hls.Events.MANIFEST_LOADED, (_event, data) => {
            if (!isCurrent()) return;
            reportLoadedResource("manifest", "manifest", data.networkDetails, data.url);
          });

          hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
            if (!isCurrent()) return;
            reportLoadedResource(
              "quality-playlist",
              `quality-${data.level}`,
              data.networkDetails,
            );
          });

          hls.on(Hls.Events.AUDIO_TRACK_LOADED, (_event, data) => {
            if (!isCurrent()) return;
            reportLoadedResource(
              "audio-playlist",
              `audio-${data.id}`,
              data.networkDetails,
            );
          });

          hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
            if (!isCurrent() || data.frag.type !== "main") return;
            reportLoadedResource(
              "video-segment",
              "first-video-segment",
              data.networkDetails,
              data.frag.url,
            );
          });

          hls.on(Hls.Events.ERROR, (_event, error) => {
            if (!isCurrent()) {
              return;
            }

            const hlsFailure = getHlsPlaybackFailure(error);
            setFailure((current) => current ?? hlsFailure);

            if (!error.fatal) {
              return;
            }

            console.warn("[CanalMix HLS]", {
              event: "playback-error",
              sourceHost: getSafeHostname(src),
              responseHost: hlsFailure.host,
              status: hlsFailure.status,
              stage: hlsFailure.stage,
              detail: error.details,
            });

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
        setFailure((current) => current ?? {
          code: "hls-unsupported",
          kind: "other",
          stage: "transmissão HLS",
          status: null,
          host: getSafeHostname(src),
        });
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
        setFailure((current) => current ?? {
          code: "hls-library-unavailable",
          kind: "other",
          stage: "transmissão HLS",
          status: null,
          host: getSafeHostname(src),
        });
      });

    return cleanup;
  }, [src, videoRef]);

  return (
    <>
      <video
        aria-label={title}
        autoPlay
        className="channel-player__video"
        controls
        data-hls-first-error={failure?.code}
        data-hls-error-host={failure?.host ?? undefined}
        data-hls-error-stage={failure?.stage}
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
            : failure
              ? getHlsPlaybackErrorMessage(failure)
              : "Não foi possível reproduzir esta transmissão. Atualize o player."}
          {officialUrl && (
            <>
              {" "}
              <a
                data-canalmix-allow-external="true"
                href={officialUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Abrir no site oficial
              </a>
            </>
          )}
        </p>
      )}
    </>
  );
}
