import {
  Clapperboard,
  Film,
  MonitorPlay,
  Newspaper,
  Radio,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type CategoryOption = {
  slug: string;
  name: string;
};

export type AdminCategory = CategoryOption & {
  id: number;
};

export type ChannelCategory = CategoryOption & {
  icon: LucideIcon;
};

export const CHANNEL_CATEGORIES: ChannelCategory[] = [
  { slug: "canais-abertos", name: "Canais Abertos", icon: Radio },
  { slug: "desenhos", name: "Desenhos", icon: MonitorPlay },
  { slug: "documentarios", name: "Documentários", icon: Clapperboard },
  { slug: "entretenimento", name: "Entretenimento", icon: Sparkles },
  { slug: "esporte", name: "Esporte", icon: Trophy },
  { slug: "filmes-e-series", name: "Filmes e Séries", icon: Film },
  { slug: "noticias", name: "Notícias", icon: Newspaper },
];

const portugueseCollator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});

export function sortCategories(
  categories: readonly CategoryOption[] = CHANNEL_CATEGORIES,
): CategoryOption[] {
  return [...categories].sort((a, b) =>
    portugueseCollator.compare(a.name, b.name),
  );
}

export function getCategoryIcon(slug: string): LucideIcon {
  return CHANNEL_CATEGORIES.find((category) => category.slug === slug)?.icon ?? Sparkles;
}

export function sortChannelsByName<T extends { name: string }>(channels: T[]) {
  return [...channels].sort((a, b) =>
    portugueseCollator.compare(a.name, b.name),
  );
}

export function getCategory(
  slug: string,
  categories: readonly CategoryOption[] = CHANNEL_CATEGORIES,
) {
  return categories.find((category) => category.slug === slug);
}
