"use client";

export type LocalChannelLibrary = {
  favorites: string[];
  history: string[];
};

export const LOCAL_CHANNEL_LIBRARY_KEY = "canalmix.channel-library.v1";
export const LOCAL_CHANNEL_LIBRARY_EVENT = "canalmix:channel-library-change";
export const MAX_RECENT_CHANNELS = 30;

export const EMPTY_LOCAL_CHANNEL_LIBRARY: LocalChannelLibrary = {
  favorites: [],
  history: [],
};

function uniqueIds(values: unknown, limit?: number): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0 || value.length > 80 || seen.has(value)) {
      continue;
    }
    seen.add(value);
    ids.push(value);
    if (limit !== undefined && ids.length >= limit) {
      break;
    }
  }
  return ids;
}

export function normalizeLocalChannelLibrary(value: unknown): LocalChannelLibrary {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_LOCAL_CHANNEL_LIBRARY };
  }
  const stored = value as Partial<LocalChannelLibrary>;
  return {
    favorites: uniqueIds(stored.favorites),
    history: uniqueIds(stored.history, MAX_RECENT_CHANNELS),
  };
}

export function recordLocalChannelVisit(
  library: LocalChannelLibrary,
  channelId: string,
): LocalChannelLibrary {
  return {
    ...library,
    history: [channelId, ...library.history.filter((id) => id !== channelId)].slice(
      0,
      MAX_RECENT_CHANNELS,
    ),
  };
}

export function toggleLocalChannelFavorite(
  library: LocalChannelLibrary,
  channelId: string,
): LocalChannelLibrary {
  return library.favorites.includes(channelId)
    ? { ...library, favorites: library.favorites.filter((id) => id !== channelId) }
    : { ...library, favorites: [channelId, ...library.favorites] };
}

export function readLocalChannelLibrary(): LocalChannelLibrary {
  if (typeof window === "undefined") {
    return { ...EMPTY_LOCAL_CHANNEL_LIBRARY };
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_CHANNEL_LIBRARY_KEY);
    return normalizeLocalChannelLibrary(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...EMPTY_LOCAL_CHANNEL_LIBRARY };
  }
}

export function writeLocalChannelLibrary(library: LocalChannelLibrary) {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = normalizeLocalChannelLibrary(library);
  try {
    window.localStorage.setItem(LOCAL_CHANNEL_LIBRARY_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event(LOCAL_CHANNEL_LIBRARY_EVENT));
  } catch {
    // Keep the page usable if browser storage is disabled or full.
  }
}

export function subscribeToLocalChannelLibrary(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_CHANNEL_LIBRARY_KEY || event.key === null) {
      onChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(LOCAL_CHANNEL_LIBRARY_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LOCAL_CHANNEL_LIBRARY_EVENT, onChange);
  };
}
