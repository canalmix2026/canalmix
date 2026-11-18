const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
  "www.youtu.be",
]);

export function getYouTubeVideoId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  const videoId = host.endsWith("youtu.be")
    ? parts[0]
    : url.pathname === "/watch"
      ? url.searchParams.get("v")
      : ["embed", "live", "shorts", "v"].includes(parts[0] ?? "")
        ? parts[1]
        : null;

  return videoId && VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
}

export function normalizeYouTubeVideoUrl(value: string): string | null {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
}
