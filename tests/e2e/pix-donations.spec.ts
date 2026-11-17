import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import localSupabase from "../../scripts/local-supabase.cjs";
import type { Database, PixDonationSettingsRow } from "../../src/lib/supabase/database.types";

const { readLocalSupabaseStatus } = localSupabase;
type TestUser = { id: string; email: string; password: string };

let adminClient: SupabaseClient<Database>;
let adminUser: TestUser;
let originalSettings: PixDonationSettingsRow | null = null;

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(adminUser.email);
  await page.getByLabel("Senha").fill(adminUser.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await page.waitForURL("**/admin/canais");
}

async function setActiveTestSettings() {
  const { error } = await adminClient
    .from("pix_donation_settings")
    .update({
      pix_key: "chave@canalmix.com.br",
      receiver_name: "CanalMix",
      is_active: true,
      preset_amount_1_cents: 1000,
      preset_amount_2_cents: 2000,
      preset_amount_3_cents: 3000,
    })
    .eq("id", true);
  if (error) throw new Error("Não foi possível preparar os dados Pix de teste local.");
}

function readTopLevelTlv(payload: string) {
  const fields = new Map<string, string>();
  let offset = 0;
  while (offset < payload.length) {
    const tag = payload.slice(offset, offset + 2);
    const length = Number(payload.slice(offset + 2, offset + 4));
    const valueStart = offset + 4;
    fields.set(tag, payload.slice(valueStart, valueStart + length));
    offset = valueStart + length;
  }
  return fields;
}

test.beforeAll(async () => {
  const status = readLocalSupabaseStatus();
  if (!status.serviceRoleKey || !status.publishableKey) {
    throw new Error("Inicie o Supabase local antes dos testes Pix.");
  }
  adminClient = createClient<Database>(status.url, status.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: previousSettings, error: settingsError } = await adminClient
    .from("pix_donation_settings")
    .select("id, pix_key, receiver_name, is_active, preset_amount_1_cents, preset_amount_2_cents, preset_amount_3_cents, updated_at")
    .eq("id", true)
    .maybeSingle();
  if (settingsError || !previousSettings) {
    throw new Error("A migration local não carregou a configuração Pix.");
  }
  originalSettings = previousSettings;

  const suffix = crypto.randomUUID().slice(0, 8);
  adminUser = {
    id: "",
    email: `canalmix-pix-admin-${suffix}@local.test`,
    password: `CanalMix-Pix-${crypto.randomUUID().slice(0, 10)}`,
  };
  const { data: userResult, error: userError } = await adminClient.auth.admin.createUser({
    email: adminUser.email,
    password: adminUser.password,
    email_confirm: true,
  });
  if (userError || !userResult.user) throw new Error("Não foi possível criar o administrador Pix de teste.");
  adminUser.id = userResult.user.id;

  const { error: membershipError } = await adminClient
    .from("catalog_admins")
    .insert({ user_id: adminUser.id });
  if (membershipError) throw new Error("Não foi possível autorizar o administrador Pix de teste.");
});

test.beforeEach(async () => {
  await setActiveTestSettings();
});

test.afterAll(async () => {
  if (!adminClient) return;
  if (originalSettings) {
    await adminClient
      .from("pix_donation_settings")
      .update({
        pix_key: originalSettings.pix_key,
        receiver_name: originalSettings.receiver_name,
        is_active: originalSettings.is_active,
        preset_amount_1_cents: originalSettings.preset_amount_1_cents,
        preset_amount_2_cents: originalSettings.preset_amount_2_cents,
        preset_amount_3_cents: originalSettings.preset_amount_3_cents,
      })
      .eq("id", true);
  }
  if (adminUser?.id) {
    await adminClient.from("catalog_admins").delete().eq("user_id", adminUser.id);
    await adminClient.auth.admin.deleteUser(adminUser.id);
  }
});

