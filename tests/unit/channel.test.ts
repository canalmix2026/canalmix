import assert from "node:assert/strict";
import test from "node:test";
import {
  CHANNEL_CATEGORIES,
  sortCategories,
  sortChannelsByName,
} from "@/lib/categories";
import {
  channelInputSchema,
  isSafeHttpsUrl,
  normalizeChannelSourceUrl,
  slugifyChannelName,
} from "@/lib/channel-schema";

test("categorias permanecem em ordem alfabética pt-BR", () => {
  assert.deepEqual(
    sortCategories().map((category) => category.name),
    [
      "Canais Abertos",
      "Desenhos",
      "Documentários",
      "Entretenimento",
      "Esporte",
      "Filmes e Séries",
      "Notícias",
    ],
  );
  assert.equal(CHANNEL_CATEGORIES.length, 7);
});

test("canais usam ordenação alfabética em português do Brasil", () => {
  const sorted = sortChannelsByName([
    { name: "Zênite" },
    { name: "Árvore" },
    { name: "Canal 10" },
    { name: "Canal 2" },
  ]);

  assert.deepEqual(
    sorted.map((channel) => channel.name),
    ["Árvore", "Canal 2", "Canal 10", "Zênite"],
  );
});

test("valida URLs HTTPS e rejeita protocolos e credenciais", () => {
  assert.equal(isSafeHttpsUrl("https://player.example.test/embed/1"), true);
  assert.equal(isSafeHttpsUrl("http://player.example.test/embed/1"), false);
  assert.equal(isSafeHttpsUrl("javascript:alert(1)"), false);
  assert.equal(isSafeHttpsUrl("https://user:pass@example.test/embed"), false);
  assert.equal(isSafeHttpsUrl("não é URL"), false);
});

test("aceita HTTP em fontes de vídeo e exige HTTPS para páginas incorporadas", () => {
  assert.equal(
    normalizeChannelSourceUrl("http://cdn.example.test/video.mp4", "direct-url"),
    "http://cdn.example.test/video.mp4",
  );
  assert.equal(
    normalizeChannelSourceUrl("http://cdn.example.test/live.mpd", "mpeg-dash"),
    "http://cdn.example.test/live.mpd",
  );
  assert.equal(
    normalizeChannelSourceUrl("https://player.example.test/watch", "iframe-url"),
    "https://player.example.test/watch",
  );
  assert.equal(
    normalizeChannelSourceUrl("http://player.example.test/watch", "iframe-url"),
    null,
  );
  assert.equal(
    normalizeChannelSourceUrl("http://player.example.test/watch", "iframe-code"),
    null,
  );
});

test("valida dados do canal e mantém URLs opcionais nulas", () => {
  const result = channelInputSchema.safeParse({
    name: "Canal Teste",
    categorySlug: "canais-abertos",
    embedUrls: [
      "https://player.example.test/embed/teste",
      "https://player.example.test/embed/teste-alternativo",
      "https://player.example.test/embed/teste-3",
      "https://player.example.test/embed/teste-4",
    ],
    thumbnailUrl: "",
    officialUrl: "",
    published: false,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.thumbnailUrl, null);
    assert.equal(result.data.officialUrl, null);
    assert.equal(result.data.published, false);
    assert.equal(result.data.embedUrls.length, 4);
  }
});

test("slug remove acentos e caracteres fora do formato", () => {
  assert.equal(slugifyChannelName("TV Farol & Notícias"), "tv-farol-noticias");
});

test("schema rejeita URL de embed que não use HTTPS", () => {
  const result = channelInputSchema.safeParse({
    name: "Canal Teste",
    categorySlug: "canais-abertos",
    embedUrls: [
      "https://player.example.test/embed/seguro",
      "http://player.example.test/embed/teste",
    ],
    thumbnailUrl: "",
    officialUrl: "",
    published: false,
  });

  assert.equal(result.success, false);
});
