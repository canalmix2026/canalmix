import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page, type Route } from "@playwright/test";
import localSupabase from "../../scripts/local-supabase.cjs";

const { readLocalSupabaseStatus } = localSupabase;

type TestUser = { id: string; email: string; password: string };
type TestChannel = { id: string; slug: string; name: string };
type PremiereChannel = TestChannel & { embedUrls: string[] };

let adminClient: SupabaseClient;
let anonymousKey = "";
let adminUser: TestUser;
let nonAdminUser: TestUser;
let navigationChannel: TestChannel;
let premiereChannel: PremiereChannel;
let nativeVideoChannel: TestChannel;
let hlsFullscreenChannel: TestChannel;
let youtubeChannel: TestChannel;
let premiereOptionTwoUrl = "";
let crudChannelName = "";
let crudChannelSlug = "";
let nativeMultiVideoChannel: TestChannel;
const channelIds: string[] = [];
const hlsFullscreenUrl =
  "https://jmp2.uk/plu-64d626ac9b414d000820e2fc.m3u8?canalmix_test=screen&token=keep%2Bvalue";
const embedTestDocument = `<!doctype html>
<html><body>
  <button id="play">Play</button>
  <output id="playback-state">Parado</output>
  <button id="popup">Abrir nova aba</button>
  <button id="top-navigation">Redirecionar página</button>
  <script>
    document.getElementById("play").addEventListener("click", () => {
      document.getElementById("playback-state").textContent = "Reproduzindo";
    });
    document.getElementById("popup").addEventListener("click", () => {
      let popup = null;
      try { popup = window.open("https://sandbox-escape.test/pop-up", "_blank"); } catch {}
      document.body.dataset.popupOpened = String(popup !== null);
    });
    document.getElementById("top-navigation").addEventListener("click", () => {
      try { window.top?.location.assign("https://sandbox-escape.test/escape"); } catch {}
      document.body.dataset.topNavigationAttempted = "true";
    });
  </script>
</body></html>`;

async function fulfillEmbedDocument(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "text/html",
    body: embedTestDocument,
  });
}

async function signIn(page: Page, user: TestUser) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await page.waitForURL("**/admin/canais");
}

