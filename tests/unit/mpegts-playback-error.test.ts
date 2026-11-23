import assert from "node:assert/strict";
import test from "node:test";
import {
  getMpegTsPlaybackErrorMessage,
  getMpegTsSourceEndedMessage,
} from "@/components/mpegts-video-player";

test("MPEG-TS playback errors explain CORS, access, and codec failures", () => {
  assert.match(
    getMpegTsPlaybackErrorMessage("NetworkError", "NetworkException"),
    /CORS/,
  );
  assert.match(
    getMpegTsPlaybackErrorMessage("NetworkError", "HttpStatusCodeInvalid", 403),
    /autorização/,
  );
  assert.match(
    getMpegTsPlaybackErrorMessage("MediaError", "MEDIA_CODEC_UNSUPPORTED"),
    /codec/,
  );
});

test("MPEG-TS playback explains when the origin ends without a segment playlist", () => {
  assert.match(getMpegTsSourceEndedMessage(), /playlist HLS \(\.m3u8\)/);
  assert.match(getMpegTsSourceEndedMessage(), /próximos segmentos/);
});
