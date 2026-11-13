export type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  created_at: string;
};

export type ChannelRow = {
  id: string;
  slug: string;
  name: string;
  category_id: number;
  embed_urls: string[];
  thumbnail_url: string | null;
  official_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      categories: Table<
        CategoryRow,
        { id?: number; slug: string; name: string; created_at?: string },
        { id?: number; slug?: string; name?: string; created_at?: string }
      >;
      catalog_admins: Table<
        { user_id: string; created_at: string },
        { user_id: string; created_at?: string },
        { user_id?: string; created_at?: string }
      >;
      channels: Table<
        ChannelRow,
        {
          id?: string;
          slug: string;
          name: string;
          category_id: number;
          embed_urls: string[];
          thumbnail_url?: string | null;
          official_url?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          slug?: string;
          name?: string;
          category_id?: number;
          embed_urls?: string[];
          thumbnail_url?: string | null;
          official_url?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
