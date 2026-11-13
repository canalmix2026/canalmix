import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
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
let youtubeChannel: TestChannel;
let premiereOptionTwoUrl = "";
let crudChannelName = "";
let crudChannelSlug = "";
let nativeMultiVideoChannel: TestChannel;
const channelIds: string[] = [];

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

test("mantém autoplay, opção 2 e atualização no computador, celular e Modo TV", async ({
  page,
  browser,
}) => {
  await page.route("https://la18hd.su/**", (route) => route.abort());
  await page.route("https://ww0.embedtv.cc/**", (route) => route.abort());
  await page.route("https://v1.rdembed.lat/**", (route) => route.abort());

  await page.goto("/canais/" + premiereChannel.slug + "?from=tv");
  const player = page.getByTitle("Player do canal " + premiereChannel.name);
  const optionOne = page.getByRole("button", { name: "Opção 1" });
  const optionTwo = page.getByRole("button", { name: "Opção 2" });
  const refreshButton = page.getByRole("button", { name: "Atualizar player" });
  const fullscreenButton = page.locator(".channel-player__fullscreen");
  const audioButton = page.locator(".channel-player__audio");
  const playerUrl = page.url();

  await expect(optionOne).toBeFocused();
  await expect(player).toHaveAttribute("allow", /autoplay/);
  await page.keyboard.press("ArrowRight");
  await expect(optionTwo).toBeFocused();
  await expect(optionTwo).toHaveAttribute("aria-pressed", "true");
  await expect(player).toHaveAttribute("src", premiereOptionTwoUrl);
  await expect(player).toHaveAttribute("allow", /autoplay/);
  await expect(audioButton).toBeDisabled();
  await expect(page.getByText("Use o controle de som do player")).toBeVisible();

  const frameBeforeFullscreen = await player.elementHandle();
  await page.keyboard.press("ArrowDown");
  await expect(refreshButton).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(fullscreenButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() =>
    page.evaluate(() => document.fullscreenElement?.tagName === "IFRAME"),
  ).toBe(true);
  await expect(fullscreenButton).toHaveText("Sair da tela cheia");
  expect(await frameBeforeFullscreen?.evaluate((frame) => frame.isConnected)).toBe(true);
  expect(page.url()).toBe(playerUrl);

  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() =>
    page.evaluate(() => document.fullscreenElement === null),
  ).toBe(true);
  await expect(fullscreenButton).toHaveText("Tela cheia");

  const frameBeforeRefresh = await player.elementHandle();
  await refreshButton.click();
  expect(await frameBeforeRefresh?.evaluate((frame) => frame.isConnected)).toBe(false);
  await expect(player).toHaveAttribute("src", premiereOptionTwoUrl);
  await expect(optionTwo).toHaveAttribute("aria-pressed", "true");
  expect(page.url()).toBe(playerUrl);

  await page.goto("/canais/" + premiereChannel.slug);
  const desktopPlayer = page.getByTitle("Player do canal " + premiereChannel.name);
  const desktopOptionTwo = page.getByRole("button", { name: "Opção 2" });
  const desktopRefresh = page.getByRole("button", { name: "Atualizar player" });
  const desktopUrl = page.url();
  await desktopOptionTwo.click();
  await expect(desktopPlayer).toHaveAttribute("src", premiereOptionTwoUrl);
  const desktopFrameBeforeRefresh = await desktopPlayer.elementHandle();
  await desktopRefresh.click();
  expect(
    await desktopFrameBeforeRefresh?.evaluate((frame) => frame.isConnected),
  ).toBe(false);
  await expect(desktopPlayer).toHaveAttribute("src", premiereOptionTwoUrl);
  await expect(desktopOptionTwo).toHaveAttribute("aria-pressed", "true");
  expect(page.url()).toBe(desktopUrl);

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  try {
    const mobilePage = await mobileContext.newPage();
    await mobilePage.route("https://la18hd.su/**", (route) => route.abort());
    await mobilePage.route("https://ww0.embedtv.cc/**", (route) => route.abort());
    await mobilePage.goto(
      new URL("/canais/" + premiereChannel.slug, page.url()).toString(),
    );
    const mobilePlayer = mobilePage.getByTitle(
      "Player do canal " + premiereChannel.name,
    );
    const mobileOptionTwo = mobilePage.getByRole("button", { name: "Opção 2" });
    const mobileRefresh = mobilePage.getByRole("button", {
      name: "Atualizar player",
    });
    const mobileUrl = mobilePage.url();
    await mobileOptionTwo.tap();
    await expect(mobilePlayer).toHaveAttribute("src", premiereOptionTwoUrl);
    const mobileFrameBeforeRefresh = await mobilePlayer.elementHandle();
    await mobileRefresh.tap();
    expect(
      await mobileFrameBeforeRefresh?.evaluate((frame) => frame.isConnected),
    ).toBe(false);
    await expect(mobilePlayer).toHaveAttribute("src", premiereOptionTwoUrl);
    await expect(mobileOptionTwo).toHaveAttribute("aria-pressed", "true");
    expect(mobilePage.url()).toBe(mobileUrl);
  } finally {
    await mobileContext.close();
  }

  await page.goto("/canais/" + navigationChannel.slug + "?from=tv");
  const singleOptionPlayer = page.getByTitle(
    "Player do canal " + navigationChannel.name,
  );
  const singleRefreshButton = page.getByRole("button", {
    name: "Atualizar player",
  });
  const singleFullscreenButton = page.locator(".channel-player__fullscreen");
  const singleFrame = await singleOptionPlayer.elementHandle();
  const singleUrl = page.url();

  await expect(singleRefreshButton).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(singleFullscreenButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() =>
    page.evaluate(() => document.fullscreenElement?.tagName === "IFRAME"),
  ).toBe(true);
  await expect(singleFullscreenButton).toHaveText("Sair da tela cheia");
  expect(await singleFrame?.evaluate((frame) => frame.isConnected)).toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() =>
    page.evaluate(() => document.fullscreenElement === null),
  ).toBe(true);
  await expect(singleFullscreenButton).toHaveText("Tela cheia");
  expect(await singleFrame?.evaluate((frame) => frame.isConnected)).toBe(true);
  expect(page.url()).toBe(singleUrl);
});

