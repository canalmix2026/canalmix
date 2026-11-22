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

  if (sourceType !== "direct-url") {
    return "embed";
  }

  try {
    return new URL(src).pathname.toLowerCase().endsWith(".m3u8")
      ? "hls"
      : "native-video";
  } catch {
    return "native-video";
  }
}
