"use client";

import { useEffect, useState, type RefObject, type SyntheticEvent } from "react";
import type { ErrorData } from "hls.js";

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
    let mediaRecoveryAttempted = false;
    const isCurrent = () => !disposed && videoRef.current === video;
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
          const hls = new Hls();
          instance = hls;
          setMode("hls.js");

          hls.on(Hls.Events.ERROR, (_event, error) => {
            if (!isCurrent()) {
              return;
            }

            const kind = errorKind(error, Hls);
            setFirstError((current) => current ?? kind);

            if (
              !error.fatal ||
              error.type !== Hls.ErrorTypes.MEDIA_ERROR ||
              mediaRecoveryAttempted
            ) {
              if (error.fatal) {
                setStatus("error");
              }
              return;
            }

            mediaRecoveryAttempted = true;
            hls.recoverMediaError();
          });

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (isCurrent()) {
              setStatus("ready");
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
            : "Não foi possível reproduzir esta transmissão. Atualize o player ou teste outra opção."}
        </p>
      )}
    </>
  );
}