test("mantém o áudio e o foco no vídeo próprio, inclusive no Modo TV", async ({
  page,
}) => {
  await page.route("https://media.canalmix.test/**", (route) => route.abort());
  await page.goto("/canais/" + nativeVideoChannel.slug);

  const video = page.locator("video.channel-player__video");
  const soundButton = page.locator(".channel-player__audio");
  const originalVideo = await video.elementHandle();
  await expect(soundButton).toBeVisible();
  await expect(soundButton).toBeEnabled();
  const soundButtonPosition = await soundButton.boundingBox();
  await soundButton.click();
  await expect(soundButton).toHaveText("Ativar som");
  await expect(video).toHaveJSProperty("muted", true);
  await expect(soundButton).toBeFocused();
  const mutedButtonPosition = await soundButton.boundingBox();
  expect(mutedButtonPosition?.x).toBe(soundButtonPosition?.x);
  expect(mutedButtonPosition?.y).toBe(soundButtonPosition?.y);
  expect(mutedButtonPosition?.width).toBe(soundButtonPosition?.width);
  expect(await originalVideo?.evaluate((element) => element.isConnected)).toBe(true);

  await soundButton.click();
  await expect(soundButton).toHaveText("Silenciar");
  await expect(video).toHaveJSProperty("muted", false);
  await expect(soundButton).toBeFocused();

  await page.goto("/canais/" + nativeVideoChannel.slug + "?from=tv");
  const tvVideo = page.locator("video.channel-player__video");
  const tvSoundButton = page.locator(".channel-player__audio");
  const refreshButton = page.getByRole("button", { name: "Atualizar player" });
  const fullscreenButton = page.locator(".channel-player__fullscreen");
  const playerUrl = page.url();

  await expect(refreshButton).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(fullscreenButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() =>
    page.evaluate(() => document.fullscreenElement === document.querySelector("video.channel-player__video")),
  ).toBe(true);

  await page.keyboard.press("Escape");
  await expect.poll(() =>
    page.evaluate(() => document.fullscreenElement === null),
  ).toBe(true);
  await expect(fullscreenButton).toHaveText("Tela cheia");

  await page.keyboard.press("ArrowRight");
  await expect(tvSoundButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(tvSoundButton).toHaveText("Ativar som");
  await expect(tvVideo).toHaveJSProperty("muted", true);
  await expect(tvSoundButton).toBeFocused();

  await page.keyboard.press("ArrowLeft");
  await expect(fullscreenButton).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(refreshButton).toBeFocused();
  const videoBeforeRefresh = await tvVideo.elementHandle();
  await page.keyboard.press("Enter");
  expect(await videoBeforeRefresh?.evaluate((element) => element.isConnected)).toBe(false);
  await expect(tvVideo).toHaveJSProperty("muted", true);
  await expect(tvSoundButton).toHaveText("Ativar som");
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  expect(page.url()).toBe(playerUrl);

});

test("encerra o vídeo anterior e tenta autoplay na Opção 2 e ao atualizar", async ({
  page,
}) => {
  await page.route("https://media.canalmix.test/**", (route) => route.abort());
  await mockVideoAutoplay(page, false);
  await page.goto("/canais/" + nativeMultiVideoChannel.slug);

  const video = page.locator("video.channel-player__video");
  const optionTwo = page.getByRole("button", { name: "Opção 2" });
  const refresh = page.getByRole("button", { name: "Atualizar player" });
  const originalUrl = page.url();
  await expect(video).toHaveAttribute(
    "src",
    "https://media.canalmix.test/audio-option-one.mp4",
  );
  const firstVideo = await video.elementHandle();
  await video.evaluate((element) =>
    element.dispatchEvent(new Event("canplay", { bubbles: true })),
  );
  await expect.poll(() =>
    page.evaluate(() => {
      const testWindow = window as Window & {
        __mediaPlayAttempts?: Array<{ muted: boolean }>;
      };
      return testWindow.__mediaPlayAttempts?.length ?? 0;
    }),
  ).toBe(1);

  await optionTwo.click();
  expect(await firstVideo?.evaluate((element) => element.isConnected)).toBe(false);
  expect(
    await firstVideo?.evaluate((element) => (element as HTMLVideoElement).paused),
  ).toBe(true);
  await expect(video).toHaveAttribute(
    "src",
    "https://media.canalmix.test/audio-option-two.mp4",
  );
  const secondVideo = await video.elementHandle();
  await video.evaluate((element) =>
    element.dispatchEvent(new Event("canplay", { bubbles: true })),
  );
  await expect.poll(() =>
    page.evaluate(() => {
      const testWindow = window as Window & {
        __mediaPlayAttempts?: Array<{ muted: boolean }>;
      };
      return testWindow.__mediaPlayAttempts?.length ?? 0;
    }),
  ).toBe(2);

  await refresh.click();
  expect(await secondVideo?.evaluate((element) => element.isConnected)).toBe(false);
  expect(
    await secondVideo?.evaluate((element) => (element as HTMLVideoElement).paused),
  ).toBe(true);
  await expect(video).toHaveAttribute(
    "src",
    "https://media.canalmix.test/audio-option-two.mp4",
  );
  await expect(optionTwo).toHaveAttribute("aria-pressed", "true");
  await video.evaluate((element) =>
    element.dispatchEvent(new Event("canplay", { bubbles: true })),
  );
  await expect.poll(() =>
    page.evaluate(() => {
      const testWindow = window as Window & {
        __mediaPlayAttempts?: Array<{ muted: boolean }>;
      };
      return testWindow.__mediaPlayAttempts?.length ?? 0;
    }),
  ).toBe(3);
  expect(page.url()).toBe(originalUrl);
});

test("mantém tela cheia e tenta novamente após atualizar o mesmo vídeo", async ({
  page,
}) => {
  await page.route("https://media.canalmix.test/**", (route) => route.abort());
  await page.addInitScript(() => {
    type TestWindow = Window & { __fullscreenTarget?: Element | null };
    const testWindow = window as TestWindow;
    testWindow.__fullscreenTarget = null;

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => testWindow.__fullscreenTarget ?? null,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: () => {
        testWindow.__fullscreenTarget = null;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      },
    });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value(this: HTMLElement) {
        testWindow.__fullscreenTarget = this;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      },
    });
  });
  await mockVideoAutoplay(page, true);
  await page.goto("/canais/" + nativeVideoChannel.slug);

  const video = page.locator("video.channel-player__video");
  const fullscreen = page.locator(".channel-player__fullscreen");
  const refresh = page.getByRole("button", { name: "Atualizar player" });
  const pageUrl = page.url();
  await video.evaluate((element) =>
    element.dispatchEvent(new Event("canplay", { bubbles: true })),
  );
  await expect(video).toHaveJSProperty("muted", true);
  await expect(fullscreen).toHaveText("Tela cheia");
  await fullscreen.click();
  await expect(fullscreen).toHaveText("Sair da tela cheia");
  await expect.poll(() =>
    page.evaluate(() => document.fullscreenElement === document.querySelector("video")),
  ).toBe(true);

  const oldVideo = await video.elementHandle();
  await refresh.click();
  expect(await oldVideo?.evaluate((element) => element.isConnected)).toBe(false);
  await expect(video).toHaveJSProperty("muted", true);
  await expect(fullscreen).toHaveText("Sair da tela cheia");
  await expect.poll(() =>
    page.evaluate(() => document.fullscreenElement === document.querySelector("video")),
  ).toBe(true);
  await video.evaluate((element) =>
    element.dispatchEvent(new Event("canplay", { bubbles: true })),
  );
  await expect.poll(() =>
    page.evaluate(() => {
      const testWindow = window as Window & {
        __mediaPlayAttempts?: Array<{ muted: boolean }>;
      };
      return testWindow.__mediaPlayAttempts?.map((attempt) => attempt.muted) ?? [];
    }),
  ).toEqual([false, true, true]);
  expect(page.url()).toBe(pageUrl);
});

