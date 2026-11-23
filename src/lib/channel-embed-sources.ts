export type EmbedSourceType =
  | "direct-url"
  | "iframe-url"
  | "iframe-code"
  | "mpeg-dash";

export type EmbedSourceContent =
  | { url: string }
  | {
      src: string;
      title?: string;
      allow?: string;
      allowFullscreen?: boolean;
    };

export type ChannelEmbedSource = {
  id: string;
  type: EmbedSourceType;
  content: EmbedSourceContent;
  active: boolean;
};

export type ChannelEmbedSourceDraft = {
  id: string;
  isNew: boolean;
  type: EmbedSourceType;
  active: boolean;
  url: string;
  iframeCode: string;
};

export const EMBED_SOURCE_TYPE_LABELS: Record<EmbedSourceType, string> = {
  "direct-url": "Link direto",
  "iframe-url": "Página para incorporar",
  "iframe-code": "Código iframe",
  "mpeg-dash": "MPEG-DASH (MPD)",
};

export const DEFAULT_IFRAME_ALLOW =
  "autoplay; encrypted-media; picture-in-picture; fullscreen";

export function getChannelEmbedSourceUrl(source: ChannelEmbedSource) {
  return "url" in source.content ? source.content.url : source.content.src;
}

export function isDirectVideoUrl(value: string) {
  try {
    return /\.(?:m3u8|mp4|m4v|webm|ogv|ogg)$/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

export function isMpegDashUrl(value: string) {
  try {
    return new URL(value).pathname.toLowerCase().endsWith(".mpd");
  } catch {
    return false;
  }
}

export function toChannelEmbedSourceDraft(
  source: ChannelEmbedSource,
): ChannelEmbedSourceDraft {
  const url = getChannelEmbedSourceUrl(source);
  const iframeCode =
    source.type === "iframe-code" && "src" in source.content
      ? [
          "<iframe",
          `src="${escapeIframeAttribute(source.content.src)}"`,
          source.content.title
            ? `title="${escapeIframeAttribute(source.content.title)}"`
            : "",
          source.content.allow
            ? `allow="${escapeIframeAttribute(source.content.allow)}"`
            : "",
          source.content.allowFullscreen ? "allowfullscreen" : "",
          "></iframe>",
        ]
          .filter(Boolean)
          .join(" ")
      : "";

  return {
    id: source.id,
    isNew: false,
    type: source.type,
    active: source.active,
    url,
    iframeCode,
  };
}

export function inferEmbedSourceTypeFromUrl(url: string): EmbedSourceType {
  if (isMpegDashUrl(url)) {
    return "mpeg-dash";
  }

  return isDirectVideoUrl(url) ? "direct-url" : "iframe-url";
}

function escapeIframeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
