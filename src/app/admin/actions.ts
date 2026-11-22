"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  channelProfileInputSchema,
  isSafeHttpUrl,
  isSafeHttpsUrl,
  normalizeSafeHttpUrl,
  slugifyChannelName,
} from "@/lib/channel-schema";
import { parseEmbedIframeCode } from "@/lib/embed-code";
import type { ChannelEmbedSource } from "@/lib/channel-embed-sources";
import { getChannelEmbedSourceUrl } from "@/lib/channel-embed-sources";
import { getProviderEmbedReferrerPolicy } from "@/lib/embed-provider-policy.server";
import type { EmbedReferrerPolicy } from "@/lib/embed-provider-policy-core";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeYouTubeVideoUrl } from "@/lib/youtube-video";

export type AdminActionResult = {
  success: boolean;
  message: string;
};

export type EmbedPreviewPolicyResult =
  | {
      success: true;
      referrerPolicy: EmbedReferrerPolicy;
    }
  | { success: false; message: string };

const gameBroadcastInputSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  countryCode: z.string().regex(/^[A-Z0-9_-]{2,16}$/),
  countryName: z.string().trim().min(2).max(60),
  broadcasterName: z.string().trim().min(2).max(100),
  channelId: z.string().uuid().nullable(),
  youtubeVideoUrl: z.string().trim().max(2048).default("").transform((value, context) => {
    if (!value) return null;
    const normalized = normalizeYouTubeVideoUrl(value);
    if (!normalized) {
      context.addIssue({ code: "custom", message: "Cole um link válido de vídeo ou transmissão do YouTube." });
      return z.NEVER;
    }
    return normalized;
  }),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(29),
});

const gameInputSchema = z.object({
  id: z.string().uuid().nullable(),
  homeTeam: z.string().trim().min(2).max(80),
  awayTeam: z.string().trim().min(2).max(80),
  homeTeamId: z.string().uuid().nullable().optional(),
  awayTeamId: z.string().uuid().nullable().optional(),
  competitionName: z.string().trim().min(2).max(120),
  competitionCountryCode: z.string().regex(/^[A-Z0-9_-]{2,16}$/),
  competitionCountryName: z.string().trim().min(2).max(60),
  startsAt: z.string().datetime({ offset: true }),
  broadcasts: z.array(gameBroadcastInputSchema).max(30),
  homeTeamProvider: z.string().trim().min(2).max(60).nullable().optional(),
  homeTeamExternalId: z.string().trim().min(1).max(128).nullable().optional(),
  awayTeamProvider: z.string().trim().min(2).max(60).nullable().optional(),
  awayTeamExternalId: z.string().trim().min(1).max(128).nullable().optional(),
  externalProvider: z.string().trim().max(60).nullable().optional(),
  externalId: z.string().trim().max(128).nullable().optional(),
  sourceUrls: z.array(
    z.string().trim().max(2048).refine(isSafeHttpsUrl, "Use uma fonte HTTPS válida."),
  ).max(10),
}).superRefine((game, context) => {
  if (Boolean(game.externalProvider?.trim()) !== Boolean(game.externalId?.trim())) {
    context.addIssue({
      code: "custom",
      path: ["externalId"],
      message: "Preencha o provedor e o ID externo da partida juntos.",
    });
  }
});

const teamInputSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(2).max(80),
  countryName: z.string().trim().min(2).max(80),
  teamType: z.enum(["club", "national_team"]),
  gender: z.enum(["men", "women"]),
  shieldUrl: z.string().trim().max(2048),
});