async function insertTestChannel(
  channel: TestChannel,
  categoryId: number,
  embedUrls: string[],
) {
  const { data, error } = await adminClient
    .from("channels")
    .insert({
      slug: channel.slug,
      name: channel.name,
      category_id: categoryId,
      embed_urls: embedUrls,
      is_published: true,
      published_at: new Date().toISOString(),
      created_by: adminUser.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Não foi possível criar o canal temporário " + channel.name + ".");
  }

  channel.id = data.id;
  channelIds.push(data.id);
}

async function mockVideoAutoplay(page: Page, rejectWithAudio: boolean) {
  await page.addInitScript((shouldRejectAudiblePlayback) => {
    type PlayAttempt = { muted: boolean };
    type TestWindow = Window & {
      __mediaPlayAttempts?: PlayAttempt[];
      __rejectAudiblePlayback?: boolean;
    };

    const testWindow = window as TestWindow;
    testWindow.__mediaPlayAttempts = [];
    testWindow.__rejectAudiblePlayback = shouldRejectAudiblePlayback;
    HTMLMediaElement.prototype.play = function () {
      const activeWindow = window as TestWindow;
      activeWindow.__mediaPlayAttempts?.push({ muted: this.muted });
      if (!this.muted && activeWindow.__rejectAudiblePlayback) {
        return Promise.reject(
          new DOMException("Autoplay with audio is blocked.", "NotAllowedError"),
        );
      }
      return Promise.resolve();
    };
  }, rejectWithAudio);
}

test.beforeAll(async () => {
  const status = readLocalSupabaseStatus();
  if (!status.serviceRoleKey || !status.publishableKey) {
    throw new Error("Inicie o Supabase local antes dos testes de ponta a ponta.");
  }

  anonymousKey = status.publishableKey;
  adminClient = createClient(status.url, status.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const suffix = crypto.randomUUID().slice(0, 8);
  adminUser = {
    id: "",
    email: "canalmix-teste-admin-" + suffix + "@local.test",
    password: "CanalMix-Teste-" + crypto.randomUUID().slice(0, 10),
  };
  nonAdminUser = {
    id: "",
    email: "canalmix-teste-sem-permissao-" + suffix + "@local.test",
    password: "CanalMix-Teste-" + crypto.randomUUID().slice(0, 10),
  };

  const { data: createdAdmin, error: adminError } =
    await adminClient.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
    });
  if (adminError || !createdAdmin.user) {
    throw new Error("Não foi possível criar o administrador temporário de teste.");
  }
  adminUser.id = createdAdmin.user.id;

  const { error: membershipError } = await adminClient
    .from("catalog_admins")
    .insert({ user_id: adminUser.id });
  if (membershipError) {
    throw new Error("Não foi possível autorizar o administrador de teste.");
  }

  const { data: createdNonAdmin, error: nonAdminError } =
    await adminClient.auth.admin.createUser({
      email: nonAdminUser.email,
      password: nonAdminUser.password,
      email_confirm: true,
    });
  if (nonAdminError || !createdNonAdmin.user) {
    throw new Error("Não foi possível criar a conta sem permissão para o teste.");
  }
  nonAdminUser.id = createdNonAdmin.user.id;

  const { data: category } = await adminClient
    .from("categories")
    .select("id")
    .eq("slug", "esporte")
    .single();
  if (!category) {
    throw new Error("A migration local não carregou as categorias.");
  }

  navigationChannel = {
    id: "",
    slug: "canalmix-teste-navegacao-" + suffix,
    name: "TESTE Navegação CanalMix",
  };
  const { data: navData, error: navError } = await adminClient
    .from("channels")
    .insert({
      slug: navigationChannel.slug,
      name: navigationChannel.name,
      category_id: category.id,
      embed_urls: ["https://v1.rdembed.lat/globomg"],
      official_url: "https://canalmix.test/navegacao",
      is_published: true,
      published_at: new Date().toISOString(),
      created_by: adminUser.id,
    })
    .select("id")
    .single();
  if (navError || !navData) {
    throw new Error("Não foi possível criar o cartão temporário de navegação.");
  }
  navigationChannel.id = navData.id;
  channelIds.push(navData.id);

  const { data: publishedPremiere, error: premiereLookupError } = await adminClient
    .from("channels")
    .select("id, slug, name, embed_urls, is_published")
    .eq("slug", "premiere-1")
    .maybeSingle();
  if (premiereLookupError) {
    throw new Error("Não foi possível consultar o canal Premiere 1 local.");
  }

  if (publishedPremiere?.is_published && publishedPremiere.embed_urls.length > 1) {
    premiereChannel = {
      id: publishedPremiere.id,
      slug: publishedPremiere.slug,
      name: publishedPremiere.name,
      embedUrls: publishedPremiere.embed_urls,
    };
  } else {
    const premiereFixture: TestChannel = {
      id: "",
      slug: "canalmix-teste-premiere-1-" + suffix,
      name: "Premiere 1",
    };
    premiereChannel = {
      ...premiereFixture,
      embedUrls: [
        "https://ww0.embedtv.cc/premiere",
        "https://la18hd.su/vivo/canales.php?stream=premiere1",
      ],
    };
    await insertTestChannel(
      premiereFixture,
      category.id,
      premiereChannel.embedUrls,
    );
    premiereChannel.id = premiereFixture.id;
    premiereChannel.slug = premiereFixture.slug;
  }
  premiereOptionTwoUrl = premiereChannel.embedUrls[1];

  nativeVideoChannel = {
    id: "",
    slug: "canalmix-teste-audio-nativo-" + suffix,
    name: "TESTE Vídeo próprio CanalMix",
  };
  await insertTestChannel(nativeVideoChannel, category.id, [
    "https://media.canalmix.test/audio-test.mp4",
  ]);

  hlsFullscreenChannel = {
    id: "",
    slug: "canalmix-teste-hls-fullscreen-" + suffix,
    name: "TESTE Tela cheia HLS CanalMix",
  };
  await insertTestChannel(hlsFullscreenChannel, category.id, [hlsFullscreenUrl]);

  nativeMultiVideoChannel = {
    id: "",
    slug: "canalmix-teste-autoplay-opcoes-" + suffix,
    name: "TESTE Autoplay com opções CanalMix",
  };
  await insertTestChannel(nativeMultiVideoChannel, category.id, [
    "https://media.canalmix.test/audio-option-one.mp4",
    "https://media.canalmix.test/audio-option-two.mp4",
  ]);

  youtubeChannel = {
    id: "",
    slug: "canalmix-teste-youtube-audio-" + suffix,
    name: "TESTE YouTube áudio CanalMix",
  };
  await insertTestChannel(youtubeChannel, category.id, [
    "https://www.youtube.com/embed/M7lc1UVf-VE",
  ]);
});

