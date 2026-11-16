import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import localSupabase from "../../scripts/local-supabase.cjs";
import type { Database } from "../../src/lib/supabase/database.types";

const { readLocalSupabaseStatus } = localSupabase;
type TestUser = { id: string; email: string; password: string };

let adminClient: SupabaseClient<Database>;
let adminUser: TestUser;
const fixtureTeamIds: string[] = [];
const suffix = crypto.randomUUID().slice(0, 8);

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(adminUser.email);
  await page.getByLabel("Senha").fill(adminUser.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await page.waitForURL("**/admin/canais");
  await page.goto("/admin/times");
}

async function addTeam(page: Page, name: string, shieldUrl: string) {
  await page.getByRole("button", { name: "Adicionar time" }).click();
  const form = page.locator("form.admin-team-form");
  await expect(form.locator("input, select, textarea")).toHaveCount(5);
  await form.getByLabel("Nome do time").fill(name);
  await form.getByLabel("País do time").fill("Brasil");
  await form.getByLabel("Escudo").fill(shieldUrl);
  await form.getByRole("button", { name: "Salvar time" }).click();
  await expect(page.getByRole("status")).toHaveText("Time cadastrado.");

  const { data, error } = await adminClient
    .from("teams")
    .select("id, shield_url, team_type, gender, country_name")
    .eq("name", name)
    .single();
  expect(error).toBeNull();
  if (!data) throw new Error("O time recém-cadastrado não foi encontrado no Supabase local.");
  fixtureTeamIds.push(data.id);
  return data;
}