export async function resolveStreamIssueSourceAction(
  channelId: string,
  sourceId: string,
): Promise<AdminActionResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }
  if (!z.string().uuid().safeParse(channelId).success || !z.string().uuid().safeParse(sourceId).success) {
    return { success: false, message: "Opção de transmissão inválida." };
  }

  const { data, error } = await admin.supabase
    .from("stream_issue_report_options")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: admin.user.id,
    })
    .eq("channel_id", channelId)
    .eq("source_id", sourceId)
    .eq("status", "pending")
    .select("id");

  if (error) {
    console.error("Falha ao resolver relatos da opção:", error.code);
    return { success: false, message: "Não foi possível resolver os relatos agora." };
  }
  if (!data?.length) {
    return { success: false, message: "Esta opção não tem relatos pendentes." };
  }

  revalidatePath("/admin/problemas");
  revalidatePath("/admin/canais");
  return { success: true, message: "Relatos desta opção marcados como resolvidos." };
}

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

  if (!isSafeHttpUrl(embedUrl)) {
    return {
      success: false,
      message: "Use uma URL HTTP ou HTTPS válida, sem usuário ou senha.",
    };
  }

  return {
    success: true,
    referrerPolicy: getProviderEmbedReferrerPolicy(embedUrl),
  };
}

export async function updateChannelSourceAction(
  channelId: string,
  sourceId: string,
  operation: "move-up" | "move-down" | "hide" | "reactivate",
): Promise<AdminActionResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }
  if (
    !z.string().uuid().safeParse(channelId).success ||
    !z.string().uuid().safeParse(sourceId).success ||
    !["move-up", "move-down", "hide", "reactivate"].includes(operation)
  ) {
    return { success: false, message: "Fonte de transmissão inválida." };
  }

  const { data: channel, error: readError } = await admin.supabase
    .from("channels")
    .select("slug, embed_sources")
    .eq("id", channelId)
    .maybeSingle();
  if (readError || !channel) {
    return { success: false, message: "O canal não foi encontrado." };
  }

  const sources = channel.embed_sources as unknown as ChannelEmbedSource[];
  const sourceIndex = sources.findIndex((source) => source.id === sourceId);
  if (sourceIndex < 0) {
    return { success: false, message: "Esta fonte não pertence mais ao canal." };
  }

  const nextSources = [...sources];
  if (operation === "move-up" || operation === "move-down") {
    const nextIndex = sourceIndex + (operation === "move-up" ? -1 : 1);
    if (nextIndex < 0 || nextIndex >= nextSources.length) {
      return { success: false, message: "A fonte já está no limite dessa ordem." };
    }
    [nextSources[sourceIndex], nextSources[nextIndex]] = [nextSources[nextIndex], nextSources[sourceIndex]];
  } else {
    nextSources[sourceIndex] = {
      ...nextSources[sourceIndex],
      active: operation === "reactivate",
    };
  }

  const { error: updateError } = await admin.supabase
    .from("channels")
    .update({ embed_sources: nextSources as never })
    .eq("id", channelId);
  if (updateError) {
    console.error("Falha ao atualizar fonte do canal:", updateError.message);
    return { success: false, message: "Não foi possível atualizar esta fonte." };
  }

  revalidateCatalog(channel.slug);
  return {
    success: true,
    message:
      operation === "hide"
        ? "Opção ocultada do catálogo público."
        : operation === "reactivate"
          ? "Opção reativada no catálogo público."
          : "Ordem da opção atualizada.",
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

export async function setCategoryActiveAction(
  categoryId: number,
  active: boolean,
): Promise<AdminActionResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }
  if (!Number.isSafeInteger(categoryId) || categoryId < 1 || categoryId > 32767) {
    return { success: false, message: "Categoria inválida." };
  }

  const { data, error } = await admin.supabase
    .from("categories")
    .update({ is_active: active })
    .eq("id", categoryId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("Falha ao alterar categoria:", error?.code);
    return { success: false, message: "Não foi possível alterar a categoria." };
  }

  revalidateCatalog();
  revalidatePath("/admin/categorias");
  return {
    success: true,
    message: active ? "Categoria reativada no catálogo." : "Categoria ocultada do catálogo.",
  };
}