test.afterAll(async () => {
  if (adminClient) {
    if (channelIds.length > 0) {
      await adminClient.from("channels").delete().in("id", channelIds);
    }
    await adminClient
      .from("channels")
      .delete()
      .like("slug", "teste-canalmix-crud-%");
    if (nonAdminUser?.id) {
      await adminClient.auth.admin.deleteUser(nonAdminUser.id);
    }
    if (adminUser?.id) {
      await adminClient.auth.admin.deleteUser(adminUser.id);
    }
  }
});

test("salva e reproduz uma fonte de vídeo HTTP no player nativo", async ({ page }) => {
  await signIn(page, adminUser);

  const channelName = "TESTE Vídeo HTTP CanalMix " + crypto.randomUUID().slice(0, 8);
  const videoUrl = "http://video.canalmix.test/clip.mp4";
  await page.route(videoUrl, (route) => route.abort());
  await page.getByRole("button", { name: "Adicionar canal" }).click();
  await page.getByLabel("Nome do canal").fill(channelName);
  await page.getByLabel("Categoria", { exact: true }).selectOption("canais-abertos");
  await page.getByLabel("Tipo da opção 1", { exact: true }).selectOption("direct-url");
  await page.getByLabel("Opção 1", { exact: true }).fill(videoUrl);
  await page.getByRole("button", { name: "Salvar canal" }).click();
  await expect(page.getByText(channelName)).toBeVisible();

  const { data: savedChannel, error } = await adminClient
    .from("channels")
    .select("id, slug, embed_urls, embed_sources")
    .eq("name", channelName)
    .maybeSingle();
  expect(error).toBeNull();
  expect(savedChannel).not.toBeNull();
  if (!savedChannel) return;
  channelIds.push(savedChannel.id);
  expect(savedChannel.embed_urls).toEqual([videoUrl]);
  const source = (savedChannel.embed_sources as { type: string; content: { url: string } }[])[0];
  expect(source).toMatchObject({ type: "direct-url", content: { url: videoUrl } });

  await page.getByRole("button", { name: "Publicar " + channelName }).click();
  await expect(
    page.getByRole("article").filter({ hasText: channelName }).locator(".status-pill"),
  ).toHaveText("Publicado");
  await page.goto("/canais/" + savedChannel.slug);
  await expect(page.getByLabel("Vídeo do canal " + channelName)).toHaveAttribute(
    "src",
    videoUrl,
  );
});

test("players externos podem abrir pop-ups necessários", async ({
  page,
  context,
}) => {
  await page.route("https://v1.rdembed.lat/**", fulfillEmbedDocument);
  await context.route("https://sandbox-escape.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Pop-up do player</title>",
    }),
  );
  await page.goto("/canais/" + navigationChannel.slug);

  const player = page.locator("iframe.channel-player__frame");
  const embeddedPage = page.frameLocator("iframe.channel-player__frame");
  await expect(player).not.toHaveAttribute("sandbox");
  const popupPromise = page.waitForEvent("popup");
  await embeddedPage.getByRole("button", { name: "Abrir nova aba" }).click();
  const popup = await popupPromise;
  await expect(embeddedPage.locator("body")).toHaveAttribute(
    "data-popup-opened",
    "true",
  );
  await expect(popup).toHaveTitle("Pop-up do player");
  await popup.close();
  await expect.poll(() => context.pages().length).toBe(1);
});

