"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export function createSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Configure o Supabase antes de entrar no painel.");
  }

  return createBrowserClient<Database>(config.url, config.key);
}
