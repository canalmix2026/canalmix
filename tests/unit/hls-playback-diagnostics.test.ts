import assert from "node:assert/strict";
import test from "node:test";
import type { ErrorData } from "hls.js";
import {
  getHlsNetworkMetadata,
  getHlsPlaybackErrorMessage,
  getHlsPlaybackFailure,
} from "../../src/lib/hls-playback-diagnostics";

function hlsError(overrides: Record<string, unknown>) {
  return {
    type: "networkError",
    details: "manifestLoadError",
    ...overrides,
  } as unknown as ErrorData;
}

test("reports manifest CORS/network failures without retaining signed URLs", () => {
  const signedUrl =
    "https://ipv4.pluto.tv/master.m3u8?jwt=temporary-session-token";
  const failure = getHlsPlaybackFailure(
    hlsError({ url: signedUrl, networkDetails: null }),
  );

  assert.equal(failure.kind, "network");
  assert.equal(failure.stage, "manifesto HLS");
  assert.equal(failure.host, "ipv4.pluto.tv");
  assert.equal(failure.code, "network:manifestLoadError");
  assert.equal(JSON.stringify(failure).includes("temporary-session-token"), false);
  assert.match(getHlsPlaybackErrorMessage(failure), /CORS/);
});

test("maps HTTP authentication, denial, and missing-resource failures", () => {
  for (const [status, text] of [
    [401, /autenticação ou sessão/],
    [403, /HTTP 403/],
    [404, /HTTP 404/],
  ] as const) {
    const failure = getHlsPlaybackFailure(
      hlsError({
        type: "networkError",
        details: "fragLoadError",
        response: {
          code: status,
          url: "https://cdn.example/segment.ts?jwt=hidden",
        },
      }),
    );

    assert.equal(failure.status, status);
    assert.equal(failure.stage, "segmento de vídeo");
    assert.match(getHlsPlaybackErrorMessage(failure), text);
  }
});

test("records only final response status and host for redirected HLS resources", () => {
  const metadata = getHlsNetworkMetadata(
    {
      status: 206,
      responseURL:
        "https://siloh-ns1.plutotv.net/live/segment.ts?token=temporary",
    },
  );

  assert.deepEqual(metadata, {
    status: 206,
    host: "siloh-ns1.plutotv.net",
  });
  assert.equal(JSON.stringify(metadata).includes("temporary"), false);
});
