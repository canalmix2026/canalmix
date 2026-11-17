import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page, type Route } from "@playwright/test";
import localSupabase from "../../scripts/local-supabase.cjs";
import type { Database } from "../../src/lib/supabase/database.types";

const { readLocalSupabaseStatus } = localSupabase;
type TestUser = { id: string; email: string; password: string };
type ExistingChannel = {
  id: string;
  slug: string;
  category_id: number;
  embed_urls: string[];
  embed_source_active: boolean[];
  is_published: boolean;
  published_at: string | null;
};

let adminClient: SupabaseClient<Database>;
let adminUser: TestUser;
let channel: ExistingChannel;
let secondaryChannel: ExistingChannel;
let channelCreated = false;
let secondaryChannelCreated = false;
let secondaryChannelName = "";
let originalChannel: ExistingChannel | null = null;
let originalCategoryActive: boolean | null = null;
let gameId = "";
const fixtureGameIds: string[] = [];
const fixtureTeamNames: string[] = [];
let homeTeam = "";
let awayTeam = "";

const embedDocument = "<!doctype html><html><body><p>Canal de teste local</p></body></html>";

async function fulfillEmbed(route: Route) {
  await route.fulfill({ status: 200, contentType: "text/html", body: embedDocument });
}

async function fulfillCrest(route: Route) {
  if (route.request().url().includes("/missing.svg")) {
    await route.abort("failed");
    return;
  }
  await route.fulfill({
    status: 200,
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><path fill="#43e7ce" d="M30 2 55 12v18c0 15-10 24-25 28C15 54 5 45 5 30V12z"/></svg>',
  });
}

