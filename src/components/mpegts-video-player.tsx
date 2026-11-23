"use client";

import { useEffect, useState, type RefObject, type SyntheticEvent } from "react";
import type mpegts from "mpegts.js";

type MpegTsPlayer = ReturnType<typeof mpegts.createPlayer>;
type PlaybackStatus =
  | "loading"
  | "playing"
  | "retrying"
  | "error"
  | "unsupported"
  | "mixed-content";

type PlaybackState = {
  src: string;
  status: PlaybackStatus;
  message?: string;
};

const MIXED_CONTENT_MESSAGE =
  "Esta origem usa HTTP e foi bloqueada nesta página HTTPS. Para reproduzir, o servidor precisa oferecer HTTPS.";

export function getMpegTsPlaybackErrorMessage(
  errorType: unknown,
  errorDetail: unknown,
  statusCode?: number,
) {
  if (statusCode === 401 || statusCode === 403) {
    return "A origem recusou o acesso à transmissão. Confirme a autorização e se o token de acesso ainda é válido.";
  }

  const detail = String(errorDetail ?? "").toLowerCase();
  if (detail.includes("codec") || detail.includes("format")) {
    return "O formato ou codec desta transmissão não é compatível com este navegador ou aparelho.";
  }

  if (
    detail.includes("exception") ||
    detail.includes("fetch") ||
    detail.includes("cors")
  ) {
    return "O servidor não permitiu carregar a transmissão. Confira se ela está ativa e se a origem autoriza CORS para o domínio CanalMix.";
  }

  if (String(errorType).toLowerCase().includes("network")) {
    return "A transmissão está indisponível no momento. Verifique a rede, o endereço e as permissões de acesso da origem.";
  }

  return "Não foi possível reproduzir esta transmissão MPEG-TS. O codec pode não ser compatível com este aparelho.";
}

export function getMpegTsSourceEndedMessage() {
  return "A origem encerrou o envio MPEG-TS e não informou os próximos segmentos. Para reprodução contínua, cadastre a playlist HLS (.m3u8) da transmissão.";
}