test("tenta autoplay nativo com som, fallback mudo no celular e atualização no Modo TV", async ({
  page,
  browser,
}) => {
  await page.route("https://media.canalmix.test/**", (route) => route.abort());
  await mockVideoAutoplay(page, false);
  await page.goto("/canais/" + nativeVideoChannel.slug);

  const desktopVideo = page.locator("video.channel-player__video");
  await expect(desktopVideo).toBeVisible();
  await desktopVideo.evaluate((video) =>
    video.dispatchEvent(new Event("canplay", { bubbles: true })),
  );
  await expect.poll(() =>
    page.evaluate(() => {
      const testWindow = window as Window & {
        __mediaPlayAttempts?: Array<{ muted: boolean }>;
      };
      return testWindow.__mediaPlayAttempts?.map((attempt) => attempt.muted) ?? [];
    }),
  ).toEqual([false]);
  await expect(page.locator(".channel-player__audio")).toHaveText("Silenciar");

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  try {
    const mobilePage = await mobileContext.newPage();
    await mobilePage.route("https://media.canalmix.test/**", (route) =>
      route.abort(),
    );
    await mockVideoAutoplay(mobilePage, true);
    await mobilePage.goto(
      new URL("/canais/" + nativeVideoChannel.slug, page.url()).toString(),
    );
    const mobileVideo = mobilePage.locator("video.channel-player__video");
    const mobileSound = mobilePage.locator(".channel-player__audio");
    await mobileVideo.evaluate((video) =>
      video.dispatchEvent(new Event("canplay", { bubbles: true })),
    );
    await expect.poll(() =>
      mobilePage.evaluate(() => {
        const testWindow = window as Window & {
          __mediaPlayAttempts?: Array<{ muted: boolean }>;
        };
        return testWindow.__mediaPlayAttempts?.map((attempt) => attempt.muted) ?? [];
      }),
    ).toEqual([false, true]);
    await expect(mobileVideo).toHaveJSProperty("muted", true);
    await expect(mobileSound).toHaveText("Ativar som");
    await mobileSound.tap();
    await expect(mobileVideo).toHaveJSProperty("muted", false);
    await expect(mobileSound).toHaveText("Silenciar");
  } finally {
    await mobileContext.close();
  }

  await mockVideoAutoplay(page, true);
  const tvUrl = new URL(
    "/canais/" + nativeVideoChannel.slug + "?from=tv",
    page.url(),
  ).toString();
  await page.goto(tvUrl);
  const tvVideo = page.locator("video.channel-player__video");
  const tvSound = page.locator(".channel-player__audio");
  const refresh = page.getByRole("button", { name: "Atualizar player" });
  await expect(refresh).toBeFocused();
  await tvVideo.evaluate((video) =>
    video.dispatchEvent(new Event("canplay", { bubbles: true })),
  );
  await expect.poll(() =>
    page.evaluate(() => {
      const testWindow = window as Window & {
        __mediaPlayAttempts?: Array<{ muted: boolean }>;
      };
      return testWindow.__mediaPlayAttempts?.map((attempt) => attempt.muted) ?? [];
    }),
  ).toEqual([false, true]);
  await expect(tvSound).toHaveText("Ativar som");

  const firstTvVideo = await tvVideo.elementHandle();
  await page.keyboard.press("Enter");
  expect(await firstTvVideo?.evaluate((video) => video.isConnected)).toBe(false);
  const refreshedTvVideo = page.locator("video.channel-player__video");
  await expect(refreshedTvVideo).toHaveJSProperty("muted", true);
  await refreshedTvVideo.evaluate((video) =>
    video.dispatchEvent(new Event("canplay", { bubbles: true })),
  );
  await expect.poll(() =>
    page.evaluate(() => {
      const testWindow = window as Window & {
        __mediaPlayAttempts?: Array<{ muted: boolean }>;
      };
      return testWindow.__mediaPlayAttempts?.map((attempt) => attempt.muted) ?? [];
    }),
  ).toEqual([false, true, true]);
  await expect(tvSound).toHaveText("Ativar som");
  expect(page.url()).toBe(tvUrl);

  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".channel-player__fullscreen")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(tvSound).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(tvSound).toHaveText("Silenciar");
  await expect(refreshedTvVideo).toHaveJSProperty("muted", false);
});

