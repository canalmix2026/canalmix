/* eslint-disable @typescript-eslint/no-require-imports -- This CommonJS helper is shared by the Playwright runner and the local provisioning command. */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();

function findValueByKey(value, acceptedNames) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      acceptedNames.includes(key.toLowerCase().replace(/[^a-z0-9]/g, "")) &&
      typeof child === "string"
    ) {
      return child;
    }
  }

  for (const child of Object.values(value)) {
    const nested = findValueByKey(child, acceptedNames);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function isLoopbackUrl(value) {
  try {
    const host = new URL(value).hostname;
    return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(host);
  } catch {
    return false;
  }
}

function readLocalSupabaseStatus() {
  let output;
  try {
    output = execSync(
      "npm exec -- supabase status --output json --network-id canal-mix-local",
      {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      },
    );
  } catch {
    throw new Error(
      "Não foi possível ler o Supabase local. Inicie o Docker e execute npm run supabase:start.",
    );
  }

  const jsonStart = output.indexOf("{");
  if (jsonStart < 0) {
    throw new Error("O CLI do Supabase não retornou o status local em JSON.");
  }

  let status;
  try {
    status = JSON.parse(output.slice(jsonStart));
  } catch {
    throw new Error("Não foi possível interpretar o status do Supabase local.");
  }

  const url =
    findValueByKey(status, ["apiurl", "url"]) ??
    (typeof status.api === "string" ? status.api : status.api?.url);
  const publishableKey = findValueByKey(status, [
    "publishablekey",
    "anonkey",
  ]);
  const serviceRoleKey = findValueByKey(status, ["servicerolekey"]);

  if (!url || !isLoopbackUrl(url)) {
    throw new Error(
      "O Supabase precisa estar iniciado e usar um endereço local (localhost ou 127.0.0.1).",
    );
  }

  return { url, publishableKey, serviceRoleKey };
}

function updateEnvValue(contents, key, value) {
  const expression = new RegExp("^" + key + "=.*$", "m");
  const line = key + "=" + value;
  return expression.test(contents)
    ? contents.replace(expression, line)
    : contents.trimEnd() + "\n" + line + "\n";
}

function writeLocalEnv() {
  const status = readLocalSupabaseStatus();
  if (!status.publishableKey) {
    throw new Error("O CLI não forneceu a chave pública do Supabase local.");
  }

  const envPath = path.join(projectRoot, ".env.local");
  let contents = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "# Configuração do Supabase local do CanalMix\n";
  contents = updateEnvValue(
    contents,
    "NEXT_PUBLIC_SUPABASE_URL",
    status.url,
  );
  contents = updateEnvValue(
    contents,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    status.publishableKey,
  );
  fs.writeFileSync(envPath, contents, "utf8");
  process.stdout.write(
    "Arquivo .env.local atualizado com a URL e a chave pública locais.\n",
  );
}

if (process.argv.includes("--sync-env")) {
  try {
    writeLocalEnv();
  } catch (error) {
    process.stderr.write(
      (error instanceof Error
        ? error.message
        : "Falha ao configurar o Supabase local.") + "\n",
    );
    process.exitCode = 1;
  }
}

module.exports = { isLoopbackUrl, readLocalSupabaseStatus };
