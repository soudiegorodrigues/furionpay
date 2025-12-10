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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          user_id: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          user_id?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          user_id?: string | null
          value?: string | null
        }
        Relationships: []
      }
      admin_tokens: {
        Row: {
          created_at: string | null
          id: string
          token_hash: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          token_hash: string
        }
        Update: {
          created_at?: string | null
          id?: string
          token_hash?: string
        }
        Relationships: []
      }
      available_domains: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string
          id: string
          is_active: boolean
          name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain: string
          id?: string
          is_active?: boolean
          name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string
          id?: string
          is_active?: boolean
          name?: string | null
        }
        Relationships: []
      }
      chat_blocks: {
        Row: {
          block_order: number
          created_at: string
          delay_ms: number
          flow_id: string
          id: string
          is_typing_indicator: boolean
          message: string
        }
        Insert: {
          block_order?: number
          created_at?: string
          delay_ms?: number
          flow_id: string
          id?: string
          is_typing_indicator?: boolean
          message: string
        }
        Update: {
          block_order?: number
          created_at?: string
          delay_ms?: number
          flow_id?: string
          id?: string
          is_typing_indicator?: boolean
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_blocks_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "chat_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_flows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      checkout_offers: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          meta_pixel_ids: string[] | null
          name: string
          popup_model: string | null
          product_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          meta_pixel_ids?: string[] | null
          name?: string
          popup_model?: string | null
          product_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          meta_pixel_ids?: string[] | null
          name?: string
          popup_model?: string | null
          product_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_count: number
          blocked_at: string | null
          created_at: string
          email: string
          id: string
          is_blocked: boolean
          last_attempt_at: string | null
        }
        Insert: {
          attempt_count?: number
          blocked_at?: string | null
          created_at?: string
          email: string
          id?: string
          is_blocked?: boolean
          last_attempt_at?: string | null
        }
        Update: {
          attempt_count?: number
          blocked_at?: string | null
          created_at?: string
          email?: string
          id?: string
          is_blocked?: boolean
          last_attempt_at?: string | null
        }
        Relationships: []
      }
      password_reset_codes: {
        Row: {
          code: string
          code_hash: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          code_hash?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          code_hash?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      pix_transactions: {
        Row: {
          amount: number
          created_at: string | null
          donor_name: string | null
          expired_at: string | null
          id: string
          paid_at: string | null
          pix_code: string | null
          popup_model: string | null
          product_name: string | null
          status: Database["public"]["Enums"]["pix_status"]
          txid: string | null
          user_id: string | null
          utm_data: Json | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          donor_name?: string | null
          expired_at?: string | null
          id?: string
          paid_at?: string | null
          pix_code?: string | null
          popup_model?: string | null
          product_name?: string | null
          status?: Database["public"]["Enums"]["pix_status"]
          txid?: string | null
          user_id?: string | null
          utm_data?: Json | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          donor_name?: string | null
          expired_at?: string | null
          id?: string
          paid_at?: string | null
          pix_code?: string | null
          popup_model?: string | null
          product_name?: string | null
          status?: Database["public"]["Enums"]["pix_status"]
          txid?: string | null
          user_id?: string | null
          utm_data?: Json | null
        }
        Relationships: []
      }
      popup_configurations: {
        Row: {
          background_color: string | null
          button_text: string | null
          button_values: Json | null
          created_at: string
          custom_css: string | null
          font_family: string | null
          id: string
          logo_url: string | null
          popup_model: string
          primary_color: string | null
          subtitle: string | null
          text_color: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          background_color?: string | null
          button_text?: string | null
          button_values?: Json | null
          created_at?: string
          custom_css?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          popup_model: string
          primary_color?: string | null
          subtitle?: string | null
          text_color?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          background_color?: string | null
          button_text?: string | null
          button_values?: Json | null
          created_at?: string
          custom_css?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          popup_model?: string
          primary_color?: string | null
          subtitle?: string | null
          text_color?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          folder_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "product_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      block_user: { Args: { target_user_id: string }; Returns: boolean }
      bootstrap_first_admin: { Args: { admin_email: string }; Returns: boolean }
      check_login_blocked: { Args: { p_email: string }; Returns: Json }
      check_user_blocked: { Args: never; Returns: boolean }
      delete_user: { Args: { target_user_id: string }; Returns: boolean }
      get_admin_settings: {
        Args: { input_token: string }
        Returns: {
          key: string
          value: string
        }[]
      }
      get_admin_settings_auth: {
        Args: never
        Returns: {
          key: string
          value: string
        }[]
      }
      get_all_users_auth: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
          is_blocked: boolean
          last_sign_in_at: string
        }[]
      }
      get_pix_dashboard: { Args: { input_token: string }; Returns: Json }
      get_pix_dashboard_auth: { Args: never; Returns: Json }
      get_pix_transactions: {
        Args: { input_token: string; p_limit?: number }
        Returns: {
          amount: number
          created_at: string
          donor_name: string
          id: string
          paid_at: string
          status: Database["public"]["Enums"]["pix_status"]
          txid: string
        }[]
      }
      get_pix_transactions_auth: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          created_at: string
          donor_name: string
          id: string
          paid_at: string
          product_name: string
          status: Database["public"]["Enums"]["pix_status"]
          txid: string
          user_email: string
        }[]
      }
      get_popup_model_stats: {
        Args: never
        Returns: {
          conversion_rate: number
          popup_model: string
          total_generated: number
          total_paid: number
        }[]
      }
      get_transaction_status_by_id: {
        Args: { p_id: string }
        Returns: {
          paid_at: string
          status: Database["public"]["Enums"]["pix_status"]
        }[]
      }
      get_transaction_status_by_txid: {
        Args: { p_txid: string }
        Returns: {
          amount: number
          paid_at: string
          status: Database["public"]["Enums"]["pix_status"]
        }[]
      }
      get_user_dashboard: { Args: never; Returns: Json }
      get_user_popup_model_stats: {
        Args: never
        Returns: {
          conversion_rate: number
          popup_model: string
          total_generated: number
          total_paid: number
        }[]
      }
      get_user_settings: {
        Args: never
        Returns: {
          key: string
          value: string
        }[]
      }
      get_user_transactions: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          created_at: string
          donor_name: string
          id: string
          paid_at: string
          product_name: string
          status: Database["public"]["Enums"]["pix_status"]
          txid: string
        }[]
      }
      get_users_count: { Args: never; Returns: number }
      get_users_revenue_ranking:
        | {
            Args: { p_limit?: number; p_offset?: number }
            Returns: {
              conversion_rate: number
              total_amount_generated: number
              total_amount_paid: number
              total_generated: number
              total_paid: number
              user_email: string
              user_id: string
            }[]
          }
        | {
            Args: {
              p_date_filter?: string
              p_limit?: number
              p_offset?: number
            }
            Returns: {
              conversion_rate: number
              total_amount_generated: number
              total_amount_paid: number
              total_generated: number
              total_paid: number
              user_email: string
              user_id: string
            }[]
          }
      grant_admin_role: { Args: { target_user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_login_attempt: { Args: { p_email: string }; Returns: Json }
      is_admin_authenticated: { Args: never; Returns: boolean }
      is_user_authenticated: { Args: never; Returns: boolean }
      log_pix_generated:
        | {
            Args: {
              p_amount: number
              p_donor_name: string
              p_pix_code: string
              p_txid: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_donor_name: string
              p_pix_code: string
              p_txid: string
              p_utm_data?: Json
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_donor_name: string
              p_pix_code: string
              p_product_name?: string
              p_txid: string
              p_utm_data?: Json
            }
            Returns: string
          }
      log_pix_generated_user:
        | {
            Args: {
              p_amount: number
              p_donor_name: string
              p_pix_code: string
              p_product_name?: string
              p_txid: string
              p_user_id?: string
              p_utm_data?: Json
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_donor_name: string
              p_pix_code: string
              p_popup_model?: string
              p_product_name?: string
              p_txid: string
              p_user_id?: string
              p_utm_data?: Json
            }
            Returns: string
          }
      mark_pix_paid: { Args: { p_txid: string }; Returns: boolean }
      reset_login_attempts: { Args: { p_email: string }; Returns: boolean }
      reset_pix_transactions: {
        Args: { input_token: string }
        Returns: boolean
      }
      reset_pix_transactions_auth: { Args: never; Returns: boolean }
      reset_user_transactions: { Args: never; Returns: boolean }
      revoke_admin_role: { Args: { target_user_id: string }; Returns: boolean }
      unblock_user: { Args: { target_user_id: string }; Returns: boolean }
      update_admin_setting: {
        Args: {
          input_token: string
          setting_key: string
          setting_value: string
        }
        Returns: boolean
      }
      update_admin_setting_auth: {
        Args: { setting_key: string; setting_value: string }
        Returns: boolean
      }
      update_user_setting: {
        Args: { setting_key: string; setting_value: string }
        Returns: boolean
      }
      validate_admin_token: { Args: { input_token: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      pix_status: "generated" | "paid" | "expired"
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
      pix_status: ["generated", "paid", "expired"],
    },
  },
} as const