test("inicia YouTube pela API, tenta mudo se o autoplay com som for bloqueado", async ({
  page,
}) => {
  await page.addInitScript(() => {
    type MockPlayer = {
      muted: boolean;
      playing: boolean;
      playAttempts: number;
      mute(): void;
      unMute(): void;
      isMuted(): boolean;
      playVideo(): void;
      pauseVideo(): void;
      getPlayerState(): number;
      destroy(): void;
    };
    type MockWindow = Window & {
      __youtubePlayers?: MockPlayer[];
      YT?: {
        Player: new (
          iframe: HTMLIFrameElement,
          options: {
            events: {
              onReady(event: { target: MockPlayer }): void;
              onAutoplayBlocked(event: { target: MockPlayer }): void;
            };
          },
        ) => MockPlayer;
      };
    };

    class MockYouTubePlayer {
      muted = false;
      playing = false;
      playAttempts = 0;
      autoplayBlockReported = false;
      events: {
        onAutoplayBlocked(event: { target: MockYouTubePlayer }): void;
      };

      constructor(
        _iframe: HTMLIFrameElement,
        options: {
          events: {
            onReady(event: { target: MockYouTubePlayer }): void;
            onAutoplayBlocked(event: { target: MockYouTubePlayer }): void;
          };
        },
      ) {
        this.events = options.events;
        const testWindow = window as MockWindow;
        testWindow.__youtubePlayers?.push(this);
        window.setTimeout(() => options.events.onReady({ target: this }), 0);
      }

      mute() {
        this.muted = true;
      }

      unMute() {
        this.muted = false;
      }

      isMuted() {
        return this.muted;
      }

      playVideo() {
        this.playAttempts += 1;
        if (!this.muted && !this.autoplayBlockReported) {
          this.autoplayBlockReported = true;
          this.events.onAutoplayBlocked({ target: this });
          return;
        }
        this.playing = true;
      }

      pauseVideo() {
        this.playing = false;
      }

      getPlayerState() {
        return this.playing ? 1 : 2;
      }

      destroy() {
        this.playing = false;
      }
    }

    const testWindow = window as MockWindow;
    testWindow.__youtubePlayers = [];
    testWindow.YT = { Player: MockYouTubePlayer };
  });
  await page.route("https://www.youtube.com/**", (route) => route.abort());
  await page.goto("/canais/" + youtubeChannel.slug);

  const frame = page.locator("iframe.channel-player__frame");
  const soundButton = page.locator(".channel-player__audio");
  const refreshButton = page.getByRole("button", { name: "Atualizar player" });
  await expect(frame).toHaveAttribute("src", /enablejsapi=1/);
  await expect(frame).toHaveAttribute("allow", /autoplay/);
  await expect(soundButton).toBeEnabled();
  await expect.poll(() =>
    page.evaluate(() => {
      const testWindow = window as Window & {
        __youtubePlayers?: Array<{ muted: boolean }>;
      };
      return testWindow.__youtubePlayers?.length ?? 0;
    }),
  ).toBe(1);
  await expect(soundButton).toHaveText("Ativar som");
  await expect.poll(() =>
    page.evaluate(() => {
      const testWindow = window as Window & {
        __youtubePlayers?: Array<{ playing: boolean; playAttempts: number }>;
      };
      const player = testWindow.__youtubePlayers?.[0];
      return player ? [player.playing, player.playAttempts] : [false, 0];
    }),
  ).toEqual([true, 2]);

  const firstFrame = await frame.elementHandle();
  await soundButton.click();
  await expect(soundButton).toHaveText("Silenciar");
  await expect(soundButton).toBeFocused();
  await expect.poll(() =>
    page.evaluate(() => {
      const testWindow = window as Window & {
        __youtubePlayers?: Array<{ muted: boolean }>;
      };
      const players = testWindow.__youtubePlayers ?? [];
      return players[players.length - 1]?.muted ?? false;
    }),
  ).toBe(false);
  expect(await firstFrame?.evaluate((element) => element.isConnected)).toBe(true);

  await page.evaluate(() => {
    const testWindow = window as Window & {
      __youtubePlayers?: Array<{ muted: boolean }>;
    };
    const players = testWindow.__youtubePlayers ?? [];
    const currentPlayer = players[players.length - 1];
    if (currentPlayer) {
      currentPlayer.muted = true;
    }
  });
  await expect(soundButton).toHaveText("Ativar som");

  const frameBeforeRefresh = await frame.elementHandle();
  await refreshButton.click();
  expect(await frameBeforeRefresh?.evaluate((element) => element.isConnected)).toBe(false);
  await expect(frame).toHaveAttribute("src", /enablejsapi=1/);
  await expect(soundButton).toHaveText("Ativar som");
  await expect.poll(() =>
    page.evaluate(() => {
      const testWindow = window as Window & {
        __youtubePlayers?: Array<{ muted: boolean }>;
      };
      return testWindow.__youtubePlayers?.length ?? 0;
    }),
  ).toBe(2);
  await expect.poll(() =>
    page.evaluate(() => {
      const testWindow = window as Window & {
        __youtubePlayers?: Array<{ muted: boolean }>;
      };
      const players = testWindow.__youtubePlayers ?? [];
      return players[players.length - 1]?.muted ?? false;
    }),
  ).toBe(true);
});

