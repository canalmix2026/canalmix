import assert from "node:assert/strict";
import test from "node:test";
import {
  EMBED_SOURCE_TYPE_LABELS,
  toChannelEmbedSourceDraft,
  type ChannelEmbedSource,
} from "@/lib/channel-embed-sources";
import { getChannelPlayerMode } from "@/lib/channel-player-mode";

test("MPEG-DASH uses its saved type even without an .mpd path", () => {
  const source: ChannelEmbedSource = {
    id: "f8c914a0-f423-4f65-b71a-7d264a95a76c",
    type: "mpeg-dash",
    content: { url: "https://cdn.example.test/live?id=123&token=private" },
    active: true,
  };

  assert.equal(
    getChannelPlayerMode(source.type, "https://cdn.example.test/live?id=123&token=private"),
    "mpeg-dash",
  );
  assert.equal(toChannelEmbedSourceDraft(source).type, "mpeg-dash");
  assert.equal(EMBED_SOURCE_TYPE_LABELS["mpeg-dash"], "MPEG-DASH (MPD)");
});

test("legacy source types keep their current playback paths", () => {
  assert.equal(
    getChannelPlayerMode("direct-url", "https://cdn.example.test/live.m3u8?token=x"),
    "hls",
  );
  assert.equal(
    getChannelPlayerMode("direct-url", "https://cdn.example.test/video.mp4"),
    "native-video",
  );
  assert.equal(
    getChannelPlayerMode("direct-url", "https://cdn.example.test/manifest.mpd"),
    "native-video",
  );
  assert.equal(
    getChannelPlayerMode("iframe-url", "https://cdn.example.test/live.m3u8"),
    "embed",
  );
  assert.equal(
    getChannelPlayerMode("iframe-code", "https://cdn.example.test/manifest.mpd"),
    "embed",
  );
});
