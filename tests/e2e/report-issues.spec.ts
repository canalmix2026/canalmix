import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page, type Route } from "@playwright/test";
import localSupabase from "../../scripts/local-supabase.cjs";
import type { Database } from "../../src/lib/supabase/database.types";

const { readLocalSupabaseStatus } = localSupabase;
type TestUser = { id: string; email: string; password: string };
type TestChannel = {
  id: string;
  slug: string;
  name: string;
  embedUrls: string[];
  sourceIds: string[];
};

const embedTestDocument = `<!doctype html><html><body><button>Play</button></body></html>`;
let adminClient: SupabaseClient<Database>;
let localUrl = "";
let publishableKey = "";
let adminUser: TestUser;
let nonAdminUser: TestUser;
let issueChannel: TestChannel;
let otherChannel: TestChannel;

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

test.beforeAll(async () => {
  const status = readLocalSupabaseStatus();
  if (!status.serviceRoleKey || !status.publishableKey) {
    throw new Error("Inicie o Supabase local antes dos testes de relatos.");
  }
  localUrl = status.url;
  publishableKey = status.publishableKey;
  adminClient = createClient<Database>(status.url, status.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const suffix = crypto.randomUUID().slice(0, 8);
  adminUser = {
    id: "",
    email: "canalmix-relatos-admin-" + suffix + "@local.test",
    password: "CanalMix-Relatos-" + crypto.randomUUID().slice(0, 10),
  };
  nonAdminUser = {
    id: "",
    email: "canalmix-relatos-visitante-" + suffix + "@local.test",
    password: "CanalMix-Relatos-" + crypto.randomUUID().slice(0, 10),
  };

  const { data: adminResult, error: adminError } =
    await adminClient.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
    });
  if (adminError || !adminResult.user) {
    throw new Error("Não foi possível criar o administrador local de teste.");
  }
  adminUser.id = adminResult.user.id;
  const { error: membershipError } = await adminClient
    .from("catalog_admins")
    .insert({ user_id: adminUser.id });
  if (membershipError) {
    throw new Error("Não foi possível autorizar o administrador local de teste.");
  }

  const { data: nonAdminResult, error: nonAdminError } =
    await adminClient.auth.admin.createUser({
      email: nonAdminUser.email,
      password: nonAdminUser.password,
      email_confirm: true,
    });
  if (nonAdminError || !nonAdminResult.user) {
    throw new Error("Não foi possível criar a conta sem permissão de teste.");
  }
  nonAdminUser.id = nonAdminResult.user.id;

  const { data: category, error: categoryError } = await adminClient
    .from("categories")
    .select("id")
    .eq("slug", "esporte")
    .single();
  if (categoryError || !category) {
    throw new Error("A migration local não carregou as categorias.");
  }

  issueChannel = {
    id: "",
    slug: "canalmix-teste-relatos-" + suffix,
    name: "TESTE Relatos de transmissão",
    embedUrls: [
      "https://player.canalmix.test/embed/relato-1",
      "https://player.canalmix.test/embed/relato-2",
      "https://player.canalmix.test/embed/relato-3",
    ],
    sourceIds: [],
  };
  otherChannel = {
    id: "",
    slug: "canalmix-teste-relatos-outro-" + suffix,
    name: "TESTE Outro canal de relatos",
    embedUrls: ["https://player.canalmix.test/embed/outro-canal"],
    sourceIds: [],
  };

  for (const channel of [issueChannel, otherChannel]) {
    const { data, error } = await adminClient
      .from("channels")
      .insert({
        slug: channel.slug,
        name: channel.name,
        category_id: category.id,
        embed_urls: channel.embedUrls,
        is_published: true,
        published_at: new Date().toISOString(),
        created_by: adminUser.id,
      })
      .select("id, embed_source_ids")
      .single();
    if (error || !data) {
      throw new Error("Não foi possível criar os canais locais de teste.");
    }
    channel.id = data.id;
    channel.sourceIds = data.embed_source_ids;
  }
});

test.afterAll(async () => {
  if (!adminClient) {
    return;
  }
  if (issueChannel?.id) {
    await adminClient
      .from("stream_issue_reports")
      .delete()
      .eq("channel_id", issueChannel.id);
  }
  const channelIds = [issueChannel?.id, otherChannel?.id].filter(
    (id): id is string => Boolean(id),
  );
  if (channelIds.length > 0) {
    await adminClient.from("channels").delete().in("id", channelIds);
  }
  if (nonAdminUser?.id) {
    await adminClient.auth.admin.deleteUser(nonAdminUser.id);
  }
  if (adminUser?.id) {
    await adminClient.auth.admin.deleteUser(adminUser.id);
  }
});

