"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { EmbedFrame } from "@/components/embed-frame";
import type { EmbedReferrerPolicy } from "@/lib/embed-provider-policy-core";
import {
  loadYouTubeIframeApi,
  type YouTubePlayerInstance,
} from "@/lib/youtube-iframe-api";

function enableYouTubeApi(src: string) {
  const url = new URL(src);
  url.searchParams.set("enablejsapi", "1");
  return url.toString();
}

export function YouTubeEmbedFrame({
  src,
  frameRef,
  title,
  sandbox,
  referrerPolicy,
  muted,
  onMutedChange,
  onApiError,
}: {
  src: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
  title: string;
  sandbox: string | null | undefined;
  referrerPolicy: EmbedReferrerPolicy;
  muted: boolean;
  onMutedChange(muted: boolean): void;
  onApiError(): void;
}) {
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const mutedRef = useRef(muted);
  const autoplayFallbackAttempted = useRef(false);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    let disposed = false;
    let player: YouTubePlayerInstance | null = null;

    void loadYouTubeIframeApi()
      .then((youtubeApi) => {
        const iframe = frameRef.current;
        if (disposed || !iframe) {
          return;
        }

        player = new youtubeApi.Player(iframe, {
          events: {
            onReady(event) {
              if (disposed) {
                event.target.destroy();
                return;
              }

              playerRef.current = event.target;
              if (mutedRef.current) {
                event.target.mute();
              } else {
                event.target.unMute();
              }
              onMutedChange(event.target.isMuted());
              setApiReady(true);
              event.target.playVideo();
            },
            onAutoplayBlocked(event) {
              if (
                disposed ||
                autoplayFallbackAttempted.current ||
                event.target.getPlayerState() === 1 ||
                event.target.isMuted()
              ) {
                return;
              }

              autoplayFallbackAttempted.current = true;
              event.target.mute();
              mutedRef.current = true;
              onMutedChange(true);
              event.target.playVideo();
            },
          },
        });
        playerRef.current = player;
      })
      .catch(() => {
        if (!disposed) {
          onApiError();
        }
      });

    return () => {
      disposed = true;
      if (playerRef.current === player) {
        playerRef.current = null;
      }
      try {
        player?.pauseVideo();
      } catch {
        // The player may already be detached.
      }
      try {
        player?.destroy();
      } catch {
        // The iframe is already being removed by React.
      }
    };
  }, [frameRef, onApiError, onMutedChange]);

  useEffect(() => {
    if (!apiReady) {
      return;
    }

    const player = playerRef.current;
    if (!player) {
      return;
    }

    try {
      if (muted) {
        player.mute();
      } else {
        player.unMute();
      }
    } catch {
      onApiError();
    }
  }, [apiReady, muted, onApiError]);

  useEffect(() => {
    if (!apiReady) {
      return;
    }

    const intervalId = window.setInterval(() => {
      try {
        const actualMuted = playerRef.current?.isMuted();
        if (typeof actualMuted === "boolean") {
          mutedRef.current = actualMuted;
          onMutedChange(actualMuted);
        }
      } catch {
        onApiError();
      }
    }, 400);

    return () => window.clearInterval(intervalId);
  }, [apiReady, onApiError, onMutedChange]);

  return (
    <EmbedFrame
      className="channel-player__frame"
      frameRef={frameRef}
      src={enableYouTubeApi(src)}
      title={title}
      sandbox={sandbox}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy={referrerPolicy}
    />
  );
}