async function createPublishedFixtureGame(
  home: string,
  away: string,
  time: string,
  broadcasts: Array<{
    country_code: string;
    country_name: string;
    broadcaster_name: string;
    channel_id: string | null;
    sort_order: number;
    is_primary: boolean;
  }> = [],
) {
  const { data, error } = await adminClient
    .from("games")
    .insert({
      home_team: home,
      away_team: away,
      competition_name: "Liga de teste local",
      competition_country_code: "BR",
      competition_country_name: "Brasil",
      starts_at: new Date(tomorrowInBrasilia() + "T" + time + ":00-03:00").toISOString(),
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error("Não foi possível preparar um jogo local de teste.");
  }
  fixtureGameIds.push(data.id);
  if (broadcasts.length) {
    const { error: broadcastError } = await adminClient
      .from("game_broadcasts")
      .insert(broadcasts.map((broadcast) => ({ ...broadcast, game_id: data.id })));
    if (broadcastError) throw new Error("Não foi possível preparar as emissoras do teste local.");
  }
  return data.id;
}

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(adminUser.email);
  await page.getByLabel("Senha").fill(adminUser.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await page.waitForURL("**/admin/canais");
}

async function saveShield(page: Page, teamName: string, shieldUrl: string) {
  await page.getByLabel("Buscar time por nome ou país").fill(teamName);
  const row = page.locator(".admin-team-row").filter({ hasText: teamName });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Editar " + teamName }).click();
  await page.getByLabel("País do time").fill("Brasil");
  await page.getByLabel("Escudo").fill(shieldUrl);
  await page.getByRole("button", { name: "Salvar time" }).click();
  await expect(page.getByRole("status")).toHaveText("Time atualizado.");
}

function tomorrowInBrasilia() {
  const current = new Map(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  const tomorrow = new Date(Date.UTC(
    Number(current.get("year")),
    Number(current.get("month")) - 1,
    Number(current.get("day")) + 1,
  ));
  return `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, "0")}-${String(tomorrow.getUTCDate()).padStart(2, "0")}`;
}

test.beforeAll(async () => {
  const status = readLocalSupabaseStatus();
  if (!status.serviceRoleKey || !status.publishableKey) {
    throw new Error("Inicie o Supabase local antes dos testes da grade.");
  }
  adminClient = createClient<Database>(status.url, status.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const suffix = crypto.randomUUID().slice(0, 8);
  adminUser = {
    id: "",
    email: `canalmix-grade-admin-${suffix}@local.test`,
    password: `CanalMix-Grade-${crypto.randomUUID().slice(0, 10)}`,
  };
  const { data: userResult, error: userError } = await adminClient.auth.admin.createUser({
    email: adminUser.email,
    password: adminUser.password,
    email_confirm: true,
  });
  if (userError || !userResult.user) {
    throw new Error("NÃ£o foi possÃ­vel criar o administrador temporÃ¡rio da grade.");
  }
  adminUser.id = userResult.user.id;
  const { error: membershipError } = await adminClient
    .from("catalog_admins")
    .insert({ user_id: adminUser.id });
  if (membershipError) {
    throw new Error("NÃ£o foi possÃ­vel autorizar o administrador temporÃ¡rio da grade.");
  }

  const { data: existingChannel, error: existingChannelError } = await adminClient
    .from("channels")
    .select("id, slug, category_id, embed_urls, embed_source_active, is_published, published_at")
    .eq("name", "SporTV 3")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingChannelError) {
    throw new Error("NÃ£o foi possÃ­vel consultar o canal SporTV 3 no Supabase local.");
  }

  if (existingChannel) {
    originalChannel = existingChannel;
    channel = existingChannel;
    const { data: category, error: categoryError } = await adminClient
      .from("categories")
      .select("is_active")
      .eq("id", existingChannel.category_id)
      .single();
    if (categoryError || !category) {
      throw new Error("NÃ£o foi possÃ­vel consultar a categoria do canal de teste.");
    }
    originalCategoryActive = category.is_active;
    if (!category.is_active) {
      const { error } = await adminClient
        .from("categories")
        .update({ is_active: true })
        .eq("id", existingChannel.category_id);
      if (error) throw new Error("NÃ£o foi possÃ­vel ativar temporariamente a categoria local.");
    }
    const { error: prepareError } = await adminClient
      .from("channels")
      .update({
        is_published: true,
        published_at: existingChannel.published_at ?? new Date().toISOString(),
        embed_source_active: existingChannel.embed_urls.map(() => true),
      })
      .eq("id", existingChannel.id);
    if (prepareError) throw new Error("NÃ£o foi possÃ­vel preparar o canal local para o teste.");
  } else {
    const { data: category, error: categoryError } = await adminClient
      .from("categories")
      .select("id")
      .eq("slug", "esporte")
      .single();
    if (categoryError || !category) {
      throw new Error("A migraÃ§Ã£o local nÃ£o carregou a categoria de esporte.");
    }
    const { data: createdChannel, error: createChannelError } = await adminClient
      .from("channels")
      .insert({
        slug: `canalmix-grade-sportv-3-${suffix}`,
        name: "SporTV 3",
        category_id: category.id,
        embed_urls: ["https://player.canalmix.test/embed/grade-sportv-3"],
        is_published: true,
        published_at: new Date().toISOString(),
        created_by: adminUser.id,
      })
      .select("id, slug, category_id, embed_urls, embed_source_active, is_published, published_at")
      .single();
    if (createChannelError || !createdChannel) {
      throw new Error("NÃ£o foi possÃ­vel criar o canal SporTV 3 temporÃ¡rio.");
    }
    channel = createdChannel;
    channelCreated = true;
  }

  secondaryChannelName = "SporTV alternativo " + suffix;
  const { data: createdSecondaryChannel, error: secondaryError } = await adminClient
    .from("channels")
    .insert({
      slug: "canalmix-grade-secondary-" + suffix,
      name: secondaryChannelName,
      category_id: channel.category_id,
      embed_urls: ["https://player.canalmix.test/embed/grade-secondary"],
      is_published: true,
      published_at: new Date().toISOString(),
      created_by: adminUser.id,
    })
    .select("id, slug, category_id, embed_urls, embed_source_active, is_published, published_at")
    .single();
  if (secondaryError || !createdSecondaryChannel) {
    throw new Error("Não foi possível criar o segundo canal local de teste.");
  }
  secondaryChannel = createdSecondaryChannel;
  secondaryChannelCreated = true;
});

test.afterAll(async () => {
  if (!adminClient) return;
  const allGameIds = [...fixtureGameIds, ...(gameId ? [gameId] : [])];
  if (allGameIds.length) {
    await adminClient.from("games").delete().in("id", allGameIds);
  } else if (homeTeam) {
    await adminClient.from("games").delete().eq("home_team", homeTeam);
  }
  if (fixtureTeamNames.length) {
    await adminClient.from("teams").delete().in("name", fixtureTeamNames);
  }
  const addedGameTeams = [homeTeam, awayTeam].filter(Boolean);
  if (addedGameTeams.length) {
    await adminClient.from("teams").delete().in("name", addedGameTeams);
  }
  if (secondaryChannelCreated && secondaryChannel?.id) {
    await adminClient.from("channels").delete().eq("id", secondaryChannel.id);
  }

  if (channelCreated && channel?.id) {
    await adminClient.from("channels").delete().eq("id", channel.id);
  } else if (originalChannel?.id) {
    await adminClient
      .from("channels")
      .update({
        is_published: originalChannel.is_published,
        published_at: originalChannel.published_at,
        embed_source_active: originalChannel.embed_source_active,
      })
      .eq("id", originalChannel.id);
    if (originalCategoryActive !== null) {
      await adminClient
        .from("categories")
        .update({ is_active: originalCategoryActive })
        .eq("id", originalChannel.category_id);
    }
  }
  if (adminUser?.id) await adminClient.auth.admin.deleteUser(adminUser.id);
});

test("administra a grade, publica o vÃ­nculo exato e restaura o foco no modo TV", async ({ page }) => {
  await page.route("https://player.canalmix.test/**", fulfillEmbed);
  await page.route("https://crests.canalmix.test/**", fulfillCrest);
  await signIn(page);

  const menu = page.locator(".admin-sidebar__link");
  const menuLabels = await menu.evaluateAll((links) =>
    links.map((link) => link.querySelector("span:not(.admin-sidebar__count)")?.textContent?.trim()),
  );
  expect(menuLabels).toEqual(["Canais", "Categorias", "Grade de jogos", "Times e escudos", "Doações Pix", "Problemas Reportados"]);
  await expect(menu.nth(0)).toHaveAttribute("aria-current", "page");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".admin-sidebar__nav")).toBeHidden();
  await page.getByRole("button", { name: "Expandir menu administrativo" }).click();
  await page.getByRole("link", { name: "Categorias" }).click();
  await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible();
  await expect(page.locator('.admin-sidebar__link[href="/admin/categorias"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".admin-sidebar__nav")).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 960 });

  await page.getByRole("link", { name: "Grade de jogos" }).click();
  await expect(page.getByRole("heading", { name: "Grade de jogos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Grade de jogos" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Adicionar jogo" }).click();
  const dialog = page.getByRole("dialog", { name: "Adicionar jogo" });
  homeTeam = "TESTE Mandante " + crypto.randomUUID().slice(0, 6);
  awayTeam = "TESTE Visitante " + crypto.randomUUID().slice(0, 6);
  await dialog.getByLabel("Mandante").fill(homeTeam);
  await dialog.getByLabel("Visitante").fill(awayTeam);
  await dialog.getByRole("textbox", { name: "Competição", exact: true }).fill("Liga de teste local");
  const gameFields = dialog.locator(".game-form__grid label");
  await gameFields.nth(3).locator("select").selectOption("BR");
  await gameFields.nth(4).locator('input[type="date"]').fill(tomorrowInBrasilia());
  await gameFields.nth(5).locator('input[type="time"]').fill("20:30");

  await dialog.getByLabel("Emissora anunciada 1").fill("SporTV 3");
  const firstChannelSelect = dialog.locator(".game-form__broadcast-row").nth(0).locator(".game-channel-select__trigger");
  await firstChannelSelect.click();
  await dialog.getByRole("option", { name: `SporTV 3 (${channel.slug})` }).click();

  await dialog.getByRole("button", { name: "Adicionar emissora" }).click();
  await dialog.getByLabel("Emissora anunciada 2").fill(secondaryChannelName);
  const secondChannelSelect = dialog.locator(".game-form__broadcast-row").nth(1).locator(".game-channel-select__trigger");
  await secondChannelSelect.click();
  await dialog.getByRole("option", { name: `${secondaryChannelName} (${secondaryChannel.slug})` }).click();
  await dialog.getByLabel("Canal principal 2").check();

  await dialog.getByRole("button", { name: "Adicionar emissora" }).click();
  await dialog.getByLabel("Emissora anunciada 3").fill("ge tv");
  await dialog.getByRole("button", { name: "Adicionar emissora" }).click();
  await dialog.locator(".game-form__broadcast-row").nth(3).locator(".game-form__country-field select").selectOption("FR");
  await dialog.getByLabel("Emissora anunciada 4").fill("TF1");
  await dialog.getByRole("button", { name: "Salvar jogo" }).click();
  await expect(dialog).toHaveCount(0);

  const { data: savedGame, error: savedGameError } = await adminClient
    .from("games")
    .select("id, starts_at")
    .eq("home_team", homeTeam)
    .single();
  expect(savedGameError).toBeNull();
  expect(savedGame).not.toBeNull();
  if (!savedGame) throw new Error("O jogo de teste nÃ£o foi gravado no Supabase local.");
  gameId = savedGame.id;
  expect(new Date(savedGame.starts_at).toISOString()).toBe(new Date(`${tomorrowInBrasilia()}T23:30:00.000Z`).toISOString());

  const adminGame = page.locator(".admin-game-row").filter({ hasText: homeTeam });
  const { data: broadcastsBeforeUpdate, error: broadcastsBeforeError } = await adminClient
    .from("game_broadcasts")
    .select("id, country_code, broadcaster_name, channel_id, sort_order, is_primary")
    .eq("game_id", gameId)
    .order("sort_order", { ascending: true });
  expect(broadcastsBeforeError).toBeNull();
  await adminGame.getByRole("button", { name: "Editar " + homeTeam + " x " + awayTeam }).click();
  const editDialog = page.getByRole("dialog", { name: "Editar jogo" });
  await editDialog.getByRole("button", { name: "Salvar jogo" }).click();
  await expect(editDialog).toHaveCount(0);
  const { data: broadcastsAfterUpdate, error: broadcastsAfterError } = await adminClient
    .from("game_broadcasts")
    .select("id, country_code, broadcaster_name, channel_id, sort_order, is_primary")
    .eq("game_id", gameId)
    .order("sort_order", { ascending: true });
  expect(broadcastsAfterError).toBeNull();
  expect(broadcastsAfterUpdate).toEqual(broadcastsBeforeUpdate);
  await expect(adminGame).toContainText("Oculto");
  await adminGame.getByRole("button", { name: `Publicar ${homeTeam} x ${awayTeam}` }).click();
  await expect(adminGame).toContainText("Publicado");

  const singleHome = "TESTE Jogo SporTV " + crypto.randomUUID().slice(0, 6);
  const singleAway = "TESTE Visitante SporTV " + crypto.randomUUID().slice(0, 6);
  const unlinkedHome = "TESTE Jogo sem vínculo " + crypto.randomUUID().slice(0, 6);
  const unlinkedAway = "TESTE Visitante sem vínculo " + crypto.randomUUID().slice(0, 6);
  const unknownHome = "TESTE Jogo sem confirmação " + crypto.randomUUID().slice(0, 6);
  const unknownAway = "TESTE Visitante sem confirmação " + crypto.randomUUID().slice(0, 6);
  await createPublishedFixtureGame(singleHome, singleAway, "18:00", [{
    country_code: "BR",
    country_name: "Brasil",
    broadcaster_name: "SporTV 3",
    channel_id: channel.id,
    sort_order: 0,
    is_primary: true,
  }]);
  const unlinkedGameId = await createPublishedFixtureGame(unlinkedHome, unlinkedAway, "19:00", [{
    country_code: "BR",
    country_name: "Brasil",
    broadcaster_name: "Premiere",
    channel_id: null,
    sort_order: 0,
    is_primary: false,
  }]);
  fixtureTeamNames.push(unlinkedHome);
  await createPublishedFixtureGame(unknownHome, unknownAway, "21:30");

  await page.getByRole("link", { name: "Times e escudos" }).click();
  await saveShield(page, homeTeam, "https://crests.canalmix.test/home.svg");
  await saveShield(page, awayTeam, "https://crests.canalmix.test/away.svg");
  await page.getByRole("button", { name: "Adicionar time" }).click();
  await page.getByLabel("Nome do time").fill(unlinkedHome);
  await page.getByLabel("País do time").fill("Brasil");
  await page.getByLabel("Escudo").fill("https://crests.canalmix.test/missing.svg");  await page.getByRole("button", { name: "Salvar time" }).click();
  await expect(page.getByRole("status")).toHaveText("Time cadastrado.");
  const { data: failedCrestTeam, error: failedCrestError } = await adminClient
    .from("teams")
    .select("id")
    .eq("name", unlinkedHome)
    .single();
  expect(failedCrestError).toBeNull();
  if (!failedCrestTeam) throw new Error("Não foi possível consultar o time com escudo quebrado.");
  await adminClient.from("games").update({ home_team_id: failedCrestTeam.id }).eq("id", unlinkedGameId);

  await page.goto("/grade");
  const gameRow = page.locator(".public-game-row").filter({ hasText: homeTeam });
  await expect(gameRow).toContainText("Liga de teste local");
  await expect(gameRow).toContainText("20:30");
  await expect(gameRow.locator(".public-game-row__watch")).toHaveCount(1);
  await expect(gameRow.getByRole("link", { name: "Assistir no " + secondaryChannelName })).toHaveAttribute("href", new RegExp("/canais/" + secondaryChannel.slug));
  await expect(gameRow).not.toContainText("SporTV 3");
  await expect(gameRow).not.toContainText("ge tv");
  await expect(gameRow).not.toContainText("TF1");
  await expect(gameRow).not.toContainText("Brasil");
  await expect(gameRow.locator(".team-crest img")).toHaveCount(2);
  await expect(gameRow.locator(".team-crest--fallback")).toHaveCount(0);

  const singleChannelRow = page.locator(".public-game-row").filter({ hasText: singleHome });
  await expect(singleChannelRow.locator(".public-game-row__watch")).toHaveCount(1);
  const sportvLink = singleChannelRow.getByRole("link", { name: "Assistir no SporTV 3" });
  await expect(sportvLink).toHaveAttribute("href", new RegExp("/canais/" + channel.slug));

  const unlinkedRow = page.locator(".public-game-row").filter({ hasText: unlinkedHome });
  await expect(unlinkedRow.getByText("Premiere — canal a confirmar", { exact: true })).toBeVisible();
  await expect(unlinkedRow.locator(".public-game-row__watch")).toHaveCount(0);
  await expect(unlinkedRow.locator(".team-crest--fallback")).toHaveCount(2);

  const unknownRow = page.locator(".public-game-row").filter({ hasText: unknownHome });
  await expect(unknownRow.getByText("Transmissão a confirmar", { exact: true })).toBeVisible();
  await expect(unknownRow.locator(".public-game-row__watch")).toHaveCount(0);
  const buttonsPerGame = await page.locator(".public-game-row").evaluateAll((rows) =>
    rows.map((row) => row.querySelectorAll(".public-game-row__watch").length),
  );
  expect(buttonsPerGame.every((count) => count <= 1)).toBe(true);
  const orderedTimes = await page.locator(".public-game-row time").evaluateAll((times) =>
    times.map((time) => Date.parse(time.getAttribute("datetime") ?? "")),
  );
  expect(orderedTimes).toEqual([...orderedTimes].sort((left, right) => left - right));

  await sportvLink.click();
  await expect(page).toHaveURL(new RegExp(`/canais/${channel.slug}`));
  await expect(page.getByRole("heading", { name: "SporTV 3" })).toBeVisible();
  await page.locator(".channel-page__back").click();
  await expect(page).toHaveURL(/\/grade$/);

  await page.goto("/");
  await page.evaluate(({ channelId }) => {
    window.localStorage.setItem("canalmix.channel-library.v1", JSON.stringify({
      favorites: [channelId],
      history: [channelId],
    }));
  }, { channelId: channel.id });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Meus canais" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assistidos recentemente" })).toHaveCount(0);
  await expect(page.locator(".channel-library-section + .public-game-schedule")).toHaveCount(1);
  const localLibrary = await page.evaluate(() => JSON.parse(window.localStorage.getItem("canalmix.channel-library.v1") ?? "{}"));
  expect(localLibrary.history).toEqual([channel.id]);

  await page.goto("/grade?from=tv");
  const tvSingleRow = page.locator(".public-game-row").filter({ hasText: singleHome });
  const tvSingleLink = tvSingleRow.locator(".public-game-row__watch");
  const tvMainLink = page.locator(".public-game-row").filter({ hasText: homeTeam }).locator(".public-game-row__watch");
  await expect(tvSingleLink).toHaveCount(1);
  await expect(tvMainLink).toHaveCount(1);
  await tvSingleLink.focus();
  const originalTvHref = await tvSingleLink.getAttribute("href");
  await page.keyboard.press("ArrowDown");
  const focusedTvLink = page.locator(".public-game-row__watch:focus");
  await expect(focusedTvLink).toHaveCount(1);
  const selectedTvText = await focusedTvLink.innerText();
  const selectedTvHref = await focusedTvLink.getAttribute("href");
  expect(selectedTvHref).not.toBe(originalTvHref);
  await expect(focusedTvLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/canais\/.+\?from=tv/);
  await page.locator(".channel-page__back").click();
  await expect(page).toHaveURL(/\/grade\?from=tv$/);
  await expect(page.locator(".public-game-row__watch:focus")).toHaveText(selectedTvText);
  expect(await page.locator(".public-game-row__watch:focus").getAttribute("href")).toBe(selectedTvHref);

  await page.goto("/admin/canais");
  const adminChannel = page.locator(`[data-channel-id="${channel.id}"]`);
  await expect(adminChannel).toBeVisible();
  await adminChannel.getByRole("button", { name: "Ocultar SporTV 3" }).click();
  await expect(adminChannel).toContainText("Oculto");
  await page.goto("/admin/canais");
  const secondaryAdminChannel = page.locator('[data-channel-id="' + secondaryChannel.id + '"]');
  await expect(secondaryAdminChannel).toBeVisible();
  await page.goto("/grade");
  const mainPublicRow = page.locator(".public-game-row").filter({ hasText: homeTeam });
  await expect(mainPublicRow.getByRole("link", { name: "Assistir no " + secondaryChannelName })).toBeVisible();
  await page.goto("/admin/canais");
  await secondaryAdminChannel.getByRole("button", { name: "Ocultar " + secondaryChannelName }).click();
  await page.goto("/grade");
  const hiddenChannelGame = page.locator(".public-game-row").filter({ hasText: homeTeam });
  await expect(hiddenChannelGame.locator(".public-game-row__watch")).toHaveCount(0);
  await expect(hiddenChannelGame.getByText("SporTV 3 · " + secondaryChannelName + " · ge tv", { exact: true })).toBeVisible();
  await expect(hiddenChannelGame).not.toContainText("TF1");
});
