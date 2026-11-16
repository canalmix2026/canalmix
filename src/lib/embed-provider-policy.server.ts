import "server-only";
import {
  resolveEmbedReferrerPolicy,
  type EmbedProviderReferrerOverrides,
} from "@/lib/embed-provider-policy-core";

const PROVIDER_REFERRER_OVERRIDES: EmbedProviderReferrerOverrides = {
  // RD Embed rejects embeds that send the local site's Referer header.
  "v1.rdembed.lat": "no-referrer",
  "v2.rdembed.sbs": "no-referrer",
};

export function getProviderEmbedReferrerPolicy(embedUrl: string) {
  return resolveEmbedReferrerPolicy(embedUrl, PROVIDER_REFERRER_OVERRIDES);
}
