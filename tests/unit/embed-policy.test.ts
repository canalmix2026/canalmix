import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EmbedFrame } from "@/components/embed-frame";
import {
  DEFAULT_EMBED_SANDBOX,
  DEFAULT_EMBED_REFERRER_POLICY,
  resolveEmbedReferrerPolicy,
  resolveEmbedSandbox,
  type EmbedProviderOverrides,
} from "@/lib/embed-provider-policy-core";

const providerOverrides = {
  "player.approved.test": ["allow-forms"],
  "limited.approved.test": ["allow-scripts"],
  "strict.approved.test": [],
} satisfies EmbedProviderOverrides;
const referrerOverrides = {
  "v1.rdembed.lat": "no-referrer",
} as const;

test("omite o sandbox por padrão, inclusive para RD Embed e hosts futuros", () => {
  assert.equal(DEFAULT_EMBED_SANDBOX, null);
  assert.equal(
    resolveEmbedSandbox("https://v1.rdembed.lat/globomg", providerOverrides),
    null,
  );
  assert.equal(
    resolveEmbedSandbox("https://future-provider.test/embed", providerOverrides),
    null,
  );
});

test("omite o Referer somente para RD Embed", () => {
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

test("aplica permissões específicas somente ao host exato", () => {
  assert.equal(
    resolveEmbedSandbox("https://player.approved.test/embed", providerOverrides),
    "allow-forms",
  );
  assert.equal(
    resolveEmbedSandbox(
      "https://sub.player.approved.test/embed",
      providerOverrides,
    ),
    null,
  );
});

test("distingue sandbox vazio de atributo omitido", () => {
  assert.equal(
    resolveEmbedSandbox("https://strict.approved.test/embed", providerOverrides),
    "",
  );
  assert.equal(
    resolveEmbedSandbox("https://limited.approved.test/embed", providerOverrides),
    "allow-scripts",
  );
});

test("renderiza sandbox vazio e omissão como configurações diferentes", () => {
  const attributes = {
    src: "https://player.example.test/embed",
    title: "Player de teste",
  };
  const emptySandbox = renderToStaticMarkup(
    createElement(EmbedFrame, { ...attributes, sandbox: "" }),
  );
  const omittedSandbox = renderToStaticMarkup(
    createElement(EmbedFrame, { ...attributes, sandbox: null }),
  );
  const defaultSandbox = renderToStaticMarkup(
    createElement(EmbedFrame, attributes),
  );

  assert.match(emptySandbox, /sandbox=""/);
  assert.doesNotMatch(omittedSandbox, /sandbox=/);
  assert.doesNotMatch(defaultSandbox, /sandbox=/);
});
