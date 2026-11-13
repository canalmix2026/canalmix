"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  channelInputSchema,
  isSafeHttpsUrl,
  slugifyChannelName,
} from "@/lib/channel-schema";
import { extractEmbedIframeSrc } from "@/lib/embed-code";
import {
  getProviderEmbedReferrerPolicy,
  getProviderEmbedSandbox,
} from "@/lib/embed-provider-policy.server";
import type { EmbedReferrerPolicy } from "@/lib/embed-provider-policy-core";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminActionResult = {
  success: boolean;
  message: string;
};

export type EmbedPreviewPolicyResult =
  | {
      success: true;
      sandbox: string | null;
      referrerPolicy: EmbedReferrerPolicy;
    }
  | { success: false; message: string };

async function getAuthorizedAdmin() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const user = userResult.user;
  if (userError || !user) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("catalog_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return null;
  }

  return { supabase, user };
}

export async function getAdminEmbedPreviewPolicyAction(
  embedUrl: string,
): Promise<EmbedPreviewPolicyResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }

  if (!isSafeHttpsUrl(embedUrl)) {
    return {
      success: false,
      message: "Use uma URL HTTPS válida, sem usuário ou senha.",
    };
  }

  return {
    success: true,
    sandbox: getProviderEmbedSandbox(embedUrl),
    referrerPolicy: getProviderEmbedReferrerPolicy(embedUrl),
  };
}

export async function saveCategoryAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }

  const rawId = formData.get("id");
  const idText = typeof rawId === "string" ? rawId.trim() : "";
  const id = idText ? Number(idText) : null;
  if (idText && (!Number.isSafeInteger(id) || id! < 1 || id! > 32767)) {
    return { success: false, message: "Categoria inválida." };
  }

  const parsedName = z
    .string()
    .trim()
    .min(1, "Informe o nome da categoria.")
    .max(60, "O nome da categoria deve ter no máximo 60 caracteres.")
    .safeParse(formData.get("name"));
  if (!parsedName.success) {
    return { success: false, message: parsedName.error.issues[0]?.message ?? "Confira o nome da categoria." };
  }

  const name = parsedName.data;
  const slug = slugifyChannelName(name);
  if (id !== null) {
    const { data: current, error: currentError } = await admin.supabase
      .from("categories")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (currentError || !current) {
      return { success: false, message: "A categoria não foi encontrada." };
    }
  }

  const { data: duplicate, error: duplicateError } = await admin.supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (duplicateError) {
    return { success: false, message: "Não foi possível validar a categoria." };
  }
  if (duplicate && duplicate.id !== id) {
    return { success: false, message: "Já existe uma categoria com esse nome." };
  }

  if (id !== null) {
    const { data, error } = await admin.supabase
      .from("categories")
      .update({ name, slug })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      if (error?.code === "23505") {
        return { success: false, message: "Já existe uma categoria com esse nome." };
      }
      console.error("Falha ao atualizar categoria:", error?.message);
      return { success: false, message: "Não foi possível atualizar a categoria." };
    }

    revalidateCatalog();
    return { success: true, message: "Categoria atualizada." };
  }

  const { error } = await admin.supabase
    .from("categories")
    .insert({ name, slug });
  if (error) {
    if (error.code === "23505") {
      return { success: false, message: "Já existe uma categoria com esse nome." };
    }
    console.error("Falha ao criar categoria:", error.message);
    return { success: false, message: "Não foi possível criar a categoria." };
  }

  revalidateCatalog();
  return { success: true, message: "Categoria criada." };
}

export async function deleteCategoryAction(
  categoryId: number,
): Promise<AdminActionResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }
  if (!Number.isSafeInteger(categoryId) || categoryId < 1 || categoryId > 32767) {
    return { success: false, message: "Categoria inválida." };
  }

  const { count, error: channelCountError } = await admin.supabase
    .from("channels")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);
  if (channelCountError) {
    console.error("Falha ao verificar canais da categoria:", channelCountError.message);
    return { success: false, message: "Não foi possível verificar os canais desta categoria." };
  }
  if ((count ?? 0) > 0) {
    return {
      success: false,
      message: "Mova os canais desta categoria para outra antes de excluí-la.",
    };
  }

  const { data, error } = await admin.supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23503") {
      return {
        success: false,
        message: "Mova os canais desta categoria para outra antes de excluí-la.",
      };
    }
    console.error("Falha ao excluir categoria:", error.message);
    return { success: false, message: "Não foi possível excluir a categoria." };
  }
  if (!data) {
    return { success: false, message: "A categoria não foi encontrada." };
  }

  revalidateCatalog();
  return { success: true, message: "Categoria excluída." };
}

async function findCategoryId(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  slug: string,
) {
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) {
    return null;
  }
  return data.id;
}

async function uniqueSlug(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  name: string,
) {
  const base = slugifyChannelName(name);
  let slug = base;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from("channels")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      return null;
    }
    if (!data) {
      return slug;
    }
    slug = base + "-" + suffix;
    suffix += 1;
  }
}