export async function deleteCategoryAction(
  categoryId: number,
  transferToCategoryId?: number,
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
    if (
      !Number.isSafeInteger(transferToCategoryId) ||
      transferToCategoryId! < 1 ||
      transferToCategoryId! > 32767 ||
      transferToCategoryId === categoryId
    ) {
      return { success: false, message: "Selecione outra categoria para transferir os canais antes de excluir." };
    }
    const { data: destination, error: destinationError } = await admin.supabase
      .from("categories")
      .select("id, is_active")
      .eq("id", transferToCategoryId!)
      .maybeSingle();
    if (destinationError || !destination || !destination.is_active) {
      return { success: false, message: "Selecione uma categoria de destino ativa." };
    }

    const { error: transferError } = await admin.supabase
      .from("channels")
      .update({ category_id: transferToCategoryId! })
      .eq("category_id", categoryId);
    if (transferError) {
      console.error("Falha ao transferir canais da categoria:", transferError.code);
      return { success: false, message: "Não foi possível transferir os canais desta categoria." };
    }
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
  revalidatePath("/admin/categorias");
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
  revalidatePath("/grade");
  revalidatePath("/admin/canais");
  revalidatePath("/admin/categorias");
  revalidatePath("/admin/grade");
  revalidatePath("/admin/times");
  revalidatePath("/admin/problemas");
  if (slug) {
    revalidatePath("/canais/" + slug);
  }
}

export async function saveGameAction(
  input: unknown,
): Promise<AdminActionResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }

  const parsed = gameInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Confira os dados do jogo.",
    };
  }

  const game = parsed.data;
  const rpcValues = {
    p_game_id: game.id,
    p_home_team: game.homeTeam,
    p_away_team: game.awayTeam,
    p_competition_name: game.competitionName,
    p_competition_country_code: game.competitionCountryCode,
    p_competition_country_name: game.competitionCountryName,
    p_starts_at: new Date(game.startsAt).toISOString(),
    p_broadcasts: game.broadcasts.map((broadcast) => ({
      id: broadcast.id ?? null,
      countryCode: broadcast.countryCode,
      countryName: broadcast.countryName,
      broadcasterName: broadcast.broadcasterName,
      channelId: broadcast.channelId,
      youtubeVideoUrl: broadcast.youtubeVideoUrl,
      isPrimary: broadcast.isPrimary,
      sortOrder: broadcast.sortOrder,
    })),
    p_home_team_provider: game.homeTeamProvider ?? null,
    p_home_team_external_id: game.homeTeamExternalId ?? null,
    p_away_team_provider: game.awayTeamProvider ?? null,
    p_away_team_external_id: game.awayTeamExternalId ?? null,
    p_external_provider: game.externalProvider?.trim() || null,
    p_external_id: game.externalId?.trim() || null,
    p_source_urls: game.sourceUrls,
  };
  const { error } = await admin.supabase.rpc("save_game_with_youtube_metadata", {
    ...rpcValues,
    p_home_team_id: game.homeTeamId ?? null,
    p_away_team_id: game.awayTeamId ?? null,
  });

  if (error) {
    console.error("Falha ao salvar jogo:", error.code);
    return {
      success: false,
      message: error.code === "P0002"
        ? "O jogo não foi encontrado. Atualize a lista e tente novamente."
        : "Não foi possível salvar o jogo.",
    };
  }

  revalidatePath("/admin/grade");
  revalidatePath("/grade");
  revalidatePath("/");
  revalidatePath("/tv");
  return { success: true, message: game.id ? "Jogo atualizado." : "Jogo cadastrado como não publicado." };
}

function isSafeShieldUrl(value: string) {
  if (isSafeHttpsUrl(value)) return true;
  if (!value.startsWith("/") || value.startsWith("//") || !/^\/[A-Za-z0-9._~/-]+$/.test(value)) {
    return false;
  }
  const segments = value.slice(1).split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..")
    && /\.(svg|png|jpe?g|webp|gif|avif)$/i.test(value);
}