test("bloqueia acesso administrativo sem permissão", async ({ page }) => {
  await page.goto("/admin/canais");
  await expect(page).toHaveURL(/\/admin\/login/);

  const nonAdminClient = createClient(
    readLocalSupabaseStatus().url,
    anonymousKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  await nonAdminClient.auth.signInWithPassword({
    email: nonAdminUser.email,
    password: nonAdminUser.password,
  });
  const { error: insertError } = await nonAdminClient.from("channels").insert({
    slug: "canalmix-teste-sem-permissao",
    name: "TESTE Sem permissão",
    category_id: 1,
    embed_urls: ["https://player.canalmix.test/embed/sem-permissao"],
    created_by: nonAdminUser.id,
  });
  expect(insertError).not.toBeNull();

  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(nonAdminUser.email);
  await page.getByLabel("Senha").fill(nonAdminUser.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(
    page.getByRole("alert").getByText(
      "Esta conta não tem permissão para acessar o painel.",
    ),
  ).toBeVisible();
  await page.goto("/admin/canais");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("Modo TV navega por setas, atualiza a fonte selecionada e volta ao cartão de origem", async ({ page }) => {
  const manifestRequests: string[] = [];
  page.on("request", (request) => {
    try {
      if (new URL(request.url()).pathname.toLowerCase().endsWith(".m3u8")) {
        manifestRequests.push(request.url());
      }
    } catch {
      // Ignore non-URL requests.
    }
  });
  await page.route("https://la18hd.su/**", (route) => route.abort());
  await page.route("https://ww0.embedtv.cc/**", (route) => route.abort());
  await page.route("https://v1.rdembed.lat/**", (route) => route.abort());
  await page.goto("/tv");
  await page.getByRole("searchbox", { name: "Buscar canal pelo nome" }).fill(premiereChannel.name);
  const originCard = page.getByRole("link", { name: "Assistir " + premiereChannel.name });
  await originCard.focus();
  const listScrollY = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("Enter");

  const optionTwo = page.getByRole("button", { name: "Opção 2" });
  const refresh = page.getByRole("button", { name: "Atualizar player" });
  const player = page.locator("video.channel-player__video");
  await expect(page.getByRole("button", { name: "Opção 1" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(optionTwo).toBeFocused();
  await expect(player).toHaveAttribute("data-hls-mode", "hls.js");
  await expect.poll(() => manifestRequests.filter((url) => url === premiereOptionTwoUrl).length).toBeGreaterThan(0);
  await expect(page.locator(".channel-player__audio, .channel-player__fullscreen")).toHaveCount(0);
  await page.keyboard.press("ArrowDown");
  await expect(refresh).toBeFocused();
  const videoBeforeRefresh = await player.elementHandle();
  await page.keyboard.press("Enter");
  expect(await videoBeforeRefresh?.evaluate((video) => video.isConnected)).toBe(false);
  await expect(player).toHaveAttribute("data-hls-mode", "hls.js");
  await expect.poll(() => manifestRequests.filter((url) => url === premiereOptionTwoUrl).length).toBeGreaterThan(1);
  await expect(optionTwo).toHaveAttribute("aria-pressed", "true");
  await expect(refresh).toBeFocused();

  await page.evaluate(() => {
    const currentPlayer = document.querySelector("video.channel-player__video");
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => document.body.dataset.testFullscreen === "true" ? currentPlayer : null,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: () => {
        document.body.dataset.testFullscreen = "false";
        return Promise.resolve();
      },
    });
    document.body.dataset.testFullscreen = "true";
  });
  const channelUrl = page.url();
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  expect(page.url()).toBe(channelUrl);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/tv\?/);
  await expect(page.getByRole("link", { name: "Assistir " + premiereChannel.name })).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(listScrollY);
});

test("player de vídeo próprio mantém autoplay sem controles extras de áudio ou tela cheia", async ({ page }) => {
  await page.route("https://media.canalmix.test/**", (route) => route.abort());
  await mockVideoAutoplay(page, true);
  await page.goto("/canais/" + nativeVideoChannel.slug);
  const video = page.locator("video.channel-player__video");
  const refresh = page.getByRole("button", { name: "Atualizar player" });
  await video.evaluate((element) => element.dispatchEvent(new Event("canplay", { bubbles: true })));
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video).toHaveAttribute("controls", "");
  await expect(page.locator(".channel-player__audio, .channel-player__fullscreen")).toHaveCount(0);
  const firstVideo = await video.elementHandle();
  await refresh.click();
  expect(await firstVideo?.evaluate((element) => element.isConnected)).toBe(false);
  await expect(video).toHaveJSProperty("muted", true);
});
for (const [viewportName, viewport] of [
  ["desktop", { width: 1280, height: 720 }],
  ["celular", { width: 390, height: 844 }],
] as const) {
  test(`HLS usa o URL M3U8 original e expande o player inteiro em tela cheia no ${viewportName}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const hlsRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().startsWith(hlsFullscreenUrl)) {
        hlsRequests.push(request.url());
      }
    });
    await page.route("https://jmp2.uk/**", (route) => route.abort());
    await page.goto("/canais/" + hlsFullscreenChannel.slug);

    const player = page.locator(".channel-player");
    const stage = page.locator(".channel-player__stage");
    const video = page.locator("video.channel-player__video");
    await expect(video).toHaveAttribute("data-hls-mode", "hls.js");
    await expect.poll(() => hlsRequests.includes(hlsFullscreenUrl)).toBe(true);

    await page.getByRole("button", { name: "Tela cheia" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.fullscreenElement === document.querySelector(".channel-player"),
        ),
      )
      .toBe(true);
    await expect(page.getByRole("button", { name: "Sair da tela cheia" })).toBeVisible();

    const fullscreenLayout = await player.evaluate((container) => {
      const stageElement = container.querySelector(".channel-player__stage");
      const videoElement = container.querySelector("video");
      const containerRect = container.getBoundingClientRect();
      const stageRect = stageElement?.getBoundingClientRect();
      const videoRect = videoElement?.getBoundingClientRect();

      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        containerWidth: containerRect.width,
        containerHeight: containerRect.height,
        stageWidth: stageRect?.width ?? 0,
        stageHeight: stageRect?.height ?? 0,
        videoWidth: videoRect?.width ?? 0,
        videoHeight: videoRect?.height ?? 0,
        objectFit: videoElement ? getComputedStyle(videoElement).objectFit : "",
      };
    });
    expect(Math.abs(fullscreenLayout.containerWidth - fullscreenLayout.viewportWidth)).toBeLessThan(2);
    expect(Math.abs(fullscreenLayout.containerHeight - fullscreenLayout.viewportHeight)).toBeLessThan(2);
    expect(fullscreenLayout.stageWidth).toBeGreaterThan(0);
    expect(fullscreenLayout.stageHeight).toBeGreaterThan(0);
    expect(fullscreenLayout.videoWidth).toBe(fullscreenLayout.stageWidth);
    expect(fullscreenLayout.videoHeight).toBe(fullscreenLayout.stageHeight);
    expect(fullscreenLayout.objectFit).toBe("contain");

    await page.getByRole("button", { name: "Sair da tela cheia" }).click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBe(null);
    await expect(stage).toBeVisible();
  });
}

test("cadastra, publica, edita, oculta, republica e exclui um canal", async ({
  page,
}) => {
  await signIn(page, adminUser);
  await page.route("https://rdcanais.org/**", fulfillEmbedDocument);
  await page.route("https://v1.rdembed.lat/**", fulfillEmbedDocument);
  await page.route("https://player.canalmix.test/**", fulfillEmbedDocument);
  await expect(page.getByRole("heading", { name: "Canais" })).toBeVisible();

  const suffix = crypto.randomUUID().slice(0, 6);
  crudChannelName = "TESTE CanalMix CRUD " + suffix;
  crudChannelSlug = "teste-canalmix-crud-" + suffix;

  await page.getByRole("button", { name: "Adicionar canal" }).click();
  await page.getByLabel("Nome do canal").fill(crudChannelName);
  await page.getByLabel("Categoria", { exact: true }).selectOption("canais-abertos");
  const optionOneUrl = "https://player.canalmix.test/embed/crud";
  const optionTwoUrl = "https://v1.rdembed.lat/globomg";
  const optionThreeUrl = "https://rdcanais.org/globomg";
  const optionFourUrl = "https://player.canalmix.test/embed/crud-4";
  const editedOptionFourUrl = "https://player.canalmix.test/embed/crud-4-atualizado";
  await page.getByLabel("URL do embed — Opção 1").fill(optionOneUrl);
  await page.getByRole("button", { name: "Adicionar opção de player" }).click();
  await page.getByLabel("URL do embed — Opção 2").fill(optionTwoUrl);
  await page.getByRole("button", { name: "Adicionar opção de player" }).click();
  await page.getByLabel("URL do embed — Opção 3").fill(optionThreeUrl);
  await page.getByRole("button", { name: "Adicionar opção de player" }).click();
  await page.getByLabel("URL do embed — Opção 4").fill(optionFourUrl);
  await page
    .getByLabel("URL do embed — Opção 2")
    .fill("http://player.canalmix.test/embed/inseguro");
  await page.getByRole("button", { name: "Salvar canal" }).click();
  await expect(page.locator(".form-error")).toContainText("HTTPS válida");
  await page.getByLabel("URL do embed — Opção 2").fill(optionTwoUrl);
  await page.getByLabel("Logo ou miniatura (opcional)").fill(
    "https://canalmix.test/logo.png",
  );
  await page.getByLabel("Link oficial (opcional)").fill(
    "https://canalmix.test/oficial",
  );
  await page.getByRole("button", { name: "Testar Opção 4" }).click();
  await expect(page.getByRole("dialog", { name: "Prévia" })).toBeVisible();
  await expect(
    page.getByTitle("Prévia do player do canal novo"),
  ).toHaveAttribute("src", optionFourUrl);
  await expect(page.getByTitle("Prévia do player do canal novo")).not.toHaveAttribute("sandbox");
  await page.getByRole("button", { name: "Fechar prévia" }).click();
  await page.getByRole("button", { name: "Embed por código" }).click();
  const hostileEmbedCode = `<iframe src="${optionFourUrl}" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols" allow="autoplay; popups; top-navigation" allowfullscreen></iframe>`;
  await page.getByLabel("Código do embed — Opção 4").fill(hostileEmbedCode);
  await page.getByRole("button", { name: "Testar Opção 4" }).click();
  const codePreview = page.getByRole("dialog").locator("iframe");
  await expect(codePreview).toHaveAttribute("src", optionFourUrl);
  await expect(codePreview).not.toHaveAttribute("sandbox");
  await expect(codePreview).toHaveAttribute(
    "allow",
    "autoplay; encrypted-media; picture-in-picture; fullscreen",
  );
  await expect(codePreview).toHaveAttribute("allowfullscreen", "");
  await page.getByRole("button", { name: "Fechar prévia" }).click();
  await page.getByRole("button", { name: "Embed por URL" }).click();
  await page.locator('button[aria-label^="Testar Opção "]').nth(1).click();
  const rdEmbedPreview = page.getByRole("dialog").locator("iframe");
  await expect(rdEmbedPreview).toHaveAttribute(
    "referrerpolicy",
    "no-referrer",
  );
  await page.getByRole("button", { name: "Fechar prévia" }).click();
  await page.locator('button[aria-label^="Testar Opção "]').nth(2).click();
  const providerPreview = page.getByRole("dialog").locator("iframe");
  await expect(providerPreview).toHaveAttribute("src", optionThreeUrl);
  await expect(providerPreview).not.toHaveAttribute("sandbox");
  await page.getByRole("button", { name: "Fechar prévia" }).click();
  await page.getByRole("button", { name: "Salvar canal" }).click();
  await expect(page.getByText(crudChannelName)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publicar " + crudChannelName }),
  ).toBeVisible();

  const hiddenResult = await page.goto("/canais/" + crudChannelSlug);
  expect(hiddenResult?.status()).toBe(404);
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Buscar canal pelo nome" }).fill(
    crudChannelName,
  );
  await expect(page.getByRole("link", { name: "Assistir " + crudChannelName })).toHaveCount(0);
  await page.goto("/tv");
  await page.getByRole("searchbox", { name: "Buscar canal pelo nome" }).fill(
    crudChannelName,
  );
  await expect(page.getByRole("link", { name: "Assistir " + crudChannelName })).toHaveCount(0);

  await page.goto("/admin/canais");
  await page.getByRole("button", { name: "Publicar " + crudChannelName }).click();
  await expect(
    page.getByRole("article").filter({ hasText: crudChannelName }).locator(".status-pill"),
  ).toHaveText("Publicado");

  await page.goto("/");
  await page.getByRole("searchbox", { name: "Buscar canal pelo nome" }).fill(
    crudChannelName,
  );
  const publicCard = page.getByRole("link", {
    name: "Assistir " + crudChannelName,
  });
  await expect(publicCard).toBeVisible();
  await publicCard.click();
  await expect(page.getByRole("heading", { name: crudChannelName })).toBeVisible();
  await expect(page.getByTitle("Player do canal " + crudChannelName)).toHaveAttribute(
    "allowfullscreen",
    "",
  );
  await expect(page.getByTitle("Player do canal " + crudChannelName)).not.toHaveAttribute("sandbox");
  await expect(page.getByTitle("Player do canal " + crudChannelName)).toHaveAttribute(
    "src",
    optionOneUrl,
  );
  const firstEmbedDocument = page.frameLocator("iframe.channel-player__frame");
  await expect(firstEmbedDocument.getByRole("button", { name: "Play" })).toBeVisible();
  await firstEmbedDocument.getByRole("button", { name: "Play" }).click();
  await expect(firstEmbedDocument.locator("#playback-state")).toHaveText(
    "Reproduzindo",
  );
  const secondPlayerOption = page.getByRole("button", { name: "Opção 2" });
  await page.getByRole("button", { name: "Opção 1" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(secondPlayerOption).toBeFocused();
  await expect(page.getByTitle("Player do canal " + crudChannelName)).toHaveAttribute(
    "src",
    optionTwoUrl,
  );
  await expect(page.getByTitle("Player do canal " + crudChannelName)).not.toHaveAttribute("sandbox");
  const secondEmbedDocument = page.frameLocator("iframe.channel-player__frame");
  await expect(secondEmbedDocument.locator("#playback-state")).toHaveText("Parado");
  await secondEmbedDocument.getByRole("button", { name: "Play" }).click();
  await expect(secondEmbedDocument.locator("#playback-state")).toHaveText(
    "Reproduzindo",
  );
  const multiOptionPlayer = page.getByTitle("Player do canal " + crudChannelName);
  const optionTwoButton = secondPlayerOption;
  const multiOptionFrameBeforeRefresh = await multiOptionPlayer.elementHandle();
  const optionTwoButtonBeforeRefresh = await optionTwoButton.elementHandle();
  const siteChannelUrlBeforeRefresh = page.url();
  const siteScrollBeforeRefresh = await page.evaluate(() => window.scrollY);
  await page.getByRole("button", { name: "Atualizar player" }).click();
  expect(
    await multiOptionFrameBeforeRefresh?.evaluate((frame) => frame.isConnected),
  ).toBe(false);
  expect(
    await optionTwoButtonBeforeRefresh?.evaluate((button) => button.isConnected),
  ).toBe(true);
  await expect(multiOptionPlayer).toHaveAttribute("src", optionTwoUrl);
  await expect(optionTwoButton).toHaveAttribute("aria-pressed", "true");
  await expect(multiOptionPlayer).not.toHaveAttribute("sandbox");
  await expect(
    page.frameLocator("iframe.channel-player__frame").locator("#playback-state"),
  ).toHaveText("Parado");
  expect(page.url()).toBe(siteChannelUrlBeforeRefresh);
  expect(await page.evaluate(() => window.scrollY)).toBe(siteScrollBeforeRefresh);
  await expect(page.getByTitle("Player do canal " + crudChannelName)).toHaveAttribute(
    "referrerpolicy",
    "no-referrer",
  );
  await expect(page.getByTitle("Player do canal " + crudChannelName)).not.toHaveAttribute("sandbox");
  await page.locator(".channel-player__options button").nth(2).click();
  const providerPlayer = page.getByTitle("Player do canal " + crudChannelName);
  await expect(providerPlayer).toHaveAttribute("src", optionThreeUrl);
  await expect(providerPlayer).not.toHaveAttribute("sandbox");
  await page.getByRole("button", { name: "Opção 4" }).click();
  const fourthProviderPlayer = page.getByTitle("Player do canal " + crudChannelName);
  await expect(fourthProviderPlayer).toHaveAttribute(
    "src",
    optionFourUrl,
  );
  await expect(fourthProviderPlayer).not.toHaveAttribute("sandbox");
  await expect(page.getByRole("link", { name: "Abrir no site oficial" })).toHaveAttribute(
    "href",
    "https://canalmix.test/oficial",
  );

  await page.goto("/canais/" + crudChannelSlug + "?from=tv");
  const tvOptionOne = page.getByRole("button", { name: "Opção 1" });
  const tvOptionTwo = page.getByRole("button", { name: "Opção 2" });
  await expect(tvOptionOne).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(tvOptionTwo).toBeFocused();
  const tvPlayer = page.getByTitle("Player do canal " + crudChannelName);
  await expect(tvPlayer).not.toHaveAttribute("sandbox");
  const tvMultiOptionFrame = await tvPlayer.elementHandle();
  const tvChannelUrlBeforeRefresh = page.url();
  const tvScrollBeforeRefresh = await page.evaluate(() => window.scrollY);
  const tvRefreshButton = page.getByRole("button", { name: "Atualizar player" });
  await page.keyboard.press("ArrowDown");
  await expect(tvRefreshButton).toBeFocused();
  await page.keyboard.press("Enter");
  expect(await tvMultiOptionFrame?.evaluate((frame) => frame.isConnected)).toBe(false);
  await expect(tvPlayer).toHaveAttribute("src", optionTwoUrl);
  await expect(tvPlayer).not.toHaveAttribute("sandbox");
  await expect(tvOptionTwo).toHaveAttribute("aria-pressed", "true");
  expect(page.url()).toBe(tvChannelUrlBeforeRefresh);
  expect(await page.evaluate(() => window.scrollY)).toBe(tvScrollBeforeRefresh);

  await page.goto("/admin/canais");
  await page.getByRole("button", { name: "Editar " + crudChannelName }).click();
  const editedName = crudChannelName + " Editado";
  await page.getByLabel("Nome do canal").fill(editedName);
  await page.getByLabel("Categoria", { exact: true }).selectOption("esporte");
  await page.getByLabel("URL do embed — Opção 4").fill(editedOptionFourUrl);
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText(editedName)).toBeVisible();

  await page.goto("/");
  await page.getByRole("searchbox", { name: "Buscar canal pelo nome" }).fill(
    editedName,
  );
  await expect(
    page.getByRole("link", { name: "Assistir " + editedName }),
  ).toBeVisible();
  await page.goto("/canais/" + crudChannelSlug);
  await page.getByRole("button", { name: "Opção 4" }).click();
  await expect(page.getByTitle("Player do canal " + editedName)).toHaveAttribute(
    "src",
    editedOptionFourUrl,
  );

  await page.goto("/");
  await page.getByRole("searchbox", { name: "Buscar canal pelo nome" }).fill("");
  await page.getByRole("button", { name: "Esporte" }).click();
  await expect(page.getByRole("heading", { name: "Esporte" })).toBeVisible();
  const categorySearch = page.getByRole("searchbox", {
    name: "Buscar canal pelo nome",
  });
  await expect(categorySearch).toHaveAttribute(
    "placeholder",
    "Buscar nesta categoria",
  );
  await categorySearch.fill(editedName);
  await expect(
    page.getByRole("link", { name: "Assistir " + editedName }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Categorias" }).click();
  await expect(page.getByRole("button", { name: "Esporte" })).toBeVisible();

  await page.goto("/admin/canais");
  await page.getByRole("button", { name: "Ocultar " + editedName }).click();
  await expect(
    page.getByRole("article").filter({ hasText: editedName }).locator(".status-pill"),
  ).toHaveText("Oculto");
  const hiddenAfterPublish = await page.goto("/canais/" + crudChannelSlug);
  expect(hiddenAfterPublish?.status()).toBe(404);
  await page.goto("/tv");
  await page.getByRole("searchbox", { name: "Buscar canal pelo nome" }).fill(
    editedName,
  );
  await expect(
    page.getByRole("link", { name: "Assistir " + editedName }),
  ).toHaveCount(0);

  await page.goto("/admin/canais");
  await page.getByRole("button", { name: "Republicar " + editedName }).click();
  await expect(
    page.getByRole("article").filter({ hasText: editedName }).locator(".status-pill"),
  ).toHaveText("Publicado");
  await page.goto("/tv");
  await page.getByRole("searchbox", { name: "Buscar canal pelo nome" }).fill(
    editedName,
  );
  await expect(
    page.getByRole("link", { name: "Assistir " + editedName }),
  ).toBeVisible();

  await page.goto("/tv");
  const sportCategory = page.getByRole("button", { name: "Esporte" });
  await sportCategory.click();
  const categoryCards = page.locator("[data-catalog-card]");
  const secondCard = page.locator("[data-slug='" + navigationChannel.slug + "']");
  await page.keyboard.press("Escape");
  await expect(sportCategory).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(categoryCards.first()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(categoryCards.nth(1)).toBeFocused();
  await secondCard.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp("/canais/" + navigationChannel.slug));
  const singleOptionPlayer = page.getByTitle(
    "Player do canal " + navigationChannel.name,
  );
  const singleOptionFrameBeforeRefresh = await singleOptionPlayer.elementHandle();
  const singleOptionUrlBeforeRefresh = page.url();
  const singleOptionRefreshButton = page.getByRole("button", {
    name: "Atualizar player",
  });
  await expect(singleOptionRefreshButton).toBeFocused();
  await expect(page.locator(".channel-player__options")).toHaveCount(0);
  await page.keyboard.press("Enter");
  expect(
    await singleOptionFrameBeforeRefresh?.evaluate((frame) => frame.isConnected),
  ).toBe(false);
  await expect(singleOptionPlayer).toHaveAttribute(
    "src",
    "https://v1.rdembed.lat/globomg",
  );
  expect(page.url()).toBe(singleOptionUrlBeforeRefresh);
  await expect(page.getByTitle("Player do canal " + navigationChannel.name)).not.toHaveAttribute("sandbox");
  await expect(
    page.getByTitle("Player do canal " + navigationChannel.name),
  ).toHaveAttribute("referrerpolicy", "no-referrer");
  await page.locator(".channel-page__back").click();
  await expect(page).toHaveURL(/\/tv\?categoria=esporte&foco=/);
  await expect(secondCard).toBeFocused();

  await page.goto("/admin/canais");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir " + editedName }).click();
  await expect(page.getByText(editedName)).toHaveCount(0);
  const deletedResponse = await page.goto("/canais/" + crudChannelSlug);
  expect(deletedResponse?.status()).toBe(404);
});
