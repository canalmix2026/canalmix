import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("HLS.js follows an authorized redirect through quality playlists and segments", async ({
  page,
}) => {
  const requestedPaths: string[] = [];
  const requestedUrls: string[] = [];
  let streamOrigin = "";
  const originalToken = "registered-source-token-with-query-parameters";
  const redirectToken = "final-manifest-session-token-" + "long-".repeat(12);
  const streamServer = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", streamOrigin || "http://127.0.0.1");
    requestedPaths.push(requestUrl.pathname);
    requestedUrls.push(requestUrl.href);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "http://127.0.0.1:3000",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range",
    };

    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders);
      response.end();
      return;
    }

    if (requestUrl.pathname === "/start.m3u8") {
      response.writeHead(302, {
        ...corsHeaders,
        Location: streamOrigin + "/cdn/master.m3u8?session=" + redirectToken,
      });
      response.end();
      return;
    }

    if (requestUrl.pathname === "/cdn/master.m3u8") {
      response.writeHead(200, {
        ...corsHeaders,
        "Content-Type": "application/vnd.apple.mpegurl",
      });
      response.end(
        "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=640x360\n/cdn/high.m3u8?session=" + redirectToken + "\n",
      );
      return;
    }

    if (requestUrl.pathname === "/cdn/high.m3u8") {
      response.writeHead(200, {
        ...corsHeaders,
        "Content-Type": "application/vnd.apple.mpegurl",
      });
      response.end(
        "#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:4.0,\n/cdn/segment.ts?session=" + redirectToken + "\n#EXT-X-ENDLIST\n",
      );
      return;
    }

    if (requestUrl.pathname === "/cdn/segment.ts") {
      response.writeHead(200, {
        ...corsHeaders,
        "Content-Type": "video/mp2t",
      });
      response.end(Buffer.alloc(188, 0xff));
      return;
    }

    response.writeHead(404, corsHeaders);
    response.end();
  });

  await new Promise<void>((resolve, reject) => {
    streamServer.once("error", reject);
    streamServer.listen(0, "127.0.0.1", resolve);
  });

  const address = streamServer.address() as AddressInfo;
  streamOrigin = `http://127.0.0.1:${address.port}`;

  try {
    await page.goto("/");
    await page.addScriptTag({
      path: path.resolve("node_modules/hls.js/dist/hls.min.js"),
    });
    const registeredUrl =
      streamOrigin +
      "/start.m3u8?token=" +
      encodeURIComponent(originalToken) +
      "&channel=plu-64d626ac9b414d000820e2fc";
    await page.evaluate((sourceUrl) => {
      type TestHlsData = {
        url?: string;
        frag?: { type?: string };
        fatal?: boolean;
        details?: string;
      };
      type TestHlsPlayer = {
        on(event: string, handler: (event: string, data: unknown) => void): void;
        attachMedia(video: HTMLVideoElement): void;
        loadSource(url: string): void;
        startLoad(): void;
        startLevel: number;
        levels: Array<{ bitrate: number }>;
        destroy(): void;
      };
      type TestHlsConstructor = {
        new (config: { autoStartLoad: boolean }): TestHlsPlayer;
        isSupported(): boolean;
        Events: {
          MEDIA_ATTACHED: string;
          MANIFEST_LOADED: string;
          MANIFEST_PARSED: string;
          LEVEL_LOADED: string;
          FRAG_LOADED: string;
          ERROR: string;
        };
      };
      type TestWindow = Window & {
        Hls?: TestHlsConstructor;
        __hlsRedirectResult?: {
          supported: boolean;
          finalManifestPath: string | null;
          qualityLoaded: boolean;
          segmentLoaded: boolean;
          error: string | null;
        };
      };

      const testWindow = window as TestWindow;
      const Hls = testWindow.Hls;
      const result = {
        supported: Boolean(Hls?.isSupported()),
        finalManifestPath: null as string | null,
        qualityLoaded: false,
        segmentLoaded: false,
        error: null as string | null,
      };
      testWindow.__hlsRedirectResult = result;

      if (!Hls?.isSupported()) return;

      const video = document.createElement("video");
      document.body.append(video);
      const hls = new Hls({ autoStartLoad: false });
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(sourceUrl));
      hls.on(Hls.Events.MANIFEST_LOADED, (_event, data) => {
        const manifest = data as TestHlsData;
        result.finalManifestPath = manifest.url
          ? new URL(manifest.url).pathname
          : null;
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        hls.startLevel = hls.levels.reduce(
          (best, level, index, levels) =>
            level.bitrate > levels[best].bitrate ? index : best,
          0,
        );
        hls.startLoad();
      });
      hls.on(Hls.Events.LEVEL_LOADED, () => {
        result.qualityLoaded = true;
      });
      hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
        if ((data as TestHlsData).frag?.type === "main") {
          result.segmentLoaded = true;
          hls.destroy();
        }
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        const error = data as TestHlsData;
        if (error.fatal) result.error = error.details ?? "fatal HLS error";
      });
      hls.attachMedia(video);
    }, registeredUrl);

    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & {
                __hlsRedirectResult?: { segmentLoaded: boolean };
              }
            ).__hlsRedirectResult?.segmentLoaded,
        ),
      )
      .toBe(true);

    const result = await page.evaluate(
      () =>
        (
          window as Window & {
            __hlsRedirectResult?: {
              supported: boolean;
              finalManifestPath: string | null;
              qualityLoaded: boolean;
              segmentLoaded: boolean;
              error: string | null;
            };
          }
        ).__hlsRedirectResult,
    );
    expect(result).toMatchObject({
      supported: true,
      finalManifestPath: "/cdn/master.m3u8",
      qualityLoaded: true,
      segmentLoaded: true,
      error: null,
    });
    expect(requestedPaths).toEqual(
      expect.arrayContaining([
        "/start.m3u8",
        "/cdn/master.m3u8",
        "/cdn/high.m3u8",
        "/cdn/segment.ts",
      ]),
    );
    expect(requestedUrls).toContain(registeredUrl);
    expect(requestedUrls).toContain(
      streamOrigin + "/cdn/master.m3u8?session=" + redirectToken,
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      streamServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
