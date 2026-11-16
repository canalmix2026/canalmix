import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import localSupabase from "../../scripts/local-supabase.cjs";

const { readLocalSupabaseStatus } = localSupabase;

type TestUser = { id: string; email: string; password: string };
type TestChannel = { id: string; slug: string; name: string };

let adminClient: SupabaseClient;
let adminUser: TestUser;
let nonAdminUser: TestUser;
let primaryChannel: TestChannel;
let secondChannel: TestChannel;
let primarySourceIds: string[] = [];
const createdChannelIds: string[] = [];

async function signIn(page: Page, user: TestUser) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await page.waitForURL("**/admin/canais");
}

async function insertChannel(channel: TestChannel, urls: string[]) {
  const { data, error } = await adminClient
    .from("channels")
    .insert({
      slug: channel.slug,
      name: channel.name,
      category_id: 1,
      embed_urls: urls,
      is_published: true,
      published_at: new Date().toISOString(),
      created_by: adminUser.id,
    })
    .select("id, embed_source_ids")
    .single();
  if (error || !data) {
    throw new Error("Não foi possível criar um canal para a verificação local.");
  }
  channel.id = data.id;
  createdChannelIds.push(data.id);
  return data.embed_source_ids as string[];
}

test.beforeAll(async () => {
  const status = readLocalSupabaseStatus();
  if (!status.serviceRoleKey) {
    throw new Error("Inicie o Supabase local antes dos testes de ponta a ponta.");
  }
  adminClient = createClient(status.url, status.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const suffix = crypto.randomUUID().slice(0, 8);
  adminUser = {
    id: "",
    email: `canalmix-upgrades-admin-${suffix}@local.test`,
    password: "CanalMix-Teste-" + crypto.randomUUID().slice(0, 10),
  };
  nonAdminUser = {
    id: "",
    email: `canalmix-upgrades-visitor-${suffix}@local.test`,
    password: "CanalMix-Teste-" + crypto.randomUUID().slice(0, 10),
  };
  const { data: adminResult, error: adminError } = await adminClient.auth.admin.createUser({
    email: adminUser.email,
    password: adminUser.password,
    email_confirm: true,
  });
  if (adminError || !adminResult.user) {
    throw new Error("Não foi possível criar a conta de administração local.");
  }
  adminUser.id = adminResult.user.id;
  await adminClient.from("catalog_admins").insert({ user_id: adminUser.id });
  const { data: visitorResult, error: visitorError } = await adminClient.auth.admin.createUser({
    email: nonAdminUser.email,
    password: nonAdminUser.password,
    email_confirm: true,
  });
  if (visitorError || !visitorResult.user) {
    throw new Error("Não foi possível criar a conta visitante local.");
  }
  nonAdminUser.id = visitorResult.user.id;

  primaryChannel = {
    id: "",
    slug: "teste-remoto-favoritos-" + suffix,
    name: "TESTE Remoto e favoritos " + suffix,
  };
  secondChannel = {
    id: "",
    slug: "teste-historico-recente-" + suffix,
    name: "TESTE Histórico recente " + suffix,
  };
  primarySourceIds = await insertChannel(primaryChannel, [
    "https://player.canalmix.test/remote/option-1",
    "https://player.canalmix.test/remote/option-2",
    "https://player.canalmix.test/remote/option-3",
  ]);
  await insertChannel(secondChannel, ["https://player.canalmix.test/recent/option-1"]);
});

test.afterAll(async () => {
  if (!adminClient) {
    return;
  }
  if (createdChannelIds.length) {
    await adminClient
      .from("stream_issue_reports")
      .delete()
      .in("channel_id", createdChannelIds);
    await adminClient.from("channels").delete().in("id", createdChannelIds);
  }
  for (const user of [adminUser, nonAdminUser]) {
    if (user?.id) {
      await adminClient.from("catalog_admins").delete().eq("user_id", user.id);
      await adminClient.auth.admin.deleteUser(user.id);
    }
  }
});

test("Modo TV mantém a opção, restaura o foco e compartilha favoritos e histórico", async ({ page }) => {
  await page.route("https://player.canalmix.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Player local</title>",
    }),
  );
  await page.goto("/tv");
  await page.getByRole("searchbox", { name: "Buscar canal pelo nome" }).fill(primaryChannel.name);
  const originCard = page.getByRole("link", { name: "Assistir " + primaryChannel.name });
  await originCard.focus();
  const listScrollY = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("Enter");

  const optionTwo = page.getByRole("button", { name: "Opção 2" });
  const refresh = page.getByRole("button", { name: "Atualizar player" });
  const player = page.getByTitle("Player do canal " + primaryChannel.name);
  await expect(page).toHaveURL(new RegExp("/canais/" + primaryChannel.slug));
  await expect(page.getByRole("button", { name: "Opção 1" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(optionTwo).toBeFocused();
  await expect(player).toHaveAttribute("src", "https://player.canalmix.test/remote/option-2");
  const oldPlayer = await player.elementHandle();
  await page.keyboard.press("ArrowDown");
  await expect(refresh).toBeFocused();
  await page.keyboard.press("Enter");
  expect(await oldPlayer?.evaluate((frame) => frame.isConnected)).toBe(false);
  await expect(player).toHaveAttribute("src", "https://player.canalmix.test/remote/option-2");
  await expect(optionTwo).toHaveAttribute("aria-pressed", "true");
  await expect(refresh).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/tv\?(?:busca=.*&)?foco=/);
  await expect(page.getByRole("link", { name: "Assistir " + primaryChannel.name })).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(listScrollY);

  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Favoritar" }).click();
  await expect(page.getByRole("button", { name: "Remover dos favoritos" })).toBeVisible();
  await page.goto("/tv");
  await page.getByRole("searchbox", { name: "Buscar canal pelo nome" }).fill(secondChannel.name);
  await page.getByRole("link", { name: "Assistir " + secondChannel.name }).click();
  await expect(page.getByRole("heading", { name: secondChannel.name })).toBeVisible();
  await page.goBack();
  await page.goto("/tv");
  await expect(page).toHaveURL("/tv");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Meus canais" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assistidos recentemente" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Assistir " + primaryChannel.name })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Assistir " + secondChannel.name })).toHaveCount(0);
  const preservedHistory = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("canalmix.channel-library.v1") ?? "{}").history,
  );
  expect(preservedHistory).toEqual([secondChannel.id, primaryChannel.id]);

  await page.goto("/");
  await page.reload();
  await expect(page.getByRole("link", { name: "Assistir " + primaryChannel.name })).toHaveCount(1);
  const favoriteCard = page.locator(
    'a[data-list-section="favorites"][data-slug="' + primaryChannel.slug + '"]',
  );
  await favoriteCard.click();
  await page.getByRole("button", { name: "Remover dos favoritos" }).click();
  await page.locator(".channel-page__back").click();
  await expect(page.locator('[data-list-section="favorites"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Meus canais" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assistidos recentemente" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Assistir " + primaryChannel.name })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Assistir " + secondChannel.name })).toHaveCount(0);
  const retainedAfterUnfavorite = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("canalmix.channel-library.v1") ?? "{}").history,
  );
  expect(retainedAfterUnfavorite).toEqual([primaryChannel.id, secondChannel.id]);
});

