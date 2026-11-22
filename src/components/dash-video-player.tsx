"use client";

import { useEffect, useState, type RefObject, type SyntheticEvent } from "react";
import type { MediaPlayerClass } from "dashjs";

const DASH_PLAYBACK_ERROR_MESSAGE =
  "Não foi possível carregar o manifesto MPEG-DASH ou seus segmentos. Verifique a rede e se a origem permite CORS para o domínio CanalMix. O codec pode não ser compatível com este dispositivo, ou o conteúdo pode exigir DRM ou autorizações não disponíveis.";

export function DashVideoPlayer({
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
  onCanPlay: (event: SyntheticEvent<HTMLVideoElement>) => void;
  onPlaying?: () => void;
  onVolumeChange: (event: SyntheticEvent<HTMLVideoElement>) => void;
}) {
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");

  useEffect(() => {
    const video = videoRef.current;
    let disposed = false;
    let player: MediaPlayerClass | null = null;

    setStatus("loading");

    const showError = () => {
      if (!disposed) {
        setStatus("error");
      }
    };

    const handleNativeError = () => showError();
    video?.addEventListener("error", handleNativeError);

    void import("dashjs")
      .then((dashjs) => {
        if (disposed || !video) {
          return;
        }

        player = dashjs.MediaPlayer().create();
        player.on(dashjs.MediaPlayer.events.ERROR, showError);
        player.on(dashjs.MediaPlayer.events.PLAYBACK_ERROR, showError);
        player.initialize(video, src, true);
      })
      .catch(showError);

    return () => {
      disposed = true;
      video?.removeEventListener("error", handleNativeError);
      player?.destroy();
      player = null;
      video?.pause();
      video?.removeAttribute("src");
      video?.load();
    };
  }, [src, videoRef]);

  return (
    <>
      <video
        aria-label={title}
        autoPlay
        className="channel-player__video"
        controls
        data-dash-status={status}
        muted={muted}
        onCanPlay={onCanPlay}
        onError={() => setStatus("error")}
        onPlaying={() => {
          setStatus("playing");
          onPlaying?.();
        }}
        onVolumeChange={onVolumeChange}
        playsInline
        preload="metadata"
        ref={videoRef}
      />
      {status === "error" && (
        <p className="channel-player__dash-error" role="status">
          {DASH_PLAYBACK_ERROR_MESSAGE}
        </p>
      )}
    </>
  );
}
