import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import { getPublishedCatalog } from "@/lib/channels";

export const dynamic = "force-dynamic";

type TvPageProps = {
  searchParams: Promise<{ categoria?: string; foco?: string }>;
};

export default async function TvPage({ searchParams }: TvPageProps) {
  const [catalog, params] = await Promise.all([
    getPublishedCatalog(),
    searchParams,
  ]);

  return (
    <>
      <SiteHeader tv />
      <CatalogBrowser
        channels={catalog.channels}
        categories={catalog.categories}
        mode="tv"
        status={catalog.status}
        initialCategorySlug={params.categoria}
        initialFocusSlug={params.foco}
      />
    </>
  );
}
