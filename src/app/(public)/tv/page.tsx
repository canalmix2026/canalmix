import { TvIptvInterface } from "@/components/tv-iptv-interface";
import { PublicInspectionShortcutGuard } from "@/components/public-inspection-shortcut-guard";
import { getPublishedCatalog } from "@/lib/channels";
import { getProviderEmbedReferrerPolicy } from "@/lib/embed-provider-policy.server";

export const dynamic = "force-dynamic";

export default async function TvPage() {
  const catalog = await getPublishedCatalog();
  const referrerPoliciesByChannel = Object.fromEntries(
    catalog.channels.map((channel) => [
      channel.id,
      channel.embedUrls.map(getProviderEmbedReferrerPolicy),
    ]),
  );

  return (
    <>
      <PublicInspectionShortcutGuard />
      <TvIptvInterface
        channels={catalog.channels}
        categories={catalog.categories}
        status={catalog.status}
        referrerPoliciesByChannel={referrerPoliciesByChannel}
      />
    </>
  );
}
