import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import { getPublishedCatalog } from "@/lib/channels";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ categoria?: string; foco?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const [catalog, params] = await Promise.all([
    getPublishedCatalog(),
    searchParams,
  ]);

  return (
    <>
      <SiteHeader />
      <CatalogBrowser
        channels={catalog.channels}
        categories={catalog.categories}
        mode="site"
        status={catalog.status}
        initialCategorySlug={params.categoria}
        initialFocusSlug={params.foco}
      />
    </>
  );
}
