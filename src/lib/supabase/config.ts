export type SupabaseConfig = {
  url: string;
  key: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const localHosts = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
    const isLocal = localHosts.has(parsed.hostname);

    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }

    if (isLocal) {
      if (
        process.env.NODE_ENV === "production" ||
        (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      ) {
        return null;
      }
    } else if (
      parsed.protocol !== "https:" ||
      parsed.port ||
      !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname)
    ) {
      return null;
    }

    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}
