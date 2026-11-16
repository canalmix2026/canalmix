export const DEFAULT_EMBED_REFERRER_POLICY =
  "strict-origin-when-cross-origin" as const;

export type EmbedReferrerPolicy =
  | "no-referrer"
  | typeof DEFAULT_EMBED_REFERRER_POLICY;

export type EmbedProviderReferrerOverrides = Readonly<
  Record<string, EmbedReferrerPolicy>
>;

export function resolveEmbedReferrerPolicy(
  embedUrl: string,
  providerOverrides: EmbedProviderReferrerOverrides,
): EmbedReferrerPolicy {
  try {
    const url = new URL(embedUrl);
    if (url.protocol !== "https:") {
      return DEFAULT_EMBED_REFERRER_POLICY;
    }

    return (
      providerOverrides[url.hostname.toLowerCase()] ??
      DEFAULT_EMBED_REFERRER_POLICY
    );
  } catch {
    return DEFAULT_EMBED_REFERRER_POLICY;
  }
}
