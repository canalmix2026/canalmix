import "server-only";
import {
  resolveEmbedReferrerPolicy,
  resolveEmbedSandbox,
  type EmbedProviderReferrerOverrides,
  type EmbedProviderOverrides,
} from "@/lib/embed-provider-policy-core";

// The default omits sandbox for every HTTPS embed, including newly added
// channels. Keep provider overrides server-side for explicit exceptions.
const PROVIDER_SANDBOX_OVERRIDES: EmbedProviderOverrides = {};
const PROVIDER_REFERRER_OVERRIDES: EmbedProviderReferrerOverrides = {
  // RD Embed rejects embeds that send the local site's Referer header.
  "v1.rdembed.lat": "no-referrer",
  "v2.rdembed.sbs": "no-referrer",
};

export function getProviderEmbedSandbox(embedUrl: string) {
  return resolveEmbedSandbox(embedUrl, PROVIDER_SANDBOX_OVERRIDES);
}

export function getProviderEmbedReferrerPolicy(embedUrl: string) {
  return resolveEmbedReferrerPolicy(embedUrl, PROVIDER_REFERRER_OVERRIDES);
}
