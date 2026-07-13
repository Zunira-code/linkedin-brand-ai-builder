export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      carousels: {
        Row: {
          created_at: string
          error: string | null
          id: string
          linkedin_urn: string | null
          posted_at: string | null
          scheduled_at: string | null
          slides: Json
          status: string
          template: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          linkedin_urn?: string | null
          posted_at?: string | null
          scheduled_at?: string | null
          slides?: Json
          status?: string
          template?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          linkedin_urn?: string | null
          posted_at?: string | null
          scheduled_at?: string | null
          slides?: Json
          status?: string
          template?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inspiration_templates: {
        Row: {
          category: string
          created_at: string
          hook_type: string
          id: string
          template_text: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          hook_type: string
          id?: string
          template_text: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          hook_type?: string
          id?: string
          template_text?: string
          title?: string
        }
        Relationships: []
      }
      lead_comments: {
        Row: {
          comment_text: string | null
          comment_urn: string
          commented_at: string | null
          created_at: string
          id: string
          lead_id: string
          post_id: string | null
          post_urn: string
          user_id: string
        }
        Insert: {
          comment_text?: string | null
          comment_urn: string
          commented_at?: string | null
          created_at?: string
          id?: string
          lead_id: string
          post_id?: string | null
          post_urn: string
          user_id: string
        }
        Update: {
          comment_text?: string | null
          comment_urn?: string
          commented_at?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          post_id?: string | null
          post_urn?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          avatar_url: string | null
          comment_count: number
          created_at: string
          headline: string | null
          id: string
          last_comment_at: string | null
          last_comment_text: string | null
          name: string | null
          note: string | null
          person_urn: string
          profile_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          comment_count?: number
          created_at?: string
          headline?: string | null
          id?: string
          last_comment_at?: string | null
          last_comment_text?: string | null
          name?: string | null
          note?: string | null
          person_urn: string
          profile_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          comment_count?: number
          created_at?: string
          headline?: string | null
          id?: string
          last_comment_at?: string | null
          last_comment_text?: string | null
          name?: string | null
          note?: string | null
          person_urn?: string
          profile_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_connections: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          linkedin_profile_id: string | null
          refresh_token: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          linkedin_profile_id?: string | null
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          linkedin_profile_id?: string | null
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_daily_metrics: {
        Row: {
          created_at: string
          engagement_rate: number
          followers: number
          followers_gained: number
          id: string
          metric_date: string
          post_impressions: number
          profile_views: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engagement_rate?: number
          followers?: number
          followers_gained?: number
          id?: string
          metric_date: string
          post_impressions?: number
          profile_views?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engagement_rate?: number
          followers?: number
          followers_gained?: number
          id?: string
          metric_date?: string
          post_impressions?: number
          profile_views?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_posts_metrics: {
        Row: {
          comments: number
          content: string | null
          created_at: string
          id: string
          impressions: number
          post_urn: string
          published_at: string | null
          reactions: number
          shares: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comments?: number
          content?: string | null
          created_at?: string
          id?: string
          impressions?: number
          post_urn: string
          published_at?: string | null
          reactions?: number
          shares?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comments?: number
          content?: string | null
          created_at?: string
          id?: string
          impressions?: number
          post_urn?: string
          published_at?: string | null
          reactions?: number
          shares?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_metrics: {
        Row: {
          comments: number | null
          fetched_at: string
          impressions: number | null
          likes: number | null
          post_id: string
          shares: number | null
        }
        Insert: {
          comments?: number | null
          fetched_at?: string
          impressions?: number | null
          likes?: number | null
          post_id: string
          shares?: number | null
        }
        Update: {
          comments?: number | null
          fetched_at?: string
          impressions?: number | null
          likes?: number | null
          post_id?: string
          shares?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          carousel_id: string | null
          content: string
          created_at: string
          error: string | null
          first_comment: string | null
          first_comment_error: string | null
          first_comment_posted_at: string | null
          first_comment_scheduled_at: string | null
          first_comment_urn: string | null
          format: string
          id: string
          image_data_url: string | null
          linkedin_urn: string | null
          posted_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          carousel_id?: string | null
          content: string
          created_at?: string
          error?: string | null
          first_comment?: string | null
          first_comment_error?: string | null
          first_comment_posted_at?: string | null
          first_comment_scheduled_at?: string | null
          first_comment_urn?: string | null
          format?: string
          id?: string
          image_data_url?: string | null
          linkedin_urn?: string | null
          posted_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          carousel_id?: string | null
          content?: string
          created_at?: string
          error?: string | null
          first_comment?: string | null
          first_comment_error?: string | null
          first_comment_posted_at?: string | null
          first_comment_scheduled_at?: string | null
          first_comment_urn?: string | null
          format?: string
          id?: string
          image_data_url?: string | null
          linkedin_urn?: string | null
          posted_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_carousel_id_fkey"
            columns: ["carousel_id"]
            isOneToOne: false
            referencedRelation: "carousels"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          brand_accent_color: string | null
          brand_font: string | null
          brand_logo_url: string | null
          brand_primary_color: string | null
          brand_secondary_color: string | null
          brand_voice: string | null
          calibration: Json | null
          created_at: string
          display_name: string | null
          id: string
          is_approved: boolean
          linkedin_urn: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          brand_accent_color?: string | null
          brand_font?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          brand_voice?: string | null
          calibration?: Json | null
          created_at?: string
          display_name?: string | null
          id: string
          is_approved?: boolean
          linkedin_urn?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          brand_accent_color?: string | null
          brand_font?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          brand_voice?: string | null
          calibration?: Json | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_approved?: boolean
          linkedin_urn?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_samples: {
        Row: {
          content: string
          created_at: string
          id: string
          source: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          source?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      post_status: "draft" | "scheduled" | "posted" | "failed"
      subscription_tier: "starter" | "growth" | "agency"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      post_status: ["draft", "scheduled", "posted", "failed"],
      subscription_tier: ["starter", "growth", "agency"],
    },
  },
} as const
