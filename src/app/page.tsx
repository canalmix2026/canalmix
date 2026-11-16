import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import { getPublishedCatalog } from "@/lib/channels";
import { getPublishedGameSchedule } from "@/lib/games";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ categoria?: string; foco?: string; busca?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const [catalog, schedule, params] = await Promise.all([
    getPublishedCatalog(),
    getPublishedGameSchedule(),
    searchParams,
  ]);

  return (
    <>
      <SiteHeader />
      <CatalogBrowser
        channels={catalog.channels}
        games={schedule.games}
        categories={catalog.categories}
        mode="site"
        status={catalog.status}
        initialCategorySlug={params.categoria}
        initialFocusSlug={params.foco}
        initialQuery={params.busca}
      />
    </>
  );
}
