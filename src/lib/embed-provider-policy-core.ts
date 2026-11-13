export const DEFAULT_EMBED_SANDBOX: string | null = null;
export const DEFAULT_EMBED_REFERRER_POLICY =
  "strict-origin-when-cross-origin" as const;

export type EmbedReferrerPolicy =
  | "no-referrer"
  | typeof DEFAULT_EMBED_REFERRER_POLICY;

export type EmbedProviderReferrerOverrides = Readonly<
  Record<string, EmbedReferrerPolicy>
>;

export type EmbedSandboxToken =
  | "allow-downloads"
  | "allow-forms"
  | "allow-modals"
  | "allow-orientation-lock"
  | "allow-pointer-lock"
  | "allow-popups"
  | "allow-popups-to-escape-sandbox"
  | "allow-presentation"
  | "allow-same-origin"
  | "allow-scripts"
  | "allow-storage-access-by-user-activation"
  | "allow-top-navigation"
  | "allow-top-navigation-by-user-activation"
  | "allow-top-navigation-to-custom-protocols";

export type EmbedProviderOverrides = Readonly<
  Record<string, readonly EmbedSandboxToken[] | null>
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

/**
 * Resolves a policy for an exact hostname. The default omits the sandbox
 * attribute. `null` also means omit it; an empty token array returns
 * `sandbox=""` and keeps all sandbox limits.
 */
export function resolveEmbedSandbox(
  embedUrl: string,
  providerOverrides: EmbedProviderOverrides,
) {
  let hostname: string;
  try {
    const url = new URL(embedUrl);
    if (url.protocol !== "https:") {
      return DEFAULT_EMBED_SANDBOX;
    }
    hostname = url.hostname.toLowerCase();
  } catch {
    return DEFAULT_EMBED_SANDBOX;
  }

  if (!Object.prototype.hasOwnProperty.call(providerOverrides, hostname)) {
    return DEFAULT_EMBED_SANDBOX;
  }

  const providerTokens = providerOverrides[hostname];
  return providerTokens === null ? null : providerTokens.join(" ");
}
