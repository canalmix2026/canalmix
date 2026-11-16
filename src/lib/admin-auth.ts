import "server-only";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdminPage() {
  if (!getSupabaseConfig()) {
    redirect("/admin/login");
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/admin/login");
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    redirect("/admin/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("catalog_admins")
    .select("user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (membershipError || !membership) {
    redirect("/admin/login?erro=permissao");
  }

  return { supabase, user: authData.user };
}