test("avisa quando a API de tela cheia não está disponível", async ({ page }) => {
  await page.route("https://v1.rdembed.lat/**", (route) => route.abort());
  await page.addInitScript(() => {
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto("/canais/" + navigationChannel.slug);
  await page.getByRole("button", { name: "Tela cheia" }).click();
  await expect(page.locator(".channel-player__fullscreen-error")).toHaveText(
    "A tela cheia não está disponível neste navegador.",
  );
});

test("cadastra, publica, edita, oculta, republica e exclui um canal", async ({
  page,
}) => {
  await signIn(page, adminUser);
  await page.route("https://rdcanais.org/**", (route) => route.abort());
  await page.route("https://v1.rdembed.lat/**", (route) => route.abort());
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
  await page.getByRole("button", { name: "Testar player da opção 4" }).click();
  await expect(page.getByRole("dialog", { name: "Prévia" })).toBeVisible();
  await expect(
    page.getByTitle("Prévia do player do canal novo"),
  ).toHaveAttribute("src", optionFourUrl);
  expect(
    await page
      .getByTitle("Prévia do player do canal novo")
      .getAttribute("sandbox"),
  ).toBeNull();
  await page.getByRole("button", { name: "Fechar prévia" }).click();
  await page.locator('button[aria-label^="Testar player da opção "]').nth(1).click();
  const rdEmbedPreview = page.getByRole("dialog").locator("iframe");
  await expect(rdEmbedPreview).toHaveAttribute(
    "referrerpolicy",
    "no-referrer",
  );
  await page.getByRole("button", { name: "Fechar prévia" }).click();
  await page.locator('button[aria-label^="Testar player da opção "]').nth(2).click();
  const providerPreview = page.getByRole("dialog").locator("iframe");
  await expect(providerPreview).toHaveAttribute("src", optionThreeUrl);
  expect(await providerPreview.getAttribute("sandbox")).toBeNull();
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
  expect(
    await page
      .getByTitle("Player do canal " + crudChannelName)
      .getAttribute("sandbox"),
  ).toBeNull();
  await expect(page.getByTitle("Player do canal " + crudChannelName)).toHaveAttribute(
    "src",
    optionOneUrl,
  );
  const secondPlayerOption = page.getByRole("button", { name: "Opção 2" });
  await page.getByRole("button", { name: "Opção 1" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(secondPlayerOption).toBeFocused();
  await expect(page.getByTitle("Player do canal " + crudChannelName)).toHaveAttribute(
    "src",
    optionTwoUrl,
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
  expect(page.url()).toBe(siteChannelUrlBeforeRefresh);
  expect(await page.evaluate(() => window.scrollY)).toBe(siteScrollBeforeRefresh);
  await expect(page.getByTitle("Player do canal " + crudChannelName)).toHaveAttribute(
    "referrerpolicy",
    "no-referrer",
  );
  expect(
    await page
      .getByTitle("Player do canal " + crudChannelName)
      .getAttribute("sandbox"),
  ).toBeNull();
  await page.locator(".channel-player__options button").nth(2).click();
  const providerPlayer = page.getByTitle("Player do canal " + crudChannelName);
  await expect(providerPlayer).toHaveAttribute("src", optionThreeUrl);
  expect(await providerPlayer.getAttribute("sandbox")).toBeNull();
  await page.getByRole("button", { name: "Opção 4" }).click();
  await expect(page.getByTitle("Player do canal " + crudChannelName)).toHaveAttribute(
    "src",
    optionFourUrl,
  );
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
  const tvMultiOptionFrame = await page
    .getByTitle("Player do canal " + crudChannelName)
    .elementHandle();
  const tvChannelUrlBeforeRefresh = page.url();
  const tvScrollBeforeRefresh = await page.evaluate(() => window.scrollY);
  const tvRefreshButton = page.getByRole("button", { name: "Atualizar player" });
  await page.keyboard.press("ArrowDown");
  await expect(tvRefreshButton).toBeFocused();
  await page.keyboard.press("Enter");
  expect(await tvMultiOptionFrame?.evaluate((frame) => frame.isConnected)).toBe(false);
  await expect(
    page.getByTitle("Player do canal " + crudChannelName),
  ).toHaveAttribute("src", optionTwoUrl);
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
  expect(
    await page
      .getByTitle("Player do canal " + navigationChannel.name)
      .getAttribute("sandbox"),
  ).toBeNull();
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
