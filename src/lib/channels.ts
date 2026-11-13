import {
  CHANNEL_CATEGORIES,
  sortChannelsByName,
} from "@/lib/categories";
import type { AdminCategory, CategoryOption } from "@/lib/categories";
import type { CategoryRow, ChannelRow } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ChannelCardData = {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  embedUrls: string[];
  thumbnailUrl: string | null;
  officialUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
};

export type CatalogResult = {
  channels: ChannelCardData[];
  categories: CategoryOption[];
  status: "ready" | "not-configured" | "unavailable";
};

const fallbackCategories = CHANNEL_CATEGORIES.map(({ slug, name }) => ({
  slug,
  name,
}));

function mapChannels(channels: ChannelRow[], categories: CategoryRow[]) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return sortChannelsByName(
    channels.flatMap((channel) => {
      const category = categoryById.get(channel.category_id);
      if (!category) {
        return [];
      }

      return [
        {
          id: channel.id,
          slug: channel.slug,
          name: channel.name,
          categorySlug: category.slug,
          categoryName: category.name,
          embedUrls: channel.embed_urls,
          thumbnailUrl: channel.thumbnail_url,
          officialUrl: channel.official_url,
          isPublished: channel.is_published,
          publishedAt: channel.published_at,
        },
      ];
    }),
  );
}

export async function getPublishedCatalog(): Promise<CatalogResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      channels: [],
      categories: fallbackCategories,
      status: "not-configured",
    };
  }

  try {
    const [channelResult, categoryResult] = await Promise.all([
      supabase
        .from("channels")
        .select(
          "id, slug, name, category_id, embed_urls, thumbnail_url, official_url, is_published, published_at, created_by, created_at, updated_at",
        )
        .eq("is_published", true),
      supabase.from("categories").select("id, slug, name, created_at"),
    ]);

    if (channelResult.error || categoryResult.error) {
      return {
        channels: [],
        categories: fallbackCategories,
        status: "unavailable",
      };
    }

    return {
      channels: mapChannels(
        (channelResult.data ?? []) as ChannelRow[],
        (categoryResult.data ?? []) as CategoryRow[],
      ),
      categories: (categoryResult.data ?? []) as CategoryOption[],
      status: "ready",
    };
  } catch {
    return {
      channels: [],
      categories: fallbackCategories,
      status: "unavailable",
    };
  }
}

export async function getPublishedChannelBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const [channelResult, categoryResult] = await Promise.all([
    supabase
      .from("channels")
      .select(
        "id, slug, name, category_id, embed_urls, thumbnail_url, official_url, is_published, published_at, created_by, created_at, updated_at",
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle(),
    supabase.from("categories").select("id, slug, name, created_at"),
  ]);

  if (channelResult.error || categoryResult.error || !channelResult.data) {
    return null;
  }

  return mapChannels(
    [channelResult.data as ChannelRow],
    (categoryResult.data ?? []) as CategoryRow[],
  )[0] ?? null;
}

export async function getAdminCatalog() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      channels: [],
      categories: [],
      status: "not-configured" as const,
    };
  }

  const [channelResult, categoryResult] = await Promise.all([
    supabase
      .from("channels")
      .select(
        "id, slug, name, category_id, embed_urls, thumbnail_url, official_url, is_published, published_at, created_by, created_at, updated_at",
      ),
    supabase.from("categories").select("id, slug, name, created_at"),
  ]);

  if (channelResult.error || categoryResult.error) {
    return { channels: [], categories: [], status: "unavailable" as const };
  }

  return {
    channels: mapChannels(
      (channelResult.data ?? []) as ChannelRow[],
      (categoryResult.data ?? []) as CategoryRow[],
    ),
    categories: (categoryResult.data ?? []) as AdminCategory[],
    status: "ready" as const,
  };
}
