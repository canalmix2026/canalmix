import type { EmbedSourceType } from "@/lib/channel-embed-sources";

export type ChannelPlayerMode =
  | "mpeg-dash"
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

  try {
    if (new URL(src).pathname.toLowerCase().endsWith(".m3u8")) {
      return "hls";
    }
  } catch {
    // Let the existing direct/embed fallback handle URLs the parser rejects.
  }

  return sourceType === "direct-url" ? "native-video" : "embed";
}
