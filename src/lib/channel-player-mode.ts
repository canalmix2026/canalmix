import type { EmbedSourceType } from "@/lib/channel-embed-sources";

export type ChannelPlayerMode =
  | "mpeg-dash"
  | "mpeg-ts"
  | "hls"
  | "native-video"
  | "embed";

export function getChannelPlayerMode(
  sourceType: EmbedSourceType | undefined,
  src: string,
): ChannelPlayerMode {
  if (sourceType === "mpeg-dash") {
    return "mpeg-dash";
  }

  if (sourceType === "mpeg-ts") {
    return "mpeg-ts";
  }

  try {
    const pathname = new URL(src).pathname.toLowerCase();
    if (pathname.endsWith(".m3u8")) {
      return "hls";
    }

    if (sourceType === "direct-url" && pathname.endsWith(".mpd")) {
      return "mpeg-dash";
    }
  } catch {
    // Let the existing direct/embed fallback handle URLs the parser rejects.
  }

  return sourceType === "direct-url" ? "native-video" : "embed";
}

export function isMixedContentSource(src: string, pageProtocol: string) {
  if (pageProtocol !== "https:") {
    return false;
  }

  try {
    return new URL(src).protocol === "http:";
  } catch {
    return false;
  }
}
