import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EmbedFrame } from "@/components/embed-frame";
import {
  DEFAULT_EMBED_REFERRER_POLICY,
  resolveEmbedReferrerPolicy,
} from "@/lib/embed-provider-policy-core";

const referrerOverrides = {
  "v1.rdembed.lat": "no-referrer",
} as const;

test("omits the Referer only for RD Embed", () => {
  assert.equal(
    resolveEmbedReferrerPolicy(
      "https://v1.rdembed.lat/globomg",
      referrerOverrides,
    ),
    "no-referrer",
  );
  assert.equal(
    resolveEmbedReferrerPolicy(
      "https://sub.v1.rdembed.lat/globomg",
      referrerOverrides,
    ),
    DEFAULT_EMBED_REFERRER_POLICY,
  );
  assert.equal(
    resolveEmbedReferrerPolicy(
      "https://rdcanais.org/globomg",
      referrerOverrides,
    ),
    DEFAULT_EMBED_REFERRER_POLICY,
  );
});

test("renders embeds without sandbox and keeps CanalMix playback permissions", () => {
  const hostileProps = {
    src: "https://player.example.test/embed",
    title: "Player de teste",
    sandbox: "allow-scripts",
    allow: "autoplay; popups; top-navigation",
    allowFullScreen: false,
  } as unknown as ComponentProps<typeof EmbedFrame>;
  const markup = renderToStaticMarkup(createElement(EmbedFrame, hostileProps));

  assert.doesNotMatch(markup, /\s+sandbox(?:=|\s|>)/i);
  assert.match(
    markup,
    /allow="autoplay; encrypted-media; picture-in-picture; fullscreen"/,
  );
  assert.match(markup, /allowfullscreen(?:="")?/i);
});
