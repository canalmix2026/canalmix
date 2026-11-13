"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminLoginForm({ accessDenied }: { accessDenied: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const data = new FormData(event.currentTarget);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: String(data.get("email") ?? "").trim(),
          password: String(data.get("password") ?? ""),
        });

      if (signInError || !authData.user) {
        setError("E-mail ou senha inválidos.");
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("catalog_admins")
        .select("user_id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (membershipError || !membership) {
        await supabase.auth.signOut();
        setError("Esta conta não tem permissão para acessar o painel.");
        return;
      }

      router.replace("/admin/canais");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao Supabase.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label htmlFor="admin-email">E-mail</label>
      <input
        autoComplete="username"
        id="admin-email"
        name="email"
        required
        type="email"
      />
      <label htmlFor="admin-password">Senha</label>
      <input
        autoComplete="current-password"
        id="admin-password"
        name="password"
        required
        type="password"
      />
      {(error || accessDenied) && (
        <p className="form-error" role="alert">
          {error || "Esta conta não tem permissão para acessar o painel."}
        </p>
      )}
      <button className="primary-button login-form__submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar no painel"}
      </button>
    </form>
  );
}