export async function saveTeamAction(input: unknown): Promise<AdminActionResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }

  const parsed = teamInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Confira os dados do time.",
    };
  }
  const team = parsed.data;
  const shieldUrl = team.shieldUrl.trim() || null;
  if (shieldUrl && !isSafeShieldUrl(shieldUrl)) {
    return { success: false, message: "Use uma URL HTTP ou HTTPS ou um caminho local seguro para o escudo." };
  }

  let existing: {
    name: string;
    name_is_manual: boolean;
    country_code: string | null;
    country_name: string | null;
    shield_url: string | null;
  } | null = null;
  if (team.id) {
    const { data, error } = await admin.supabase
      .from("teams")
      .select("id, name, name_is_manual, country_code, country_name, shield_url")
      .eq("id", team.id)
      .maybeSingle();
    if (error) {
      return { success: false, message: "Não foi possível carregar o time para edição." };
    }
    if (!data) return { success: false, message: "O time não foi encontrado." };
    existing = data;
  }

  const sameCountry = existing?.country_name?.trim().toLocaleLowerCase("pt-BR")
    === team.countryName.toLocaleLowerCase("pt-BR");
  let countryCode = sameCountry ? existing?.country_code ?? null : null;
  if (!countryCode) {
    const { data: matchingCountries } = await admin.supabase
      .from("teams")
      .select("country_code")
      .eq("country_name", team.countryName)
      .not("country_code", "is", null)
      .limit(3);
    const codes = [...new Set((matchingCountries ?? [])
      .map((row) => row.country_code)
      .filter((code): code is string => Boolean(code)))];
    if (codes.length === 1) countryCode = codes[0];
  }
  if (!countryCode && team.countryName.toLocaleLowerCase("pt-BR") === "singapura") {
    countryCode = "SGP";
  }

  const result = team.id
    ? await admin.supabase
      .from("teams")
      .update({
        name: team.name,
        ...(existing && existing.name !== team.name ? { name_is_manual: true } : {}),
        country_code: countryCode,
        country_name: team.countryName,
        team_type: team.teamType,
        gender: team.gender,
        shield_url: shieldUrl,
        ...(existing && existing.shield_url !== shieldUrl ? { shield_status: "pending" as const } : {}),
      })
      .eq("id", team.id)
      .select("id")
      .maybeSingle()
    : await admin.supabase
      .from("teams")
      .insert({
        name: team.name,
        official_name: team.name,
        country_code: countryCode,
        country_name: team.countryName,
        team_type: team.teamType,
        gender: team.gender,
        squad_type: "first",
        shield_url: shieldUrl,
        shield_status: "pending",
        name_is_manual: true,
      })
      .select("id")
      .single();

  if (result.error) {
    console.error("Falha ao salvar time:", result.error.code);
    return {
      success: false,
      message: result.error.code === "23505"
        ? "Já existe um time com essa identidade, ID externo ou chave de importação."
        : "Não foi possível salvar o time.",
    };
  }
  if (!result.data) {
    return { success: false, message: "O time não foi encontrado." };
  }

  revalidatePath("/admin/times");
  revalidatePath("/admin/grade");
  revalidatePath("/grade");
  revalidatePath("/");
  revalidatePath("/tv");
  return { success: true, message: team.id ? "Time atualizado." : "Time cadastrado." };
}

export async function setGamePublishedAction(
  gameId: string,
  published: boolean,
): Promise<AdminActionResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }
  if (!z.string().uuid().safeParse(gameId).success || typeof published !== "boolean") {
    return { success: false, message: "Jogo inválido." };
  }

  const { data: game, error: currentError } = await admin.supabase
    .from("games")
    .select("id, published_at")
    .eq("id", gameId)
    .maybeSingle();
  if (currentError || !game) {
    return { success: false, message: "O jogo não foi encontrado." };
  }

  const { error } = await admin.supabase
    .from("games")
    .update({
      is_published: published,
      published_at: published ? game.published_at ?? new Date().toISOString() : game.published_at,
    })
    .eq("id", gameId);
  if (error) {
    console.error("Falha ao alterar publicação do jogo:", error.code);
    return { success: false, message: "Não foi possível alterar a publicação do jogo." };
  }

  revalidatePath("/admin/grade");
  revalidatePath("/grade");
  revalidatePath("/");
  revalidatePath("/tv");
  return { success: true, message: published ? "Jogo publicado." : "Jogo despublicado." };
}

