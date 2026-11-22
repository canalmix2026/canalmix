import { z } from "zod";

export function isSafeHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
}

export function normalizeSafeHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname ||
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.href.length > 2048
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export function isSafeHttpUrl(value: string) {
  return normalizeSafeHttpUrl(value) !== null;
}

const httpsUrl = z
  .string()
  .trim()
  .min(1, "Informe uma URL.")
  .max(2048, "A URL deve ter no máximo 2048 caracteres.")
  .refine(isSafeHttpsUrl, "Use uma URL HTTPS válida, sem usuário ou senha.");

const optionalHttpsUrl = z
  .string()
  .trim()
  .max(2048, "A URL deve ter no máximo 2048 caracteres.")
  .refine(
    (value) => value.length === 0 || isSafeHttpsUrl(value),
    "Use uma URL HTTPS válida, sem usuário ou senha.",
  )
  .transform((value) => (value.length === 0 ? null : value));

export const channelInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(80, "O nome deve ter no máximo 80 caracteres."),
  categorySlug: z.string().trim().min(1, "Selecione uma categoria."),
  embedUrls: z
    .array(httpsUrl)
    .min(1, "Adicione ao menos uma opção de player."),
  thumbnailUrl: optionalHttpsUrl,
  officialUrl: optionalHttpsUrl,
  published: z.boolean(),
});

export type ChannelInput = z.infer<typeof channelInputSchema>;

export const channelProfileInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(80, "O nome deve ter no m\u00e1ximo 80 caracteres."),
  categorySlug: z.string().trim().min(1, "Selecione uma categoria."),
  thumbnailUrl: optionalHttpsUrl,
  officialUrl: optionalHttpsUrl,
  published: z.boolean(),
});

export type ChannelProfileInput = z.infer<typeof channelProfileInputSchema>;

export function slugifyChannelName(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "canal";
}
