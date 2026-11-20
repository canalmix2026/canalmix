"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { OnlineVisitorSessionRow } from "@/lib/supabase/database.types";
import { createClientId } from "@/lib/client-id";

const SESSION_COOKIE = "canalmix_online_session";
const SESSION_COOKIE_MAX_AGE_SECONDS = 75;
const HEARTBEAT_INTERVAL_MS = 25_000;
const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type PlaybackContext = {
  channelId: string;
  channelName: string;
  selectedOption: number;
} | null;

type VisitorPresenceContextValue = {
  updatePlayback: (channelId: string, playback: PlaybackContext) => void;
};

const VisitorPresenceContext = createContext<VisitorPresenceContextValue | null>(null);

function readSessionIdCookie() {
  const cookie = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`));
  const value = cookie?.slice(SESSION_COOKIE.length + 1) ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function writeSessionIdCookie(sessionId: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${SESSION_COOKIE}=${sessionId}; Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

function createSessionIdCookie() {
  const sessionId = createClientId();
  writeSessionIdCookie(sessionId);
  return sessionId;
}

async function getTemporarySessionId() {
  const getOrCreate = () => {
    const existingSessionId = readSessionIdCookie();
    if (existingSessionId) {
      writeSessionIdCookie(existingSessionId);
      return existingSessionId;
    }
    return createSessionIdCookie();
  };

  if (navigator.locks?.request) {
    return navigator.locks.request("canalmix-online-session", getOrCreate);
  }
  return getOrCreate();
}

function getApproximateDeviceType(): OnlineVisitorSessionRow["device_type"] {
  const userAgent = navigator.userAgent;
  if (/smart[- ]?tv|hbbtv|appletv|googletv|android tv|tizen|web0s|webos|netcast|viera|bravia/i.test(userAgent)) {
    return "tv";
  }
  if (/ipad|tablet|kindle|silk|playbook/i.test(userAgent) || (/android/i.test(userAgent) && !/mobile/i.test(userAgent))) {
    return "tablet";
  }
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
}

function getPageKey(pathname: string): OnlineVisitorSessionRow["page_key"] {
  if (pathname === "/") return "home";
  if (pathname === "/tv") return "tv";
  if (pathname === "/grade") return "schedule";
  if (pathname === "/privacidade") return "privacy";
  if (pathname.startsWith("/canais/")) return "channel";
  return "other";
}

export function VisitorPresenceProvider({ children }: { children: ReactNode }) {
  const [playback, setPlayback] = useState<PlaybackContext>(null);
  const updatePlayback = useCallback(
    (channelId: string, nextPlayback: PlaybackContext) => {
      setPlayback((current) => {
        if (nextPlayback) return nextPlayback;
        return current?.channelId === channelId ? null : current;
      });
    },
    [],
  );
  const contextValue = useMemo(() => ({ updatePlayback }), [updatePlayback]);

  return (
    <VisitorPresenceContext.Provider value={contextValue}>
      {children}
      <Suspense fallback={null}>
        <VisitorPresenceHeartbeat playback={playback} />
      </Suspense>
    </VisitorPresenceContext.Provider>
  );
}

export function useVisitorPlaybackPresence(
  channelId: string,
  channelName: string,
  selectedOption: number,
) {
  const context = useContext(VisitorPresenceContext);
  const updatePlayback = context?.updatePlayback;

  useEffect(() => {
    if (!updatePlayback) return;
    updatePlayback(channelId, { channelId, channelName, selectedOption });
    return () => updatePlayback(channelId, null);
  }, [channelId, channelName, selectedOption, updatePlayback]);
}

function VisitorPresenceHeartbeat({ playback }: { playback: PlaybackContext }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    let stopped = false;
    let inFlight = false;

    const sendHeartbeat = async () => {
      if (stopped || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;

      try {
        await getTemporarySessionId();
        if (stopped || document.visibilityState !== "visible") return;

        const pageKey = getPageKey(pathname);
        const params = new URLSearchParams(searchParamsKey);
        const categorySlug = pageKey === "home" || pageKey === "tv"
          ? params.get("categoria")
          : null;
        const isValidCategory = Boolean(
          categorySlug && categorySlug.length <= 80 && CATEGORY_SLUG_PATTERN.test(categorySlug),
        );
        const isChannelPage = pageKey === "channel";
        const response = await fetch("/api/online-visitors/heartbeat", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            device_type: getApproximateDeviceType(),
            page_key: pageKey,
            category_slug: isValidCategory ? categorySlug : null,
            channel_name: isChannelPage ? playback?.channelName ?? null : null,
            selected_option: isChannelPage && playback ? playback.selectedOption : null,
          }),
        });

        if (!response.ok) {
          // Heartbeat retries on the next interval or when the page becomes visible again.
        }
      } catch {
        // Presence is optional and must not interfere with public playback or navigation.
      } finally {
        inFlight = false;
      }
    };

    void sendHeartbeat();

    const interval = window.setInterval(() => void sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname, searchParamsKey, playback]);

  return null;
}