export async function saveChannelAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return { success: false, message: "Acesso administrativo necessário." };
  }

  const parsed = channelProfileInputSchema.safeParse({
    name: formData.get("name"),
    categorySlug: formData.get("categorySlug"),
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

  const rawSources = formData.get("embedSources");
  if (typeof rawSources !== "string" || rawSources.length > 500_000) {
    return { success: false, message: "Adicione opções de player válidas." };
  }
  let submittedSources: unknown;
  try {
    submittedSources = JSON.parse(rawSources);
  } catch {
    return { success: false, message: "Os dados das opções são inválidos." };
  }

  const sourceDraftSchema = z.object({
    id: z.string().uuid(),
    isNew: z.boolean(),
    type: z.enum(["direct-url", "iframe-url", "iframe-code"]),
    active: z.boolean(),
    url: z.string().max(2048),
    iframeCode: z.string().max(10_000),
  });
  const draftsResult = z.array(sourceDraftSchema).min(1).max(32).safeParse(submittedSources);
  if (!draftsResult.success) {
    return { success: false, message: "Confira as opções de player e tente novamente." };
  }
  const drafts = draftsResult.data;
  const seenIds = new Set<string>();
  for (const draft of drafts) {
    if (seenIds.has(draft.id)) {
      return { success: false, message: "Cada opção precisa ter um identificador único." };
    }
    seenIds.add(draft.id);
  }

  const channelId = String(formData.get("id") ?? "").trim();
  let existing: {
    id: string;
    slug: string;
    is_published: boolean;
    published_at: string | null;
    embed_sources: unknown;
  } | null = null;
  if (channelId) {
    const { data, error } = await admin.supabase
      .from("channels")
      .select("id, slug, is_published, published_at, embed_sources")
      .eq("id", channelId)
      .maybeSingle();
    if (error || !data) {
      return { success: false, message: "O canal não foi encontrado." };
    }
    existing = data;
  }

  const existingSources = (existing?.embed_sources ?? []) as ChannelEmbedSource[];
  const existingById = new Map(existingSources.map((source) => [source.id, source]));
  const sources: ChannelEmbedSource[] = [];
  for (const draft of drafts) {
    const previous = existingById.get(draft.id);
    if (existing && !previous && !draft.isNew) {
      return { success: false, message: "Uma opção enviada não pertence mais a este canal." };
    }

    let content: ChannelEmbedSource["content"];
    if (draft.type === "iframe-code") {
      const iframe = parseEmbedIframeCode(draft.iframeCode);
      if (!iframe) {
        return {
          success: false,
          message: `O iframe da opção ${sources.length + 1} é inválido. Use somente src, title, allow e allowfullscreen, com src HTTP ou HTTPS.`,
        };
      }
      content = {
        src: iframe.src,
        ...(iframe.title ? { title: iframe.title } : {}),
        ...(iframe.allow ? { allow: iframe.allow } : {}),
        ...(iframe.allowFullscreen ? { allowFullscreen: true } : {}),
      };
    } else {
      const url = normalizeSafeHttpUrl(draft.url);
      if (!url) {
        return {
          success: false,
          message: `Informe uma URL HTTP ou HTTPS válida na opção ${sources.length + 1}, sem usuário ou senha.`,
        };
      }
      content = { url };
    }

    const unchanged = previous && previous.type === draft.type &&
      JSON.stringify(previous.content) === JSON.stringify(content);
    sources.push({
      id: draft.id,
      type: draft.type,
      content: unchanged ? previous.content : content,
      active: previous?.active ?? draft.active,
    });
  }

  const input = parsed.data;
  const categoryId = await findCategoryId(admin.supabase, input.categorySlug);
  if (!categoryId) {
    return { success: false, message: "Selecione uma categoria válida." };
  }

  if (existing) {
    const publishedAt = input.published
      ? existing.published_at ?? new Date().toISOString()
      : existing.published_at;
    const { error } = await admin.supabase
      .from("channels")
      .update({
        name: input.name,
        category_id: categoryId,
        embed_sources: sources as never,
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
      embed_sources: sources as never,
      embed_urls: sources.map(getChannelEmbedSourceUrl),
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
  return {
    success: true,
    message: "Canal cadastrado como " + (input.published ? "publicado." : "oculto."),
  };
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