test("admin testa, reordena, oculta e reativa fontes mantendo relatos no ID permanente", async ({ page }) => {
  await page.route("https://player.canalmix.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Player local</title>",
    }),
  );
  await page.goto("/canais/" + primaryChannel.slug);
  await page.getByRole("button", { name: "Reportar problema" }).click();
  await page.getByRole("checkbox").nth(2).check();
  await page.getByRole("button", { name: "Enviar relato" }).click();
  await expect(page.getByRole("heading", { name: "Relato recebido" })).toBeVisible();
  const { data: reportOptions, error: reportReadError } = await adminClient
    .from("stream_issue_report_options")
    .select("source_id, source_label")
    .eq("channel_id", primaryChannel.id);
  expect(reportReadError).toBeNull();
  expect(reportOptions).toEqual([
    { source_id: primarySourceIds[0], source_label: "Opção 1" },
    { source_id: primarySourceIds[2], source_label: "Opção 3" },
  ]);

  await signIn(page, adminUser);
  await page.getByRole("button", { name: "Editar " + primaryChannel.name }).click();
  await page.getByRole("button", { name: "Testar Opção 2" }).click();
  await expect(page.getByRole("dialog", { name: "Prévia" }).locator("iframe")).toHaveAttribute(
    "src",
    "https://player.canalmix.test/remote/option-2",
  );
  await page.getByRole("button", { name: "Fechar prévia" }).click();
  await page.getByRole("button", { name: "Ocultar Opção 2" }).click();
  await expect(page.getByText("Opção ocultada do catálogo público.")).toBeVisible();
  let { data: storedChannel } = await adminClient
    .from("channels")
    .select("embed_urls, embed_source_ids, embed_source_active")
    .eq("id", primaryChannel.id)
    .single();
  expect(storedChannel?.embed_source_active).toEqual([true, false, true]);
  expect(storedChannel?.embed_source_ids).toEqual(primarySourceIds);
  await page.getByRole("button", { name: "Testar Opção 2" }).click();
  await expect(page.getByRole("dialog").locator("iframe")).toHaveAttribute(
    "src",
    "https://player.canalmix.test/remote/option-2",
  );
  await page.getByRole("button", { name: "Fechar prévia" }).click();
  await page.goto("/canais/" + primaryChannel.slug);
  await expect(page.getByRole("button", { name: "Opção 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Opção 2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Opção 3" })).toHaveCount(0);
  await expect(page.getByTitle("Player do canal " + primaryChannel.name)).toHaveAttribute(
    "src",
    "https://player.canalmix.test/remote/option-1",
  );

  await page.goto("/admin/canais");
  await page.getByRole("button", { name: "Editar " + primaryChannel.name }).click();
  await page.getByRole("button", { name: "Reativar Opção 2" }).click();
  await expect(page.getByText("Opção reativada no catálogo público.")).toBeVisible();
  await page.getByRole("button", { name: "Mover opção 3 para cima" }).click();
  await expect(page.getByText("Ordem da opção atualizada.")).toBeVisible();
  ({ data: storedChannel } = await adminClient
    .from("channels")
    .select("embed_urls, embed_source_ids, embed_source_active")
    .eq("id", primaryChannel.id)
    .single());
  expect(storedChannel?.embed_source_ids).toEqual([
    primarySourceIds[0],
    primarySourceIds[2],
    primarySourceIds[1],
  ]);
  expect(storedChannel?.embed_source_active).toEqual([true, true, true]);
  const { data: preservedReport } = await adminClient
    .from("stream_issue_report_options")
    .select("source_id, source_label, status")
    .eq("channel_id", primaryChannel.id)
    .eq("source_id", primarySourceIds[2])
    .single();
  expect(preservedReport).toEqual({
    source_id: primarySourceIds[2],
    source_label: "Opção 3",
    status: "pending",
  });

  for (const optionNumber of [1, 2, 3]) {
    await page.getByRole("button", { name: "Ocultar Opção " + optionNumber }).click();
    await expect(page.getByText("Opção ocultada do catálogo público.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reativar Opção " + optionNumber })).toBeVisible();
  }
  const { data: allSourcesHidden } = await adminClient
    .from("channels")
    .select("embed_source_active")
    .eq("id", primaryChannel.id)
    .single();
  expect(allSourcesHidden?.embed_source_active).toEqual([false, false, false]);
  await page.goto("/canais/" + primaryChannel.slug);
  await expect(page.locator(".channel-player__unavailable")).toHaveText("Nenhuma opção disponível");
  await expect(page.locator("iframe.channel-player__frame")).toHaveCount(0);
  await adminClient
    .from("channels")
    .update({ embed_source_active: [true, true, true] })
    .eq("id", primaryChannel.id);

  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(nonAdminUser.email);
  await page.getByLabel("Senha").fill(nonAdminUser.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page.locator(".form-error")).toContainText("não tem permissão");
  await page.goto("/admin/canais");
  await expect(page).toHaveURL(/\/admin\/login/);
});