function revalidateCatalog(slug?: string) {
  revalidatePath("/");
  revalidatePath("/tv");
  revalidatePath("/admin/canais");
  if (slug) {
    revalidatePath("/canais/" + slug);
  }
}

export async function saveChannelAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }

  const submittedMode = formData.get("embedMode");
  if (
    submittedMode !== null &&
    submittedMode !== "url" &&
    submittedMode !== "code"
  ) {
    return { success: false, message: "Selecione um modo de embed válido." };
  }

  const embedMode = submittedMode ?? "url";
  const rawEmbedValues = formData.getAll(
    embedMode === "code" ? "embedCodes" : "embedUrls",
  );
  const embedUrls = embedMode === "code"
    ? rawEmbedValues.map((value) =>
        typeof value === "string" ? extractEmbedIframeSrc(value) : null,
      )
    : rawEmbedValues;

  if (
    embedMode === "code" &&
    (embedUrls.length === 0 || embedUrls.some((url) => url === null))
  ) {
    return {
      success: false,
      message: "Cole um único iframe com src HTTPS válido em cada opção.",
    };
  }

  const parsed = channelInputSchema.safeParse({
    name: formData.get("name"),
    categorySlug: formData.get("categorySlug"),
    embedUrls,
    thumbnailUrl: formData.get("thumbnailUrl"),
    officialUrl: formData.get("officialUrl"),
    published: formData.get("published") === "true",
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Confira os dados do canal.",
    };
  }

  const input = parsed.data;
  const categoryId = await findCategoryId(admin.supabase, input.categorySlug);
  if (!categoryId) {
    return { success: false, message: "Selecione uma categoria válida." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (id) {
    const { data: existing, error: existingError } = await admin.supabase
      .from("channels")
      .select("id, slug, is_published, published_at")
      .eq("id", id)
      .maybeSingle();

    if (existingError || !existing) {
      return { success: false, message: "O canal não foi encontrado." };
    }

    const publishedAt = input.published
      ? existing.published_at ?? new Date().toISOString()
      : existing.published_at;
    const { error } = await admin.supabase
      .from("channels")
      .update({
        name: input.name,
        category_id: categoryId,
        embed_urls: input.embedUrls,
        thumbnail_url: input.thumbnailUrl,
        official_url: input.officialUrl,
        is_published: input.published,
        published_at: publishedAt,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Falha ao atualizar canal:", error.message);
      return { success: false, message: "Não foi possível salvar as alterações." };
    }

    revalidateCatalog(existing.slug);
    return { success: true, message: "Canal atualizado." };
  }

  const slug = await uniqueSlug(admin.supabase, input.name);
  if (!slug) {
    return { success: false, message: "Não foi possível gerar um endereço para o canal." };
  }

  const { data, error } = await admin.supabase
    .from("channels")
    .insert({
      slug,
      name: input.name,
      category_id: categoryId,
      embed_urls: input.embedUrls,
      thumbnail_url: input.thumbnailUrl,
      official_url: input.officialUrl,
      is_published: input.published,
      published_at: input.published ? new Date().toISOString() : null,
      created_by: admin.user.id,
    })
    .select("id, slug")
    .single();

  if (error || !data) {
    console.error("Falha ao criar canal:", error?.message);
    return { success: false, message: "Não foi possível cadastrar o canal." };
  }

  revalidateCatalog(data.slug);
  return { success: true, message: "Canal cadastrado como " + (input.published ? "publicado." : "oculto.") };
}

export async function setChannelPublishedAction(
  id: string,
  published: boolean,
): Promise<AdminActionResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }

  const { data: current, error: currentError } = await admin.supabase
    .from("channels")
    .select("slug, published_at")
    .eq("id", id)
    .maybeSingle();

  if (currentError || !current) {
    return { success: false, message: "O canal não foi encontrado." };
  }

  const { error } = await admin.supabase
    .from("channels")
    .update({
      is_published: published,
      published_at: published ? new Date().toISOString() : current.published_at,
    })
    .eq("id", id);

  if (error) {
    console.error("Falha ao alterar publicação:", error.message);
    return { success: false, message: "Não foi possível alterar a publicação." };
  }

  revalidateCatalog(current.slug);
  return {
    success: true,
    message: published ? "Canal publicado." : "Canal ocultado.",
  };
}

export async function deleteChannelAction(
  id: string,
): Promise<AdminActionResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }

  const { data: current, error: currentError } = await admin.supabase
    .from("channels")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (currentError || !current) {
    return { success: false, message: "O canal não foi encontrado." };
  }

  const { error } = await admin.supabase
    .from("channels")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Falha ao excluir canal:", error.message);
    return { success: false, message: "Não foi possível excluir o canal." };
  }

  revalidateCatalog(current.slug);
  return { success: true, message: "Canal excluído." };
}

export async function logoutAdminAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