test("reports persist exact options, resolution, anonymous and TV flows locally", async ({
  page,
  browser,
}) => {
  await page.route("https://player.canalmix.test/**", fulfillEmbedDocument);
  await page.goto("/canais/" + issueChannel.slug);
  const player = page.getByTitle("Player do canal " + issueChannel.name);
  await page.getByRole("button", { name: "Opção 2" }).click();
  await expect(player).toHaveAttribute("src", issueChannel.embedUrls[1]);
  const playerBeforeReport = await player.elementHandle();
  const pageUrlBeforeReport = page.url();

  await page.getByRole("button", { name: "Reportar problema" }).click();
  const dialog = page.getByRole("dialog", { name: "Reportar problema" });
  const checkboxes = dialog.getByRole("checkbox");
  await expect(checkboxes.nth(1)).toBeChecked();
  await expect(dialog.getByText("Você está assistindo")).toBeVisible();
  await checkboxes.nth(1).uncheck();
  await dialog.getByRole("button", { name: "Enviar relato" }).click();
  await expect(dialog.locator(".stream-issue-form__feedback")).toHaveText(
    "Selecione ao menos uma opção para enviar.",
  );

  await checkboxes.nth(0).check();
  await checkboxes.nth(2).check();
  await dialog.getByRole("button", { name: "Enviar relato" }).click();
  await expect(dialog.getByRole("heading", { name: "Relato recebido" })).toBeVisible();
  await expect(dialog.getByText(/^Protocolo CM-/)).toBeVisible();
  expect(page.url()).toBe(pageUrlBeforeReport);
  expect(await playerBeforeReport?.evaluate((frame) => frame.isConnected)).toBe(true);
  await expect(player).toHaveAttribute("src", issueChannel.embedUrls[1]);
  await expect(page.getByRole("button", { name: "Opção 2" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const { data: firstOptions, error: firstOptionsError } = await adminClient
    .from("stream_issue_report_options")
    .select("source_id, source_label, status")
    .eq("channel_id", issueChannel.id);
  expect(firstOptionsError).toBeNull();
  expect((firstOptions ?? []).map((option) => option.source_id).sort()).toEqual(
    [issueChannel.sourceIds[0], issueChannel.sourceIds[2]].sort(),
  );
  expect(firstOptions?.some((option) => option.source_label === "Opção 2")).toBe(false);

  await page.getByRole("button", { name: "Concluir" }).click();
  await page.getByRole("button", { name: "Reportar problema" }).click();
  const forgedDialog = page.getByRole("dialog", { name: "Reportar problema" });
  await forgedDialog
    .locator('input[name="channelId"]')
    .evaluate((input, targetId) => {
      (input as HTMLInputElement).value = String(targetId);
    }, otherChannel.id);
  await forgedDialog.getByRole("button", { name: "Enviar relato" }).click();
  await expect(forgedDialog.locator(".stream-issue-form__feedback")).toContainText(
    "não pertence mais a este canal",
  );
  await forgedDialog.getByRole("button", { name: "Cancelar" }).click();

  await signIn(page, adminUser);
  await page.goto("/admin/problemas");
  const issueChannelPanel = page
    .locator(".admin-problem-channel")
    .filter({ hasText: issueChannel.name });
  const optionOne = issueChannelPanel
    .locator(".admin-problem-option")
    .filter({ has: page.getByRole("heading", { name: "Opção 1" }) });
  const optionTwo = issueChannelPanel
    .locator(".admin-problem-option")
    .filter({ has: page.getByRole("heading", { name: "Opção 2" }) });
  const optionThree = issueChannelPanel
    .locator(".admin-problem-option")
    .filter({ has: page.getByRole("heading", { name: "Opção 3" }) });
  const pendingBeforeResolution = Number(await page.locator(".admin-sidebar__count").textContent());
  expect(pendingBeforeResolution).toBeGreaterThanOrEqual(2);
  await expect(optionOne).toContainText("1 relato pendente");
  await expect(optionThree).toContainText("1 relato pendente");
  await expect(optionTwo).toHaveCount(0);
  await optionOne
    .getByRole("button", { name: "Marcar como resolvido" })
    .click();
  await expect(page.locator(".admin-sidebar__count")).toHaveText(String(pendingBeforeResolution - 1));
  await expect(optionOne).toHaveCount(0);
  await expect(optionThree).toContainText("1 relato pendente");
  await page.getByRole("button", { name: /Resolvidos/ }).click();
  await expect(optionOne).toContainText("0 relatos pendentes");
  await expect(optionOne).toContainText("Resolvido");

  const nonAdminClient = createClient<Database>(localUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: nonAdminLoginError } = await nonAdminClient.auth.signInWithPassword({
    email: nonAdminUser.email,
    password: nonAdminUser.password,
  });
  expect(nonAdminLoginError).toBeNull();
  const { data: privateReports, error: privateReportsError } = await nonAdminClient
    .from("stream_issue_reports")
    .select("id");
  expect(privateReportsError).toBeNull();
  expect(privateReports).toEqual([]);

  const nonAdminContext = await browser.newContext();
  const nonAdminPage = await nonAdminContext.newPage();
  await nonAdminPage.goto("http://127.0.0.1:3000/admin/login");
  await nonAdminPage.getByLabel("E-mail").fill(nonAdminUser.email);
  await nonAdminPage.getByLabel("Senha").fill(nonAdminUser.password);
  await nonAdminPage.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(nonAdminPage.locator(".form-error")).toContainText(
    "Esta conta não tem permissão para acessar o painel.",
  );
  await nonAdminPage.goto("http://127.0.0.1:3000/admin/canais");
  await expect(nonAdminPage).toHaveURL(/\/admin\/login/);
  for (const route of ["/admin/categorias", "/admin/grade", "/admin/problemas"]) {
    await nonAdminPage.goto("http://127.0.0.1:3000" + route);
    await expect(nonAdminPage).toHaveURL(/\/admin\/login/);
  }
  await nonAdminContext.close();

  const anonymousContext = await browser.newContext();
  const tvPage = await anonymousContext.newPage();
  await tvPage.route("https://player.canalmix.test/**", fulfillEmbedDocument);
  const tvUrl =
    "http://127.0.0.1:3000/canais/" + issueChannel.slug + "?from=tv";
  await tvPage.goto(tvUrl);
  const tvPlayer = tvPage.getByTitle("Player do canal " + issueChannel.name);
  const reportButton = tvPage.getByRole("button", { name: "Reportar problema" });
  await expect(tvPage.getByRole("button", { name: "Opção 1" })).toBeFocused();
  await tvPage.keyboard.press("ArrowRight");
  await expect(tvPage.getByRole("button", { name: "Opção 2" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const tvPlayerBeforeReport = await tvPlayer.elementHandle();
  await tvPage.keyboard.press("ArrowDown");
  await tvPage.keyboard.press("ArrowRight");
  await tvPage.keyboard.press("ArrowRight");
  await expect(reportButton).toBeFocused();
  await tvPage.keyboard.press("Enter");

  const tvDialog = tvPage.getByRole("dialog", { name: "Reportar problema" });
  const tvCheckboxes = tvDialog.getByRole("checkbox");
  await expect(tvCheckboxes.nth(1)).toBeFocused();
  await tvPage.keyboard.press("ArrowLeft");
  await tvPage.keyboard.press("Enter");
  await expect(tvCheckboxes.nth(0)).toBeChecked();
  await tvPage.keyboard.press("ArrowRight");
  await tvPage.keyboard.press("Enter");
  await expect(tvCheckboxes.nth(1)).not.toBeChecked();
  await tvPage.keyboard.press("ArrowRight");
  await tvPage.keyboard.press("ArrowRight");
  await tvPage.keyboard.press("ArrowRight");
  await expect(tvDialog.getByRole("button", { name: "Enviar relato" })).toBeFocused();
  await tvPage.keyboard.press("Enter");
  await expect(tvDialog.getByRole("heading", { name: "Relato recebido" })).toBeVisible();
  expect(tvPage.url()).toBe(tvUrl);
  expect(await tvPlayerBeforeReport?.evaluate((frame) => frame.isConnected)).toBe(true);
  await expect(tvPlayer).toHaveAttribute("src", issueChannel.embedUrls[1]);
  await anonymousContext.close();

  await page.reload();
  await page.getByRole("button", { name: /Resolvidos/ }).click();
  const refreshedIssueChannelPanel = page
    .locator(".admin-problem-channel")
    .filter({ hasText: issueChannel.name });
  const refreshedOptionOne = refreshedIssueChannelPanel
    .locator(".admin-problem-option")
    .filter({ has: page.getByRole("heading", { name: "Opção 1" }) });
  const refreshedOptionThree = refreshedIssueChannelPanel
    .locator(".admin-problem-option")
    .filter({ has: page.getByRole("heading", { name: "Opção 3" }) });
  await expect(refreshedOptionOne).toContainText("1 relato pendente");
  await expect(refreshedOptionOne).toContainText("Resolvido");
  await expect(refreshedOptionThree).toHaveCount(0);
  await expect(page.locator(".admin-sidebar__count")).toHaveText(String(pendingBeforeResolution));
  await page.getByRole("button", { name: /Pendentes/ }).click();
  await expect(refreshedOptionOne).toContainText("1 relato pendente");
  await expect(refreshedOptionThree).toContainText("1 relato pendente");

  const { data: finalOptions, error: finalOptionsError } = await adminClient
    .from("stream_issue_report_options")
    .select("source_id, source_position, source_label, status")
    .eq("channel_id", issueChannel.id);
  expect(finalOptionsError).toBeNull();
  expect(
    finalOptions?.filter((option) => option.source_id === issueChannel.sourceIds[0]),
  ).toHaveLength(2);
  expect(
    finalOptions?.filter((option) => option.source_id === issueChannel.sourceIds[2]),
  ).toHaveLength(1);
  expect(finalOptions?.some((option) => option.source_id === issueChannel.sourceIds[1])).toBe(false);
  expect(
    finalOptions?.filter(
      (option) =>
        option.source_id === issueChannel.sourceIds[0] && option.status === "pending",
    ),
  ).toHaveLength(1);
  expect(
    finalOptions?.filter(
      (option) =>
        option.source_id === issueChannel.sourceIds[2] && option.status === "pending",
    ),
  ).toHaveLength(1);

  await page.goto("/admin/canais");
  await page
    .getByRole("button", { name: "Editar " + issueChannel.name })
    .click();
  await page.getByRole("button", { name: "Mover opção 3 para cima" }).click();
  await expect(page.locator(".channel-form [role='status']")).toHaveText("Ordem da opção atualizada.");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.locator(".admin-drawer")).toHaveCount(0);
  const { data: reorderedChannel, error: reorderedChannelError } = await adminClient
    .from("channels")
    .select("embed_urls, embed_source_ids")
    .eq("id", issueChannel.id)
    .single();
  expect(reorderedChannelError).toBeNull();
  expect(reorderedChannel?.embed_urls).toEqual([
    issueChannel.embedUrls[0],
    issueChannel.embedUrls[2],
    issueChannel.embedUrls[1],
  ]);
  expect(reorderedChannel?.embed_source_ids).toEqual([
    issueChannel.sourceIds[0],
    issueChannel.sourceIds[2],
    issueChannel.sourceIds[1],
  ]);

  const { error: sourceRemovalError } = await adminClient
    .from("channels")
    .update({
      embed_urls: [issueChannel.embedUrls[2]],
      embed_source_ids: [issueChannel.sourceIds[2]],
    })
    .eq("id", issueChannel.id);
  expect(sourceRemovalError).toBeNull();
  const { data: preservedHistory, error: preservedHistoryError } = await adminClient
    .from("stream_issue_report_options")
    .select("source_id, source_position, source_label")
    .eq("channel_id", issueChannel.id);
  expect(preservedHistoryError).toBeNull();
  expect(preservedHistory?.some((item) => item.source_label === "Opção 2")).toBe(false);
  expect(
    preservedHistory?.some(
      (item) =>
        item.source_id === issueChannel.sourceIds[2] &&
        item.source_position === 3 &&
        item.source_label === "Opção 3",
    ),
  ).toBe(true);

  const idempotencyKey = crypto.randomUUID();
  const idempotencyFingerprint = "a".repeat(64);
  const duplicateSubmission = {
    p_channel_id: issueChannel.id,
    p_selected_source_ids: [issueChannel.sourceIds[2]],
    p_idempotency_key: idempotencyKey,
    p_fingerprint_hash: idempotencyFingerprint,
  };
  const { data: firstDuplicateResult, error: firstDuplicateError } =
    await adminClient.rpc("submit_stream_issue", duplicateSubmission);
  const { data: secondDuplicateResult, error: secondDuplicateError } =
    await adminClient.rpc("submit_stream_issue", duplicateSubmission);
  expect(firstDuplicateError).toBeNull();
  expect(secondDuplicateError).toBeNull();
  expect(secondDuplicateResult?.[0].duplicate).toBe(true);
  expect(secondDuplicateResult?.[0].report_id).toBe(
    firstDuplicateResult?.[0].report_id,
  );

  const rateFingerprint = "b".repeat(64);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await adminClient.rpc("submit_stream_issue", {
      p_channel_id: issueChannel.id,
      p_selected_source_ids: [issueChannel.sourceIds[2]],
      p_idempotency_key: crypto.randomUUID(),
      p_fingerprint_hash: rateFingerprint,
    });
    expect(error).toBeNull();
  }
  const { error: rateLimitError } = await adminClient.rpc("submit_stream_issue", {
    p_channel_id: issueChannel.id,
    p_selected_source_ids: [issueChannel.sourceIds[2]],
    p_idempotency_key: crypto.randomUUID(),
    p_fingerprint_hash: rateFingerprint,
  });
  expect(rateLimitError?.message).toContain("rate_limited");
});
