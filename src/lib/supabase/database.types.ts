export type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type GameRow = {
  id: string;
  home_team: string;
  away_team: string;
  home_team_id: string | null;
  away_team_id: string | null;
  competition_name: string;
  competition_country_code: string;
  competition_country_name: string;
  starts_at: string;
  external_provider: string | null;
  external_id: string | null;
  source_urls: string[];
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GameBroadcastRow = {
  id: string;
  game_id: string;
  country_code: string;
  country_name: string;
  broadcaster_name: string;
  channel_id: string | null;
  youtube_video_url: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};

export type TeamRow = {
  id: string;
  name: string;
  name_key: string;
  official_name: string;
  country_code: string | null;
  country_name: string | null;
  team_type: "club" | "national_team";
  gender: "men" | "women" | "mixed";
  squad_type: "first" | "reserve" | "development" | "youth" | "other";
  external_provider: string | null;
  external_id: string | null;
  import_key: string | null;
  name_aliases: string[];
  shield_url: string | null;
  shield_status: "pending" | "approved" | "manual" | "not_applicable";
  shield_source_url: string | null;
  shield_license: string | null;
  source_data_name: string | null;
  source_data_url: string | null;
  source_data_license: string | null;
  source_competition_key: string | null;
  source_season_year: number | null;
  name_is_manual: boolean;
  catalog_note: string | null;
  created_at: string;
  updated_at: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ChannelRow = {
  id: string;
  slug: string;
  name: string;
  category_id: number;
  embed_urls: string[];
  embed_source_ids: string[];
  embed_source_active: boolean[];
  thumbnail_url: string | null;
  official_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PixDonationSettingsRow = {
  id: boolean;
  pix_key: string;
  receiver_name: string;
  is_active: boolean;
  preset_amount_1_cents: number;
  preset_amount_2_cents: number;
  preset_amount_3_cents: number;
  updated_at: string;
};

export type OnlineVisitorSessionRow = {
  session_id: string;
  device_type: "mobile" | "tablet" | "desktop" | "tv";
  page_key: "home" | "tv" | "schedule" | "channel" | "privacy" | "other";
  category_slug: string | null;
  channel_name: string | null;
  selected_option: number | null;
  started_at: string;
  last_activity_at: string;
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
      online_visitor_sessions: Table<
        OnlineVisitorSessionRow,
        OnlineVisitorSessionRow,
        Partial<OnlineVisitorSessionRow>
      >;
      categories: Table<
        CategoryRow,
        { id?: number; slug: string; name: string; is_active?: boolean; created_at?: string },
        { id?: number; slug?: string; name?: string; is_active?: boolean; created_at?: string }
      >;
      catalog_admins: Table<
        { user_id: string; created_at: string },
        { user_id: string; created_at?: string },
        { user_id?: string; created_at?: string }
      >;
      pix_donation_settings: Table<
        PixDonationSettingsRow,
        {
          id?: boolean;
          pix_key?: string;
          receiver_name?: string;
          is_active?: boolean;
          preset_amount_1_cents?: number;
          preset_amount_2_cents?: number;
          preset_amount_3_cents?: number;
          updated_at?: string;
        },
        {
          id?: boolean;
          pix_key?: string;
          receiver_name?: string;
          is_active?: boolean;
          preset_amount_1_cents?: number;
          preset_amount_2_cents?: number;
          preset_amount_3_cents?: number;
          updated_at?: string;
        }
      >;
      teams: Table<
        TeamRow,
        {
          id?: string;
          name: string;
          official_name?: string;
          country_code?: string | null;
          country_name?: string | null;
          team_type?: "club" | "national_team";
          gender?: "men" | "women" | "mixed";
          squad_type?: "first" | "reserve" | "development" | "youth" | "other";
          external_provider?: string | null;
          external_id?: string | null;
          import_key?: string | null;
          name_aliases?: string[];
          shield_url?: string | null;
          shield_status?: "pending" | "approved" | "manual" | "not_applicable";
          shield_source_url?: string | null;
          shield_license?: string | null;
          source_data_name?: string | null;
          source_data_url?: string | null;
          source_data_license?: string | null;
          source_competition_key?: string | null;
          source_season_year?: number | null;
          name_is_manual?: boolean;
          catalog_note?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          name?: string;
          official_name?: string;
          country_code?: string | null;
          country_name?: string | null;
          team_type?: "club" | "national_team";
          gender?: "men" | "women" | "mixed";
          squad_type?: "first" | "reserve" | "development" | "youth" | "other";
          external_provider?: string | null;
          external_id?: string | null;
          import_key?: string | null;
          name_aliases?: string[];
          shield_url?: string | null;
          shield_status?: "pending" | "approved" | "manual" | "not_applicable";
          shield_source_url?: string | null;
          shield_license?: string | null;
          source_data_name?: string | null;
          source_data_url?: string | null;
          source_data_license?: string | null;
          source_competition_key?: string | null;
          source_season_year?: number | null;
          name_is_manual?: boolean;
          catalog_note?: string | null;
          updated_at?: string;
        }
      >;
      channels: Table<
        ChannelRow,
        {
          id?: string;
          slug: string;
          name: string;
          category_id: number;
          embed_urls: string[];
          embed_source_ids?: string[];
          embed_source_active?: boolean[];
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
          embed_source_ids?: string[];
          embed_source_active?: boolean[];
          thumbnail_url?: string | null;
          official_url?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          updated_at?: string;
        }
      >;
      stream_issue_reports: Table<
        {
          id: string;
          idempotency_key: string;
          fingerprint_hash: string;
          channel_id: string;
          channel_name: string;
          created_at: string;
        },
        {
          id?: string;
          idempotency_key: string;
          fingerprint_hash: string;
          channel_id: string;
          channel_name: string;
          created_at?: string;
        },
        {
          id?: string;
          idempotency_key?: string;
          fingerprint_hash?: string;
          channel_id?: string;
          channel_name?: string;
          created_at?: string;
        }
      >;
      stream_issue_report_options: Table<
        {
          id: string;
          report_id: string;
          channel_id: string;
          source_id: string;
          source_position: number;
          source_label: string;
          source_url: string;
          status: "pending" | "resolved";
          resolved_at: string | null;
          resolved_by: string | null;
        },
        {
          id?: string;
          report_id: string;
          channel_id: string;
          source_id: string;
          source_position: number;
          source_label: string;
          source_url: string;
          status?: "pending" | "resolved";
          resolved_at?: string | null;
          resolved_by?: string | null;
        },
        {
          id?: string;
          report_id?: string;
          channel_id?: string;
          source_id?: string;
          source_position?: number;
          source_label?: string;
          source_url?: string;
          status?: "pending" | "resolved";
          resolved_at?: string | null;
          resolved_by?: string | null;
        }
      >;
      games: Table<
        GameRow,
        {
          id?: string;
          home_team: string;
          away_team: string;
          home_team_id?: string | null;
          away_team_id?: string | null;
          competition_name: string;
          competition_country_code: string;
          competition_country_name: string;
          starts_at: string;
          external_provider?: string | null;
          external_id?: string | null;
          source_urls?: string[];
          is_published?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          home_team?: string;
          away_team?: string;
          home_team_id?: string | null;
          away_team_id?: string | null;
          competition_name?: string;
          competition_country_code?: string;
          competition_country_name?: string;
          starts_at?: string;
          external_provider?: string | null;
          external_id?: string | null;
          source_urls?: string[];
          is_published?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          updated_at?: string;
        }
      >;
      game_broadcasts: Table<
        GameBroadcastRow,
        {
          id?: string;
          game_id: string;
          country_code: string;
          country_name: string;
          broadcaster_name: string;
          channel_id?: string | null;
          youtube_video_url?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        },
        {
          id?: string;
          game_id?: string;
          country_code?: string;
          country_name?: string;
          broadcaster_name?: string;
          channel_id?: string | null;
          youtube_video_url?: string | null;
          sort_order?: number;
          is_primary?: boolean;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      submit_stream_issue: {
        Args: {
          p_channel_id: string;
          p_selected_source_ids: string[];
          p_idempotency_key: string;
          p_fingerprint_hash: string;
        };
        Returns: { report_id: string; protocol: string; duplicate: boolean }[];
      };
      save_game: {
        Args: {
          p_game_id: string | null;
          p_home_team: string;
          p_away_team: string;
          p_competition_name: string;
          p_competition_country_code: string;
          p_competition_country_name: string;
          p_starts_at: string;
          p_broadcasts: Json;
          p_home_team_provider?: string | null;
          p_home_team_external_id?: string | null;
          p_away_team_provider?: string | null;
          p_away_team_external_id?: string | null;
        };
        Returns: string;
      };
      save_game_with_teams: {
        Args: {
          p_game_id: string | null;
          p_home_team: string;
          p_away_team: string;
          p_competition_name: string;
          p_competition_country_code: string;
          p_competition_country_name: string;
          p_starts_at: string;
          p_broadcasts: Json;
          p_home_team_id: string | null;
          p_away_team_id: string | null;
          p_home_team_provider?: string | null;
          p_home_team_external_id?: string | null;
          p_away_team_provider?: string | null;
          p_away_team_external_id?: string | null;
        };
        Returns: string;
      };
      save_game_with_metadata: {
        Args: {
          p_game_id: string | null;
          p_home_team: string;
          p_away_team: string;
          p_competition_name: string;
          p_competition_country_code: string;
          p_competition_country_name: string;
          p_starts_at: string;
          p_broadcasts: Json;
          p_home_team_id: string | null;
          p_away_team_id: string | null;
          p_home_team_provider: string | null;
          p_home_team_external_id: string | null;
          p_away_team_provider: string | null;
          p_away_team_external_id: string | null;
          p_external_provider: string | null;
          p_external_id: string | null;
          p_source_urls: string[];
        };
        Returns: string;
      };
      save_game_with_youtube_metadata: {
        Args: {
          p_game_id: string | null;
          p_home_team: string;
          p_away_team: string;
          p_competition_name: string;
          p_competition_country_code: string;
          p_competition_country_name: string;
          p_starts_at: string;
          p_broadcasts: Json;
          p_home_team_id: string | null;
          p_away_team_id: string | null;
          p_home_team_provider: string | null;
          p_home_team_external_id: string | null;
          p_away_team_provider: string | null;
          p_away_team_external_id: string | null;
          p_external_provider: string | null;
          p_external_id: string | null;
          p_source_urls: string[];
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
