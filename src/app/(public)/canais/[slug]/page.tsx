import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ChannelReturnLink } from "@/components/channel-return-link";
import { ChannelPlayer } from "@/components/channel-player";
import { ChannelLocalActions } from "@/components/channel-local-actions";
import { getProviderEmbedReferrerPolicy } from "@/lib/embed-provider-policy.server";
import { getPublishedChannelBySlug } from "@/lib/channels";

export const dynamic = "force-dynamic";

type ChannelPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    from?: string;
    voltar?: string;
    origem?: string;
    categoria?: string;
    busca?: string;
  }>;
};

export default async function ChannelPage({
  params,
  searchParams,
}: ChannelPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const channel = await getPublishedChannelBySlug(slug);

  if (!channel) {
    notFound();
  }

  const fromTv = query.from === "tv";
  const preferHistory = query.voltar === "historico";
  const fromPersonalList = query.origem === "favorites" || query.origem === "history";
  const catalogPath = fromTv ? "/tv" : "/";
  const backHref = fromPersonalList
    ? catalogPath + "?foco=" + encodeURIComponent(channel.slug)
    : catalogPath +
      (query.busca
        ? "?busca=" + encodeURIComponent(query.busca) + "&"
        : "?categoria=" + encodeURIComponent(query.categoria ?? channel.categorySlug) + "&") +
      "foco=" +
      encodeURIComponent(channel.slug);

  return (
    <>
      <SiteHeader tv={fromTv} />
      <main className="channel-page">
        <ChannelReturnLink
          className="back-link channel-page__back"
          href={backHref}
          preferHistory={preferHistory}
        >
          <ArrowLeft aria-hidden="true" size={19} />
          <span>Voltar ao catálogo</span>
        </ChannelReturnLink>

        <header className="channel-page__heading">
          <p className="channel-page__category">{channel.categoryName}</p>
          <h1>{channel.name}</h1>
        </header>

        <ChannelPlayer
          channelId={channel.id}
          channelName={channel.name}
          officialUrl={channel.officialUrl}
          embedUrls={channel.embedUrls}
          embedSources={channel.embedSources}
          embedSourceIds={channel.embedSourceIds}
          referrerPolicies={channel.embedUrls.map(
            getProviderEmbedReferrerPolicy,
          )}
          tvMode={fromTv}
          returnOnEscape={fromTv || preferHistory}
        />

        <div className="channel-player__actions">
          <ChannelLocalActions channelId={channel.id} />
          <ChannelReturnLink
            className="secondary-button"
            href={backHref}
            preferHistory={preferHistory}
          >
            <ArrowLeft aria-hidden="true" size={18} />
            Voltar ao catálogo
          </ChannelReturnLink>
          {channel.officialUrl && (
            <a
              className="primary-button"
              href={channel.officialUrl}
              target="_blank"
              data-canalmix-allow-external="true"
              rel="noopener noreferrer"
            >
              <ExternalLink aria-hidden="true" size={18} />
              Abrir no site oficial
            </a>
          )}
        </div>
      </main>
    </>
  );
}