export function MpegTsVideoPlayer({
  src,
  title,
  videoRef,
  muted,
  onCanPlay,
  onPlaying,
  onVolumeChange,
}: {
  src: string;
  title: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  muted: boolean;
  onCanPlay(event: SyntheticEvent<HTMLVideoElement>): void;
  onPlaying?(): void;
  onVolumeChange(event: SyntheticEvent<HTMLVideoElement>): void;
}) {
  const [playback, setPlayback] = useState<PlaybackState>({
    src,
    status: "loading",
  });
  const status = playback.src === src ? playback.status : "loading";
  const message = playback.src === src ? playback.message : undefined;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let disposed = false;
    let player: MpegTsPlayer | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryAttempted = false;
    const setCurrentPlayback = (next: Omit<PlaybackState, "src">) => {
      if (!disposed) setPlayback({ src, ...next });
    };

    setCurrentPlayback({ status: "loading" });

    try {
      if (
        window.location.protocol === "https:" &&
        new URL(src).protocol === "http:"
      ) {
        setCurrentPlayback({ status: "mixed-content", message: MIXED_CONTENT_MESSAGE });
        return;
      }
    } catch {
      setCurrentPlayback({
        status: "error",
        message: "O endereço da transmissão MPEG-TS é inválido.",
      });
      return;
    }

    const handleNativeError = () => {
      if (
        !disposed &&
        playbackStatus !== "unsupported" &&
        playbackStatus !== "retrying"
      ) {
        setCurrentPlayback({
          status: "error",
          message: "Não foi possível decodificar a transmissão MPEG-TS neste aparelho.",
        });
      }
    };
    const handleWaiting = () => {
      if (!disposed && player && !retryAttempted) {
        setCurrentPlayback({ status: "loading" });
      }
    };
    const handlePlaying = () => {
      setCurrentPlayback({ status: "playing" });
    };
    let playbackStatus: PlaybackStatus = "loading";
    const updatePlayback = (next: Omit<PlaybackState, "src">) => {
      playbackStatus = next.status;
      setCurrentPlayback(next);
    };
    const handleEnded = () => {
      if (disposed) return;
      updatePlayback({
        status: "error",
        message: getMpegTsSourceEndedMessage(),
      });
    };

    const attemptOneNetworkRetry = (activePlayer: MpegTsPlayer) => {
      retryAttempted = true;
      updatePlayback({ status: "retrying" });
      video.pause();
      try {
        activePlayer.unload();
      } catch {
        updatePlayback({
          status: "error",
          message: "A conexão com a transmissão foi interrompida. Atualize o player para tentar novamente.",
        });
        return;
      }

      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (disposed || player !== activePlayer) return;
        try {
          activePlayer.load();
          void Promise.resolve(activePlayer.play()).catch(() => {});
        } catch {
          updatePlayback({
            status: "error",
            message: "A transmissão continua indisponível. Atualize o player para tentar novamente.",
          });
        }
      }, 800);
    };

    video.addEventListener("error", handleNativeError);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("stalled", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("ended", handleEnded);

    void import("mpegts.js")
      .then(({ default: mpegtsLibrary }) => {
        if (disposed) return;

        const features = mpegtsLibrary.getFeatureList();
        if (!features.mseLivePlayback) {
          updatePlayback({
            status: "unsupported",
            message: "Este navegador não oferece suporte a MSE para transmissões MPEG-TS ao vivo. Escolha outra opção de reprodução, se disponível.",
          });
          return;
        }

        const instance = mpegtsLibrary.createPlayer(
          { type: "mpegts", isLive: true, url: src },
          { isLive: true, liveBufferLatencyChasing: true },
        );
        player = instance;
        instance.on(mpegtsLibrary.Events.ERROR, (errorType, errorDetail, errorInfo) => {
          if (disposed || player !== instance) return;
          const info =
            typeof errorInfo === "object" && errorInfo !== null
              ? (errorInfo as { code?: unknown })
              : null;
          const statusCode = typeof info?.code === "number" ? info.code : undefined;
          const isNetworkError =
            errorType === mpegtsLibrary.ErrorTypes.NETWORK_ERROR;

          if (
            isNetworkError &&
            !retryAttempted &&
            statusCode !== 401 &&
            statusCode !== 403
          ) {
            attemptOneNetworkRetry(instance);
            return;
          }

          updatePlayback({
            status: "error",
            message: getMpegTsPlaybackErrorMessage(
              errorType,
              errorDetail,
              statusCode,
            ),
          });
        });

        instance.attachMediaElement(video);
        instance.load();
        void Promise.resolve(instance.play()).catch(() => {});
      })
      .catch(() => {
        updatePlayback({
          status: "unsupported",
          message: "Não foi possível iniciar o suporte a MPEG-TS neste navegador. Escolha outra opção de reprodução, se disponível.",
        });
      });

    return () => {
      disposed = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
      video.removeEventListener("error", handleNativeError);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("stalled", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("ended", handleEnded);
      video.pause();

      const activePlayer = player;
      player = null;
      if (activePlayer) {
        try {
          activePlayer.pause();
        } catch {}
        try {
          activePlayer.unload();
        } catch {}
        try {
          activePlayer.detachMediaElement();
        } catch {}
        try {
          activePlayer.destroy();
        } catch {}
      }

      video.removeAttribute("src");
      video.load();
    };
  }, [src, videoRef]);

  return (
    <>
      <video
        aria-label={title}
        autoPlay
        className="channel-player__video"
        controls
        data-mpegts-status={status}
        muted={muted}
        onCanPlay={onCanPlay}
        onPlaying={() => {
          setPlayback({ src, status: "playing" });
          onPlaying?.();
        }}
        onVolumeChange={onVolumeChange}
        playsInline
        preload="metadata"
        ref={videoRef}
      />
      {(status === "loading" || status === "retrying") && (
        <p className="channel-player__mpegts-status" role="status">
          {status === "retrying"
            ? "Reconectando à transmissão…"
            : "Carregando transmissão MPEG-TS…"}
        </p>
      )}
      {(status === "error" || status === "unsupported" || status === "mixed-content") && (
        <p className="channel-player__mpegts-error" role="status">
          {message}
        </p>
      )}
    </>
  );
}
