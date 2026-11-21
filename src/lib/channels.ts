import {
  CHANNEL_CATEGORIES,
  sortCategories,
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
  embedSourceIds: string[];
  embedSourceActive: boolean[];
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

export type StreamIssueHistoryItem = {
  reportId: string;
  createdAt: string;
  sourceLabel: string;
  status: "pending" | "resolved";
  resolvedAt: string | null;
};

export type StreamIssueOptionGroup = {
  channelId: string;
  channelName: string;
  sourceId: string;
  sourceLabel: string;
  sourcePosition: number;
  sourceUrl: string;
  latestAt: string;
  pendingCount: number;
  resolvedCount: number;
  history: StreamIssueHistoryItem[];
};

export type AdminReportedIssuesResult = {
  groups: StreamIssueOptionGroup[];
  status: "ready" | "not-configured" | "unavailable";
};

const fallbackCategories = CHANNEL_CATEGORIES.map(({ slug, name }) => ({
  slug,
  name,
}));

function mapChannels(
  channels: ChannelRow[],
  categories: CategoryRow[],
  includeHiddenSources = false,
) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return sortChannelsByName(
    channels.flatMap((channel) => {
      const category = categoryById.get(channel.category_id);
      if (!category) {
        return [];
      }

      const sourcePairs = channel.embed_urls.map((url, index) => ({
        url,
        id: channel.embed_source_ids[index],
        active: channel.embed_source_active[index] ?? true,
      }));
      const availableSources = includeHiddenSources
        ? sourcePairs
        : sourcePairs.filter((source) => source.active);

      return [
        {
          id: channel.id,
          slug: channel.slug,
          name: channel.name,
          categorySlug: category.slug,
          categoryName: category.name,
          embedUrls: availableSources.map((source) => source.url),
          embedSourceIds: availableSources.map((source) => source.id),
          embedSourceActive: availableSources.map((source) => source.active),
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
          "id, slug, name, category_id, embed_urls, embed_source_ids, embed_source_active, thumbnail_url, official_url, is_published, published_at, created_by, created_at, updated_at",
        )
        .eq("is_published", true),
      supabase
        .from("categories")
        .select("id, slug, name, is_active, created_at")
        .eq("is_active", true),
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
      categories: sortCategories((categoryResult.data ?? []) as CategoryOption[]),
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
        "id, slug, name, category_id, embed_urls, embed_source_ids, embed_source_active, thumbnail_url, official_url, is_published, published_at, created_by, created_at, updated_at",
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, slug, name, is_active, created_at")
      .eq("is_active", true),
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
        "id, slug, name, category_id, embed_urls, embed_source_ids, embed_source_active, thumbnail_url, official_url, is_published, published_at, created_by, created_at, updated_at",
      ),
    supabase.from("categories").select("id, slug, name, is_active, created_at"),
  ]);

  if (channelResult.error || categoryResult.error) {
    return { channels: [], categories: [], status: "unavailable" as const };
  }

  return {
    channels: mapChannels(
      (channelResult.data ?? []) as ChannelRow[],
      (categoryResult.data ?? []) as CategoryRow[],
      true,
    ),
    categories: sortCategories(
      ((categoryResult.data ?? []) as CategoryRow[]).map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        isActive: category.is_active,
      })),
    ) as AdminCategory[],
    status: "ready" as const,
  };
}

export async function getAdminReportedIssues(): Promise<AdminReportedIssuesResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { groups: [], status: "not-configured" };
  }

  const [reportsResult, optionsResult, channelsResult] = await Promise.all([
    supabase
      .from("stream_issue_reports")
      .select("id, channel_id, channel_name, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("stream_issue_report_options")
      .select(
        "id, report_id, channel_id, source_id, source_position, source_label, source_url, status, resolved_at",
      ),
    supabase.from("channels").select("id, name, embed_source_ids"),
  ]);

  if (reportsResult.error || optionsResult.error || channelsResult.error) {
    return { groups: [], status: "unavailable" };
  }

  const reportsById = new Map(
    (reportsResult.data ?? []).map((report) => [report.id, report]),
  );
  const channelsById = new Map(
    (channelsResult.data ?? []).map((channel) => [channel.id, channel]),
  );
  const groupsByKey = new Map<string, StreamIssueOptionGroup>();

  for (const option of optionsResult.data ?? []) {
    const report = reportsById.get(option.report_id);
    if (!report) {
      continue;
    }

    const key = option.channel_id + ":" + option.source_id;
    const channel = channelsById.get(option.channel_id);
    const livePosition = channel?.embed_source_ids.indexOf(option.source_id) ?? -1;
    const sourcePosition = livePosition >= 0 ? livePosition + 1 : option.source_position;
    const sourceLabel = livePosition >= 0 ? `Opção ${sourcePosition}` : option.source_label;
    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        channelId: option.channel_id,
        channelName: channel?.name ?? report.channel_name,
        sourceId: option.source_id,
        sourceLabel,
        sourcePosition,
        sourceUrl: option.source_url,
        latestAt: report.created_at,
        pendingCount: 0,
        resolvedCount: 0,
        history: [],
      };
      groupsByKey.set(key, group);
    }

    if (Date.parse(report.created_at) > Date.parse(group.latestAt)) {
      group.channelName = channel?.name ?? report.channel_name;
      group.sourceLabel = sourceLabel;
      group.sourcePosition = sourcePosition;
      group.sourceUrl = option.source_url;
      group.latestAt = report.created_at;
    }
    if (option.status === "pending") {
      group.pendingCount += 1;
    } else {
      group.resolvedCount += 1;
    }
    group.history.push({
      reportId: report.id,
      createdAt: report.created_at,
      sourceLabel: option.source_label,
      status: option.status,
      resolvedAt: option.resolved_at,
    });
  }

  const groups = [...groupsByKey.values()];
  for (const group of groups) {
    group.history.sort(
      (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
    );
  }
  groups.sort(
    (first, second) =>
      first.channelName.localeCompare(second.channelName, "pt-BR") ||
      first.sourcePosition - second.sourcePosition,
  );

  return { groups, status: "ready" };
}