test("computador: painel fixo, recolhido persiste e gera BR Codes para os valores disponíveis", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Curtiu o CanalMix?" })).toBeVisible();

  const aside = page.locator(".pix-donation-aside");
  const initialBox = await aside.boundingBox();
  const mainBox = await page.locator(".public-site-layout__main").boundingBox();
  expect(initialBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(initialBox!.y).toBeGreaterThanOrEqual(92);
  expect(mainBox!.x + mainBox!.width).toBeLessThanOrEqual(initialBox!.x);
  await page.evaluate(() => {
    document.body.style.minHeight = "200vh";
    window.scrollTo(0, 500);
  });
  await expect.poll(async () => (await aside.boundingBox())?.y).toBe(initialBox!.y);

  await page.getByRole("button", { name: "Ocultar painel de apoio" }).click();
  await expect(aside).toBeHidden();
  const launcher = page.getByRole("button", { name: "Apoiar o CanalMix via Pix" });
  await expect(launcher).toBeVisible();
  await page.getByRole("link", { name: "Modo TV" }).click();
  await expect(page).toHaveURL(/\/tv$/);
  await expect(launcher).toBeVisible();
  await page.getByRole("link", { name: "Sair do Modo TV" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
  for (const route of ["/?categoria=esporte", "/grade", "/canais/sportv"]) {
    await page.goto(route);
    await expect(launcher).toBeVisible();
  }
  await page.reload();
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.getByRole("heading", { name: "Curtiu o CanalMix?" })).toBeVisible();

  const values = [
    { label: "R$ 10", amount: "10.00" },
    { label: "R$ 20", amount: "20.00" },
    { label: "R$ 30", amount: "30.00" },
  ];
  for (const entry of values) {
    await page.getByRole("button", { name: entry.label, exact: true }).click();
    await page.getByRole("button", { name: "Gerar Pix" }).click();
    await expect(page.getByText("Pix gerado", { exact: false }).first()).toBeVisible();
    const code = await page.getByLabel("Código Pix Copia e Cola").inputValue();
    const qr = page.locator(".pix-tv__result [data-pix-code]");
    await expect(qr).toHaveAttribute("data-pix-code", code);
    const fields = readTopLevelTlv(code.slice(0, -8));
    expect(fields.get("54")).toBe(entry.amount);
    expect(fields.get("59")).toBe("CANALMIX");
    expect(fields.has("60")).toBe(false);
  }

  await page.getByRole("button", { name: "Outro valor" }).click();
  await page.getByLabel("Outro valor em reais").fill("15,50");
  await page.getByRole("button", { name: "Gerar Pix" }).click();
  await expect(page.getByRole("heading", { name: "Curtiu o CanalMix?" })).toBeVisible();
  const customCode = await page.getByLabel("Código Pix Copia e Cola").inputValue();
  expect(readTopLevelTlv(customCode.slice(0, -8)).get("54")).toBe("15.50");
  await expect(page.locator(".pix-tv__result [data-pix-code]")).toHaveAttribute("data-pix-code", customCode);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copiar código Pix" }).click();
  await expect(page.getByRole("button", { name: "Código copiado" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(customCode);
  await page.getByRole("button", { name: "R$ 20", exact: true }).click();
  await expect(page.getByLabel("Código Pix Copia e Cola")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ocultar painel de apoio" })).toBeVisible();
});

test("Modo TV: setas e OK controlam o painel e devolver foco a Apoiar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tv");
  await page.getByRole("button", { name: "Ocultar painel de apoio" }).click();
  const launcher = page.getByRole("button", { name: "Apoiar o CanalMix via Pix" });
  await launcher.focus();
  await page.keyboard.press("Enter");

  const firstAmount = page.getByRole("button", { name: "R$ 10", exact: true });
  const secondAmount = page.getByRole("button", { name: "R$ 20", exact: true });
  const otherAmount = page.getByRole("button", { name: "Outro valor" });
  const generateButton = page.getByRole("button", { name: "Gerar Pix" });
  await expect(firstAmount).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(secondAmount).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(otherAmount).toBeFocused();
  await page.locator(":focus").dispatchEvent("keydown", { key: "OK", bubbles: true });
  await expect(page.getByLabel("Outro valor em reais")).toBeVisible();
  await page.getByLabel("Outro valor em reais").fill("15,50");
  await otherAmount.focus();
  await page.keyboard.press("ArrowDown");
  await expect(generateButton).toBeFocused();
  await page.locator(":focus").dispatchEvent("keydown", { key: "OK", bubbles: true });
  await expect(page.getByText("Pix gerado", { exact: false }).first()).toBeVisible();

  const hideButton = page.getByRole("button", { name: "Ocultar painel de apoio" });
  await hideButton.focus();
  await page.locator(":focus").dispatchEvent("keydown", { key: "OK", bubbles: true });
  await expect(launcher).toBeFocused();
});

test("celular: painel começa aberto no rodapé e mantém Ocultar visível durante a rolagem interna", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 360 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Curtiu o CanalMix?" })).toBeVisible();

  const panelBox = await page.locator(".pix-donation-aside").boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(360);
  const hideButton = page.getByRole("button", { name: "Ocultar painel de apoio" });
  await page.getByRole("button", { name: "Outro valor" }).click();
  await page.getByLabel("Outro valor em reais").fill("15,50");
  await page.getByRole("button", { name: "Gerar Pix" }).click();
  await expect(page.getByLabel("Código Pix Copia e Cola")).toBeVisible();
  const content = page.locator(".pix-tv__content");
  expect(await content.evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");
  const hideBoxBeforeScroll = await hideButton.boundingBox();
  await content.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const hideBoxAfter = await hideButton.boundingBox();
  expect(hideBoxBeforeScroll).not.toBeNull();
  expect(hideBoxAfter).not.toBeNull();
  expect(hideBoxAfter!.y).toBe(hideBoxBeforeScroll!.y);
  expect(hideBoxAfter!.y).toBeGreaterThanOrEqual(0);
  await expect(hideButton).toBeVisible();
});

test("administração permite testar antes de ativar e visitantes não podem alterar a configuração", async ({ page }) => {
  await page.goto("/admin/doacoes");
  await expect(page).toHaveURL(/\/admin\/login/);
  await signIn(page);
  await page.goto("/admin/doacoes");

  await page.getByLabel("Chave Pix").fill("chave@canalmix.com.br");
  await page.getByLabel("Nome do recebedor").fill("CanalMix");
  await expect(page.getByLabel("Valor predefinido 1")).toHaveValue("10,00");
  await page.getByLabel("Valor predefinido 1").fill("15,50");
  await page.getByLabel("Ativar doações").uncheck();
  await page.getByRole("button", { name: "Testar Pix" }).click();
  await expect(page.getByText("Pix gerado para teste", { exact: true })).toBeVisible();
  const previewCode = await page.getByLabel("Prévia do código Pix Copia e Cola").inputValue();
  await expect(page.locator(".admin-donations-preview [data-pix-code]")).toHaveAttribute("data-pix-code", previewCode);
  expect(readTopLevelTlv(previewCode.slice(0, -8)).get("54")).toBe("10.00");

  await page.getByLabel("Ativar doações").check();
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(page.getByRole("status")).toContainText("Configurações Pix salvas.");
  await page.evaluate(() => localStorage.removeItem("canalmix.pix-donations.hidden.v1"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Curtiu o CanalMix?" })).toBeVisible();
  const customPreset = page.getByRole("button", { name: "R$ 15,50", exact: true });
  await expect(customPreset).toBeVisible();
  await customPreset.click();
  await page.getByRole("button", { name: "Gerar Pix" }).click();
  expect(readTopLevelTlv((await page.getByLabel("Código Pix Copia e Cola").inputValue()).slice(0, -8)).get("54")).toBe("15.50");

  await page.goto("/admin/doacoes");
  await page.getByLabel("Ativar doações").uncheck();
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(page.getByRole("status")).toContainText("Configurações Pix salvas.");
  await page.goto("/");
  await expect(page.locator(".pix-donation-aside")).toHaveCount(0);
  await expect(page.locator(".pix-donation-launcher")).toHaveCount(0);

  const status = readLocalSupabaseStatus();
  const visitorClient = createClient<Database>(status.url, status.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await visitorClient
    .from("pix_donation_settings")
    .update({ is_active: true })
    .eq("id", true)
    .select("id")
    .maybeSingle();
  expect(error).not.toBeNull();
});