test.beforeAll(async () => {
  const status = readLocalSupabaseStatus();
  if (!status.serviceRoleKey || !status.publishableKey) {
    throw new Error("Inicie o Supabase local antes dos testes do formulário de times.");
  }
  adminClient = createClient<Database>(status.url, status.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  adminUser = {
    id: "",
    email: `canalmix-team-form-${suffix}@local.test`,
    password: `CanalMix-Team-${crypto.randomUUID().slice(0, 10)}`,
  };
  const { data, error } = await adminClient.auth.admin.createUser({
    email: adminUser.email,
    password: adminUser.password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error("Não foi possível criar o administrador local de teste.");
  adminUser.id = data.user.id;
  const { error: membershipError } = await adminClient
    .from("catalog_admins")
    .insert({ user_id: adminUser.id });
  if (membershipError) throw new Error("Não foi possível autorizar o administrador local de teste.");
});

test.afterAll(async () => {
  if (!adminClient) return;
  if (fixtureTeamIds.length) await adminClient.from("teams").delete().in("id", fixtureTeamIds);
  if (adminUser?.id) await adminClient.auth.admin.deleteUser(adminUser.id);
});

test("compact form accepts HTTPS, public paths and blank shield while edits preserve metadata", async ({ page }) => {
  await signIn(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Adicionar time" }).click();
  const form = page.locator("form.admin-team-form");
  await expect(form.locator("input, select, textarea")).toHaveCount(5);
  const desktopLayout = await form.locator(".admin-team-form__grid").evaluate((grid) => ({
    columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    rows: [...grid.querySelectorAll(":scope > label")].map((label) => label.getBoundingClientRect().top),
  }));
  expect(desktopLayout.columns).toBe(2);
  expect(desktopLayout.rows[0]).toBe(desktopLayout.rows[1]);
  expect(desktopLayout.rows[2]).toBe(desktopLayout.rows[3]);
  expect(desktopLayout.rows[4]).toBeGreaterThan(desktopLayout.rows[3]);
  await page.getByRole("button", { name: "Cancelar" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Adicionar time" }).click();
  const mobileColumns = await page.locator(".admin-team-form__grid").evaluate((grid) =>
    getComputedStyle(grid).gridTemplateColumns.split(" ").length,
  );
  expect(mobileColumns).toBe(1);
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.setViewportSize({ width: 1280, height: 900 });

  const httpsTeam = await addTeam(page, `TESTE Escudo HTTPS ${suffix}`, "https://crests.canalmix.test/test.svg");
  expect(httpsTeam.shield_url).toBe("https://crests.canalmix.test/test.svg");
  expect(httpsTeam.country_name).toBe("Brasil");

  const localTeam = await addTeam(page, `TESTE Escudo local ${suffix}`, "/escudos/teste-local.png");
  expect(localTeam.shield_url).toBe("/escudos/teste-local.png");

  const blankTeam = await addTeam(page, `TESTE Sem escudo ${suffix}`, "");
  expect(blankTeam.shield_url).toBeNull();

  const invalidFieldsName = `TESTE Campos obrigatórios ${suffix}`;
  await page.getByRole("button", { name: "Adicionar time" }).click();
  const invalidFieldsForm = page.locator("form.admin-team-form");
  await invalidFieldsForm.evaluate((element) => {
    element.querySelectorAll("[required]").forEach((field) => field.removeAttribute("required"));
  });
  await invalidFieldsForm.getByLabel("Nome do time").fill("");
  await invalidFieldsForm.getByLabel("País do time").fill("Brasil");
  await invalidFieldsForm.getByRole("button", { name: "Salvar time" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await invalidFieldsForm.evaluate((element) => {
    element.querySelectorAll("[required]").forEach((field) => field.removeAttribute("required"));
  });
  await invalidFieldsForm.getByLabel("Nome do time").fill(invalidFieldsName);
  await invalidFieldsForm.getByLabel("País do time").fill("");
  await invalidFieldsForm.getByRole("button", { name: "Salvar time" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  const { data: invalidFieldsTeam } = await adminClient.from("teams").select("id").eq("name", invalidFieldsName).maybeSingle();
  expect(invalidFieldsTeam).toBeNull();
  await page.getByRole("button", { name: "Cancelar" }).click();

  const invalidName = `TESTE URL insegura ${suffix}`;
  await page.getByRole("button", { name: "Adicionar time" }).click();
  await page.getByLabel("Nome do time").fill(invalidName);
  await page.getByLabel("País do time").fill("Brasil");
  await page.getByLabel("Escudo").fill("http://inseguro.test/crest.png");
  await page.getByRole("button", { name: "Salvar time" }).click();
  await expect(page.getByRole("status")).toHaveText("Use uma URL HTTPS ou um caminho local seguro para o escudo.");
  const { data: rejectedTeam } = await adminClient.from("teams").select("id").eq("name", invalidName).maybeSingle();
  expect(rejectedTeam).toBeNull();
  await page.getByRole("button", { name: "Cancelar" }).click();

  const preservedName = `TESTE Preservar metadados ${suffix}`;
  const { data: preservedTeam, error: insertError } = await adminClient
    .from("teams")
    .insert({
      name: preservedName,
      official_name: `Nome oficial ${suffix}`,
      country_code: "BRA",
      country_name: "Brasil",
      team_type: "club",
      gender: "women",
      squad_type: "reserve",
      external_provider: "local-test",
      external_id: suffix,
      import_key: `local-preserve-${suffix}`,
      name_aliases: [`Alias ${suffix}`],
      shield_url: "https://crests.canalmix.test/preserved.svg",
      shield_status: "approved",
      shield_source_url: "https://source.test/crest",
      shield_license: "Public domain verified",
      source_data_name: "Fonte manual de teste",
      source_data_url: "https://source.test/team",
      source_data_license: "CC0",
      source_competition_key: `competition-${suffix}`,
      source_season_year: 2026,
      name_is_manual: false,
      catalog_note: `Nota ${suffix}`,
    })
    .select("id")
    .single();
  if (insertError || !preservedTeam) throw new Error("Não foi possível preparar os metadados locais de teste.");
  fixtureTeamIds.push(preservedTeam.id);
  await page.reload();
  const metadataColumns = "official_name, country_code, squad_type, external_provider, external_id, import_key, name_aliases, shield_status, shield_source_url, shield_license, source_data_name, source_data_url, source_data_license, source_competition_key, source_season_year, name_is_manual, catalog_note";
  const { data: beforeEdit, error: beforeError } = await adminClient
    .from("teams")
    .select(metadataColumns)
    .eq("id", preservedTeam.id)
    .single();
  expect(beforeError).toBeNull();

  await page.getByLabel("Buscar time por nome ou país").fill(preservedName);
  const row = page.locator(".admin-team-row").filter({ hasText: preservedName });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: `Editar ${preservedName}` }).click();
  const editForm = page.locator("form.admin-team-form");
  await expect(editForm.locator("input, select, textarea")).toHaveCount(5);
  await editForm.getByLabel("Nome do time").fill(`${preservedName} editado`);
  await editForm.getByRole("button", { name: "Salvar time" }).click();
  await expect(page.getByRole("status")).toHaveText("Time atualizado.");

  const { data: afterEdit, error: afterError } = await adminClient
    .from("teams")
    .select(metadataColumns)
    .eq("id", preservedTeam.id)
    .single();
  expect(afterError).toBeNull();
  expect(afterEdit).toEqual({ ...beforeEdit, name_is_manual: true });
});
