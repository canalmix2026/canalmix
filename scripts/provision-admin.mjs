import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { stderr, stdin, stdout } from "node:process";
import statusHelper from "./local-supabase.cjs";

const { readLocalSupabaseStatus } = statusHelper;

const prompt = createInterface({ input: stdin, output: stdout });

async function hiddenQuestion(message) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error(
      "Execute este comando em um terminal interativo para ocultar a senha.",
    );
  }

  prompt.pause();
  stdout.write(message);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";

    function finish(error) {
      stdin.setRawMode(false);
      stdin.off("data", onData);
      stdout.write("\n");
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    }

    function onData(buffer) {
      const input = buffer.toString("utf8");
      for (const character of input) {
        if (character === "\u0003") {
          finish(new Error("Provisionamento cancelado."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
        } else {
          value += character;
        }
      }
    }

    stdin.on("data", onData);
  });
}

try {
  const status = readLocalSupabaseStatus();
  if (!status.serviceRoleKey) {
    throw new Error("O CLI não forneceu a chave administrativa local.");
  }

  const email = (await prompt.question("E-mail do primeiro administrador: "))
    .trim()
    .toLowerCase();
  const password = await hiddenQuestion("Senha (mínimo 10 caracteres): ");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Informe um endereço de e-mail válido.");
  }
  if (password.length < 10) {
    throw new Error("Use uma senha com pelo menos 10 caracteres.");
  }

  const supabase = createClient(status.url, status.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(
      error?.message ?? "Não foi possível criar a conta no Supabase local.",
    );
  }

  const { error: membershipError } = await supabase
    .from("catalog_admins")
    .insert({ user_id: data.user.id });

  if (membershipError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error("Não foi possível autorizar a conta no catálogo local.");
  }

  stdout.write(
    "Administrador local criado e autorizado. Entre em http://127.0.0.1:3000/admin/login.\n",
  );
} catch (error) {
  stderr.write(
    (error instanceof Error ? error.message : "Falha ao provisionar administrador.") +
      "\n",
  );
  process.exitCode = 1;
} finally {
  prompt.close();
}
