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
      businesses: {
        Row: {
          active: boolean
          category: string
          city: string
          created_at: string
          district: string
          generic_description: string
          id: string
          name: string
          owner_id: string
          review_url: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          city: string
          created_at?: string
          district: string
          generic_description: string
          id?: string
          name: string
          owner_id: string
          review_url: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          city?: string
          created_at?: string
          district?: string
          generic_description?: string
          id?: string
          name?: string
          owner_id?: string
          review_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_review_samples: {
        Row: {
          business_id: string
          created_at: string
          id: string
          sample_text: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          sample_text: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          sample_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_review_samples_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          id: string
          note: string | null
          reason: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          note?: string | null
          reason: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          note?: string | null
          reason?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      skips: {
        Row: {
          business_id: string
          giver_id: string
          skipped_at: string
        }
        Insert: {
          business_id: string
          giver_id: string
          skipped_at?: string
        }
        Update: {
          business_id?: string
          giver_id?: string
          skipped_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skips_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skips_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          accepted_at: string
          admin_note: string | null
          business_category: string
          business_city: string
          business_district: string
          business_id: string
          business_name: string
          completed_at: string | null
          created_at: string
          expires_at: string | null
          giver_id: string
          id: string
          proof_url: string | null
          receive_allowance_reserved: boolean
          review_url_snapshot: string
          sample_review_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["task_status"]
          submitted_at: string | null
        }
        Insert: {
          accepted_at?: string
          admin_note?: string | null
          business_category: string
          business_city: string
          business_district: string
          business_id: string
          business_name: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          giver_id: string
          id?: string
          proof_url?: string | null
          receive_allowance_reserved?: boolean
          review_url_snapshot: string
          sample_review_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          submitted_at?: string | null
        }
        Update: {
          accepted_at?: string
          admin_note?: string | null
          business_category?: string
          business_city?: string
          business_district?: string
          business_id?: string
          business_name?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          giver_id?: string
          id?: string
          proof_url?: string | null
          receive_allowance_reserved?: boolean
          review_url_snapshot?: string
          sample_review_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          allowance_accrued_on: string
          avatar_url: string | null
          created_at: string
          credit_balance: number
          daily_give_limit: number
          daily_receive_limit: number
          display_name: string
          give_allowance_balance: number
          id: string
          line_user_id: string
          onboarding_completed_at: string | null
          onboarding_tutorial_seen_at: string | null
          plan_expires_at: string
          plan_give_limit: number
          plan_receive_limit: number
          plan_started_at: string
          referral_code: string
          referred_by: string | null
          receive_allowance_balance: number
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          allowance_accrued_on?: string
          avatar_url?: string | null
          created_at?: string
          credit_balance?: number
          daily_give_limit?: number
          daily_receive_limit?: number
          display_name: string
          give_allowance_balance?: number
          id?: string
          line_user_id: string
          onboarding_completed_at?: string | null
          onboarding_tutorial_seen_at?: string | null
          plan_expires_at?: string
          plan_give_limit?: number
          plan_receive_limit?: number
          plan_started_at?: string
          referral_code?: string
          referred_by?: string | null
          receive_allowance_balance?: number
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          allowance_accrued_on?: string
          avatar_url?: string | null
          created_at?: string
          credit_balance?: number
          daily_give_limit?: number
          daily_receive_limit?: number
          display_name?: string
          give_allowance_balance?: number
          id?: string
          line_user_id?: string
          onboarding_completed_at?: string | null
          onboarding_tutorial_seen_at?: string | null
          plan_expires_at?: string
          plan_give_limit?: number
          plan_receive_limit?: number
          plan_started_at?: string
          referral_code?: string
          referred_by?: string | null
          receive_allowance_balance?: number
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_review_task: {
        Args: { p_assignment_id: string; p_giver_id: string }
        Returns: string
      }
      admin_adjust_credit: {
        Args: {
          p_admin_id: string
          p_delta: number
          p_note: string
          p_user_id: string
        }
        Returns: undefined
      }
      complete_review_task: {
        Args: { p_giver_id: string; p_proof_url: string; p_task_id: string }
        Returns: string
      }
      expire_overdue_tasks: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_daily_stats: {
        Args: { p_user_id: string }
        Returns: {
          give_allowance: number
          gives: number
          receive_allowance: number
          receives: number
          skips: number
          skips_remaining: number
        }[]
      }
      get_discover_feed: {
        Args: { p_giver_id: string; p_limit?: number }
        Returns: {
          assigned_until: string
          assignment_id: string
          category: string
          city: string
          district: string
          generic_description: string
          id: string
        }[]
      }
      get_plan_stats: {
        Args: { p_user_id: string }
        Returns: {
          give_limit: number
          gives: number
          period_ends_at: string
          period_started_at: string
          receive_limit: number
          receives: number
        }[]
      }
      review_submission: {
        Args: {
          p_admin_id: string
          p_approve: boolean
          p_note?: string
          p_task_id: string
        }
        Returns: undefined
      }
      save_business_card: {
        Args: {
          p_active: boolean
          p_category: string
          p_city: string
          p_district: string
          p_generic_description: string
          p_name: string
          p_owner_id: string
          p_review_url: string
          p_sample_reviews: string[]
        }
        Returns: string
      }
      skip_business: {
        Args: { p_business_id: string; p_giver_id: string }
        Returns: number
      }
      submit_review_task: {
        Args: { p_giver_id: string; p_proof_url: string; p_task_id: string }
        Returns: undefined
      }
    }
    Enums: {
      task_status:
        | "accepted"
        | "submitted"
        | "completed"
        | "rejected"
        | "expired"
      user_role: "member" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      task_status: [
        "accepted",
        "submitted",
        "completed",
        "rejected",
        "expired",
      ],
      user_role: ["member", "admin"],
    },
  },
} as const

