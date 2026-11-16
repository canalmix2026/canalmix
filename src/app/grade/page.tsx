import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ChannelReturnLink } from "@/components/channel-return-link";
import { PublicGameSchedule } from "@/components/public-game-schedule";
import { TvScheduleNavigation } from "@/components/tv-schedule-navigation";
import { getPublishedCatalog } from "@/lib/channels";
import { getPublishedGameSchedule } from "@/lib/games";

export const dynamic = "force-dynamic";

type GameSchedulePageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function GameSchedulePage({ searchParams }: GameSchedulePageProps) {
  const [params, catalog, schedule] = await Promise.all([
    searchParams,
    getPublishedCatalog(),
    getPublishedGameSchedule(),
  ]);
  const fromTv = params.from === "tv";

  return (
    <>
      <SiteHeader tv={fromTv} />
      <TvScheduleNavigation className={`game-schedule-page${fromTv ? " game-schedule-page--tv" : ""}`} enabled={fromTv}>
        {fromTv ? (
          <ChannelReturnLink className="back-link" dataTvScheduleItem href="/tv" preferHistory>
            <ArrowLeft aria-hidden="true" size={19} />
            <span>Voltar ao Modo TV</span>
          </ChannelReturnLink>
        ) : (
          <ChannelReturnLink className="back-link" href="/" preferHistory={false}>
            <ArrowLeft aria-hidden="true" size={19} />
            <span>Voltar ao catálogo</span>
          </ChannelReturnLink>
        )}
        <PublicGameSchedule
          channels={catalog.channels}
          games={schedule.games}
          mode={fromTv ? "tv" : "site"}
          showAllLink={false}
        />
      </TvScheduleNavigation>
    </>
  );
}
