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
      acquirer_health_status: {
        Row: {
          acquirer: string
          avg_response_time_ms: number | null
          consecutive_failures: number | null
          consecutive_successes: number | null
          created_at: string | null
          id: string
          is_healthy: boolean | null
          last_check_at: string | null
          last_error_message: string | null
          last_failure_at: string | null
          last_success_at: string | null
          updated_at: string | null
        }
        Insert: {
          acquirer: string
          avg_response_time_ms?: number | null
          consecutive_failures?: number | null
          consecutive_successes?: number | null
          created_at?: string | null
          id?: string
          is_healthy?: boolean | null
          last_check_at?: string | null
          last_error_message?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          updated_at?: string | null
        }
        Update: {
          acquirer?: string
          avg_response_time_ms?: number | null
          consecutive_failures?: number | null
          consecutive_successes?: number | null
          created_at?: string | null
          id?: string
          is_healthy?: boolean | null
          last_check_at?: string | null
          last_error_message?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      api_clients: {
        Row: {
          api_key_hash: string
          api_key_prefix: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_request_at: string | null
          name: string
          rate_limit_per_minute: number | null
          total_requests: number | null
          updated_at: string | null
          user_id: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key_hash: string
          api_key_prefix: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_request_at?: string | null
          name: string
          rate_limit_per_minute?: number | null
          total_requests?: number | null
          updated_at?: string | null
          user_id: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key_hash?: string
          api_key_prefix?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_request_at?: string | null
          name?: string
          rate_limit_per_minute?: number | null
          total_requests?: number | null
          updated_at?: string | null
          user_id?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      api_monitoring_events: {
        Row: {
          acquirer: string
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          response_time_ms: number | null
          retry_attempt: number | null
        }
        Insert: {
          acquirer: string
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          response_time_ms?: number | null
          retry_attempt?: number | null
        }
        Update: {
          acquirer?: string
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          response_time_ms?: number | null
          retry_attempt?: number | null
        }
        Relationships: []
      }
      api_requests: {
        Row: {
          api_client_id: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          method: string
          request_body: Json | null
          response_body: Json | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_client_id?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method: string
          request_body?: Json | null
          response_body?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_client_id?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: Json | null
          response_body?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_requests_api_client_id_fkey"
            columns: ["api_client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      available_domains: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string
          domain_type: string
          id: string
          is_active: boolean
          name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain: string
          domain_type?: string
          id?: string
          is_active?: boolean
          name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string
          domain_type?: string
          id?: string
          is_active?: boolean
          name?: string | null
        }
        Relationships: []
      }
      business_managers: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chargebacks: {
        Row: {
          acquirer: string
          amount: number
          client_document: string | null
          client_email: string | null
          client_name: string | null
          created_at: string
          detected_at: string
          external_id: string
          id: string
          metadata: Json | null
          notes: string | null
          original_amount: number | null
          pix_transaction_id: string | null
          reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acquirer?: string
          amount: number
          client_document?: string | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          detected_at?: string
          external_id: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          original_amount?: number | null
          pix_transaction_id?: string | null
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acquirer?: string
          amount?: number
          client_document?: string | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          detected_at?: string
          external_id?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          original_amount?: number | null
          pix_transaction_id?: string | null
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chargebacks_pix_transaction_id_fkey"
            columns: ["pix_transaction_id"]
            isOneToOne: false
            referencedRelation: "pix_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_widget_config: {
        Row: {
          action_cards: Json | null
          auto_messages: Json | null
          business_hours: Json | null
          business_hours_enabled: boolean | null
          created_at: string | null
          greeting_text: string | null
          help_label: string | null
          help_url: string | null
          icon_type: string | null
          id: string
          is_enabled: boolean | null
          logo_url: string | null
          position: string | null
          primary_color: string | null
          show_bottom_nav: boolean | null
          show_help_button: boolean | null
          show_typing_indicator: boolean | null
          show_whatsapp_button: boolean | null
          subtitle: string | null
          team_avatars: Json | null
          title: string | null
          typing_delay_ms: number | null
          updated_at: string | null
          user_id: string
          welcome_message: string | null
          whatsapp_label: string | null
          whatsapp_number: string | null
        }
        Insert: {
          action_cards?: Json | null
          auto_messages?: Json | null
          business_hours?: Json | null
          business_hours_enabled?: boolean | null
          created_at?: string | null
          greeting_text?: string | null
          help_label?: string | null
          help_url?: string | null
          icon_type?: string | null
          id?: string
          is_enabled?: boolean | null
          logo_url?: string | null
          position?: string | null
          primary_color?: string | null
          show_bottom_nav?: boolean | null
          show_help_button?: boolean | null
          show_typing_indicator?: boolean | null
          show_whatsapp_button?: boolean | null
          subtitle?: string | null
          team_avatars?: Json | null
          title?: string | null
          typing_delay_ms?: number | null
          updated_at?: string | null
          user_id: string
          welcome_message?: string | null
          whatsapp_label?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          action_cards?: Json | null
          auto_messages?: Json | null
          business_hours?: Json | null
          business_hours_enabled?: boolean | null
          created_at?: string | null
          greeting_text?: string | null
          help_label?: string | null
          help_url?: string | null
          icon_type?: string | null
          id?: string
          is_enabled?: boolean | null
          logo_url?: string | null
          position?: string | null
          primary_color?: string | null
          show_bottom_nav?: boolean | null
          show_help_button?: boolean | null
          show_typing_indicator?: boolean | null
          show_whatsapp_button?: boolean | null
          subtitle?: string | null
          team_avatars?: Json | null
          title?: string | null
          typing_delay_ms?: number | null
          updated_at?: string | null
          user_id?: string
          welcome_message?: string | null
          whatsapp_label?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      checkout_banners: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          product_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          product_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          product_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_banners_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_offers: {
        Row: {
          click_count: number
          created_at: string
          domain: string | null
          id: string
          meta_pixel_ids: string[] | null
          name: string
          popup_model: string | null
          product_name: string | null
          slug: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          click_count?: number
          created_at?: string
          domain?: string | null
          id?: string
          meta_pixel_ids?: string[] | null
          name?: string
          popup_model?: string | null
          product_name?: string | null
          slug?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          click_count?: number
          created_at?: string
          domain?: string | null
          id?: string
          meta_pixel_ids?: string[] | null
          name?: string
          popup_model?: string | null
          product_name?: string | null
          slug?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      checkout_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          is_published: boolean
          layout_config: Json
          name: string
          preview_image_url: string | null
          template_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          is_published?: boolean
          layout_config?: Json
          name: string
          preview_image_url?: string | null
          template_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          is_published?: boolean
          layout_config?: Json
          name?: string
          preview_image_url?: string | null
          template_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      collaborator_permissions: {
        Row: {
          accepted_at: string | null
          can_manage_checkout: boolean | null
          can_manage_financeiro: boolean | null
          can_manage_integrations: boolean | null
          can_manage_products: boolean | null
          can_manage_settings: boolean | null
          can_view_dashboard: boolean | null
          can_view_financeiro: boolean | null
          can_view_transactions: boolean | null
          created_at: string | null
          id: string
          invited_at: string | null
          is_active: boolean | null
          notes: string | null
          owner_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          can_manage_checkout?: boolean | null
          can_manage_financeiro?: boolean | null
          can_manage_integrations?: boolean | null
          can_manage_products?: boolean | null
          can_manage_settings?: boolean | null
          can_view_dashboard?: boolean | null
          can_view_financeiro?: boolean | null
          can_view_transactions?: boolean | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          is_active?: boolean | null
          notes?: string | null
          owner_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          can_manage_checkout?: boolean | null
          can_manage_financeiro?: boolean | null
          can_manage_integrations?: boolean | null
          can_manage_products?: boolean | null
          can_manage_settings?: boolean | null
          can_view_dashboard?: boolean | null
          can_view_financeiro?: boolean | null
          can_view_transactions?: boolean | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          is_active?: boolean | null
          notes?: string | null
          owner_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_global_stats: {
        Row: {
          created_at: string | null
          expired_count: number | null
          generated_amount: number | null
          generated_count: number | null
          id: string
          paid_amount: number | null
          paid_count: number | null
          stat_date: string
          total_fees: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expired_count?: number | null
          generated_amount?: number | null
          generated_count?: number | null
          id?: string
          paid_amount?: number | null
          paid_count?: number | null
          stat_date: string
          total_fees?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expired_count?: number | null
          generated_amount?: number | null
          generated_count?: number | null
          id?: string
          paid_amount?: number | null
          paid_count?: number | null
          stat_date?: string
          total_fees?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_user_stats: {
        Row: {
          created_at: string | null
          expired_count: number | null
          generated_amount: number | null
          generated_count: number | null
          id: string
          paid_amount: number | null
          paid_count: number | null
          stat_date: string
          total_fees: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expired_count?: number | null
          generated_amount?: number | null
          generated_count?: number | null
          id?: string
          paid_amount?: number | null
          paid_count?: number | null
          stat_date: string
          total_fees?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expired_count?: number | null
          generated_amount?: number | null
          generated_count?: number | null
          id?: string
          paid_amount?: number | null
          paid_count?: number | null
          stat_date?: string
          total_fees?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      db_performance_metrics: {
        Row: {
          collected_at: string
          dead_tuples: number | null
          id: string
          index_scans: number | null
          row_count: number | null
          sequential_scans: number | null
          table_name: string
          table_size_bytes: number | null
        }
        Insert: {
          collected_at?: string
          dead_tuples?: number | null
          id?: string
          index_scans?: number | null
          row_count?: number | null
          sequential_scans?: number | null
          table_name: string
          table_size_bytes?: number | null
        }
        Update: {
          collected_at?: string
          dead_tuples?: number | null
          id?: string
          index_scans?: number | null
          row_count?: number | null
          sequential_scans?: number | null
          table_name?: string
          table_size_bytes?: number | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          available_variables: Json | null
          created_at: string | null
          html_content: string
          id: string
          is_customized: boolean | null
          name: string
          subject: string
          template_key: string
          updated_at: string | null
        }
        Insert: {
          available_variables?: Json | null
          created_at?: string | null
          html_content: string
          id?: string
          is_customized?: boolean | null
          name: string
          subject: string
          template_key: string
          updated_at?: string | null
        }
        Update: {
          available_variables?: Json | null
          created_at?: string | null
          html_content?: string
          id?: string
          is_customized?: boolean | null
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fee_configs: {
        Row: {
          boleto_fixed: number
          boleto_percentage: number
          boleto_repasse_days: number
          boleto_repasse_percentage: number
          cartao_fixed: number
          cartao_percentage: number
          cartao_repasse_days: number
          cartao_repasse_percentage: number
          created_at: string
          id: string
          is_default: boolean
          name: string
          pix_fixed: number
          pix_percentage: number
          pix_repasse_days: number
          pix_repasse_percentage: number
          saque_fixed: number
          saque_percentage: number
          updated_at: string
        }
        Insert: {
          boleto_fixed?: number
          boleto_percentage?: number
          boleto_repasse_days?: number
          boleto_repasse_percentage?: number
          cartao_fixed?: number
          cartao_percentage?: number
          cartao_repasse_days?: number
          cartao_repasse_percentage?: number
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          pix_fixed?: number
          pix_percentage?: number
          pix_repasse_days?: number
          pix_repasse_percentage?: number
          saque_fixed?: number
          saque_percentage?: number
          updated_at?: string
        }
        Update: {
          boleto_fixed?: number
          boleto_percentage?: number
          boleto_repasse_days?: number
          boleto_repasse_percentage?: number
          cartao_fixed?: number
          cartao_percentage?: number
          cartao_repasse_days?: number
          cartao_repasse_percentage?: number
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          pix_fixed?: number
          pix_percentage?: number
          pix_repasse_days?: number
          pix_repasse_percentage?: number
          saque_fixed?: number
          saque_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      finance_accounts: {
        Row: {
          bank_name: string | null
          color: string | null
          created_at: string | null
          currency: string
          current_balance: number
          icon: string | null
          id: string
          initial_balance: number
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bank_name?: string | null
          color?: string | null
          created_at?: string | null
          currency?: string
          current_balance?: number
          icon?: string | null
          id?: string
          initial_balance?: number
          is_active?: boolean | null
          name: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bank_name?: string | null
          color?: string | null
          created_at?: string | null
          currency?: string
          current_balance?: number
          icon?: string | null
          id?: string
          initial_balance?: number
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          spending_limit: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          spending_limit?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          spending_limit?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_goals: {
        Row: {
          created_at: string
          current_amount: number | null
          deadline: string | null
          id: string
          is_completed: boolean | null
          name: string
          target_amount: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number | null
          deadline?: string | null
          id?: string
          is_completed?: boolean | null
          name: string
          target_amount: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number | null
          deadline?: string | null
          id?: string
          is_completed?: boolean | null
          name?: string
          target_amount?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          date: string
          description: string | null
          id: string
          is_recurring: boolean | null
          person_type: string | null
          recurring_end_date: string | null
          recurring_frequency: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          person_type?: string | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          person_type?: string | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_conversions: {
        Row: {
          action: string
          created_at: string | null
          funnel_id: string
          id: string
          step_id: string
          transaction_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          funnel_id: string
          id?: string
          step_id: string
          transaction_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          funnel_id?: string
          id?: string
          step_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_conversions_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "sales_funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_conversions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "funnel_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_conversions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pix_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_steps: {
        Row: {
          accept_url: string | null
          background_color: string | null
          button_accept_text: string | null
          button_color: string | null
          button_decline_text: string | null
          created_at: string | null
          decline_url: string | null
          description: string | null
          funnel_id: string
          headline: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          next_step_on_accept: string | null
          next_step_on_decline: string | null
          offer_price: number | null
          offer_product_id: string | null
          original_price: number | null
          position: number
          position_x: number | null
          position_y: number | null
          step_type: string
          timer_seconds: number | null
          title: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          accept_url?: string | null
          background_color?: string | null
          button_accept_text?: string | null
          button_color?: string | null
          button_decline_text?: string | null
          created_at?: string | null
          decline_url?: string | null
          description?: string | null
          funnel_id: string
          headline?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          next_step_on_accept?: string | null
          next_step_on_decline?: string | null
          offer_price?: number | null
          offer_product_id?: string | null
          original_price?: number | null
          position?: number
          position_x?: number | null
          position_y?: number | null
          step_type: string
          timer_seconds?: number | null
          title?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          accept_url?: string | null
          background_color?: string | null
          button_accept_text?: string | null
          button_color?: string | null
          button_decline_text?: string | null
          created_at?: string | null
          decline_url?: string | null
          description?: string | null
          funnel_id?: string
          headline?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          next_step_on_accept?: string | null
          next_step_on_decline?: string | null
          offer_price?: number | null
          offer_product_id?: string | null
          original_price?: number | null
          position?: number
          position_x?: number | null
          position_y?: number | null
          step_type?: string
          timer_seconds?: number | null
          title?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_steps_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "sales_funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_steps_next_accept_fkey"
            columns: ["next_step_on_accept"]
            isOneToOne: false
            referencedRelation: "funnel_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_steps_next_decline_fkey"
            columns: ["next_step_on_decline"]
            isOneToOne: false
            referencedRelation: "funnel_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_steps_offer_product_id_fkey"
            columns: ["offer_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_blacklist: {
        Row: {
          blocked_by: string | null
          created_at: string
          id: string
          ip_address: string
          is_active: boolean | null
          reason: string | null
          total_amount: number | null
          transactions_count: number | null
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          ip_address: string
          is_active?: boolean | null
          reason?: string | null
          total_amount?: number | null
          transactions_count?: number | null
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          is_active?: boolean | null
          reason?: string | null
          total_amount?: number | null
          transactions_count?: number | null
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
      mfa_audit_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string | null
          id: string
          used: boolean | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offer_clicks: {
        Row: {
          clicked_at: string
          id: string
          offer_id: string
          user_id: string
        }
        Insert: {
          clicked_at?: string
          id?: string
          offer_id: string
          user_id: string
        }
        Update: {
          clicked_at?: string
          id?: string
          offer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_clicks_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "checkout_offers"
            referencedColumns: ["id"]
          },
        ]
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
      pix_generation_audit_logs: {
        Row: {
          acquirer: string | null
          amount: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          fallback_used: boolean | null
          id: string
          request_payload: Json | null
          response_payload: Json | null
          retry_count: number | null
          status: string
          success: boolean | null
          txid: string
          user_id: string
        }
        Insert: {
          acquirer?: string | null
          amount: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          fallback_used?: boolean | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number | null
          status?: string
          success?: boolean | null
          txid: string
          user_id: string
        }
        Update: {
          acquirer?: string | null
          amount?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          fallback_used?: boolean | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number | null
          status?: string
          success?: boolean | null
          txid?: string
          user_id?: string
        }
        Relationships: []
      }
      pix_rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string | null
          fingerprint_hash: string
          id: string
          ip_address: string | null
          is_whitelisted: boolean | null
          last_generation_at: string | null
          unpaid_count: number | null
          updated_at: string | null
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string | null
          fingerprint_hash: string
          id?: string
          ip_address?: string | null
          is_whitelisted?: boolean | null
          last_generation_at?: string | null
          unpaid_count?: number | null
          updated_at?: string | null
        }
        Update: {
          blocked_until?: string | null
          created_at?: string | null
          fingerprint_hash?: string
          id?: string
          ip_address?: string | null
          is_whitelisted?: boolean | null
          last_generation_at?: string | null
          unpaid_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pix_transactions: {
        Row: {
          acquirer: string | null
          amount: number
          approved_by_email: string | null
          client_ip: string | null
          created_at: string | null
          created_date_brazil: string | null
          donor_birthdate: string | null
          donor_cep: string | null
          donor_city: string | null
          donor_complement: string | null
          donor_cpf: string | null
          donor_email: string | null
          donor_name: string | null
          donor_neighborhood: string | null
          donor_number: string | null
          donor_phone: string | null
          donor_state: string | null
          donor_street: string | null
          expired_at: string | null
          fee_fixed: number | null
          fee_percentage: number | null
          fingerprint_hash: string | null
          id: string
          is_manual_approval: boolean | null
          offer_id: string | null
          order_bumps: Json | null
          paid_at: string | null
          paid_date_brazil: string | null
          pix_code: string | null
          popup_model: string | null
          product_code: string | null
          product_name: string | null
          status: Database["public"]["Enums"]["pix_status"]
          txid: string | null
          user_id: string
          utm_data: Json | null
        }
        Insert: {
          acquirer?: string | null
          amount: number
          approved_by_email?: string | null
          client_ip?: string | null
          created_at?: string | null
          created_date_brazil?: string | null
          donor_birthdate?: string | null
          donor_cep?: string | null
          donor_city?: string | null
          donor_complement?: string | null
          donor_cpf?: string | null
          donor_email?: string | null
          donor_name?: string | null
          donor_neighborhood?: string | null
          donor_number?: string | null
          donor_phone?: string | null
          donor_state?: string | null
          donor_street?: string | null
          expired_at?: string | null
          fee_fixed?: number | null
          fee_percentage?: number | null
          fingerprint_hash?: string | null
          id?: string
          is_manual_approval?: boolean | null
          offer_id?: string | null
          order_bumps?: Json | null
          paid_at?: string | null
          paid_date_brazil?: string | null
          pix_code?: string | null
          popup_model?: string | null
          product_code?: string | null
          product_name?: string | null
          status?: Database["public"]["Enums"]["pix_status"]
          txid?: string | null
          user_id: string
          utm_data?: Json | null
        }
        Update: {
          acquirer?: string | null
          amount?: number
          approved_by_email?: string | null
          client_ip?: string | null
          created_at?: string | null
          created_date_brazil?: string | null
          donor_birthdate?: string | null
          donor_cep?: string | null
          donor_city?: string | null
          donor_complement?: string | null
          donor_cpf?: string | null
          donor_email?: string | null
          donor_name?: string | null
          donor_neighborhood?: string | null
          donor_number?: string | null
          donor_phone?: string | null
          donor_state?: string | null
          donor_street?: string | null
          expired_at?: string | null
          fee_fixed?: number | null
          fee_percentage?: number | null
          fingerprint_hash?: string | null
          id?: string
          is_manual_approval?: boolean | null
          offer_id?: string | null
          order_bumps?: Json | null
          paid_at?: string | null
          paid_date_brazil?: string | null
          pix_code?: string | null
          popup_model?: string | null
          product_code?: string | null
          product_name?: string | null
          status?: Database["public"]["Enums"]["pix_status"]
          txid?: string | null
          user_id?: string
          utm_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pix_transactions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "checkout_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_transactions_backup: {
        Row: {
          amount: number
          backed_up_at: string
          backed_up_by: string | null
          backup_id: string
          backup_type: string | null
          created_at: string | null
          donor_name: string | null
          expired_at: string | null
          fee_fixed: number | null
          fee_percentage: number | null
          id: string
          original_id: string
          paid_at: string | null
          pix_code: string | null
          popup_model: string | null
          product_name: string | null
          status: string
          txid: string | null
          user_id: string | null
          utm_data: Json | null
        }
        Insert: {
          amount: number
          backed_up_at?: string
          backed_up_by?: string | null
          backup_id: string
          backup_type?: string | null
          created_at?: string | null
          donor_name?: string | null
          expired_at?: string | null
          fee_fixed?: number | null
          fee_percentage?: number | null
          id?: string
          original_id: string
          paid_at?: string | null
          pix_code?: string | null
          popup_model?: string | null
          product_name?: string | null
          status: string
          txid?: string | null
          user_id?: string | null
          utm_data?: Json | null
        }
        Update: {
          amount?: number
          backed_up_at?: string
          backed_up_by?: string | null
          backup_id?: string
          backup_type?: string | null
          created_at?: string | null
          donor_name?: string | null
          expired_at?: string | null
          fee_fixed?: number | null
          fee_percentage?: number | null
          id?: string
          original_id?: string
          paid_at?: string | null
          pix_code?: string | null
          popup_model?: string | null
          product_name?: string | null
          status?: string
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
      product_checkout_configs: {
        Row: {
          back_redirect_url: string | null
          background_color: string | null
          buyer_section_title: string | null
          checkout_subtitle: string | null
          checkout_title: string | null
          countdown_color: string | null
          countdown_minutes: number | null
          countdown_text: string | null
          created_at: string
          custom_button_text: string | null
          delivery_description: string | null
          discount_popup_color: string | null
          discount_popup_cta: string | null
          discount_popup_image_url: string | null
          discount_popup_message: string | null
          discount_popup_percentage: number | null
          discount_popup_title: string | null
          footer_text: string | null
          header_logo_url: string | null
          id: string
          payment_section_title: string | null
          primary_color: string | null
          product_id: string
          product_pixels: Json | null
          require_address: boolean | null
          require_birthdate: boolean | null
          require_cpf: boolean | null
          require_email_confirmation: boolean | null
          require_phone: boolean | null
          security_badge_text: string | null
          selected_pixel_ids: string[] | null
          show_banners: boolean | null
          show_countdown: boolean | null
          show_discount_popup: boolean | null
          show_notifications: boolean | null
          show_product_image: boolean | null
          show_security_badges: boolean | null
          show_video: boolean | null
          show_whatsapp_button: boolean | null
          template: string | null
          template_id: string | null
          thank_you_url: string | null
          updated_at: string
          user_id: string
          video_poster_url: string | null
          video_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          back_redirect_url?: string | null
          background_color?: string | null
          buyer_section_title?: string | null
          checkout_subtitle?: string | null
          checkout_title?: string | null
          countdown_color?: string | null
          countdown_minutes?: number | null
          countdown_text?: string | null
          created_at?: string
          custom_button_text?: string | null
          delivery_description?: string | null
          discount_popup_color?: string | null
          discount_popup_cta?: string | null
          discount_popup_image_url?: string | null
          discount_popup_message?: string | null
          discount_popup_percentage?: number | null
          discount_popup_title?: string | null
          footer_text?: string | null
          header_logo_url?: string | null
          id?: string
          payment_section_title?: string | null
          primary_color?: string | null
          product_id: string
          product_pixels?: Json | null
          require_address?: boolean | null
          require_birthdate?: boolean | null
          require_cpf?: boolean | null
          require_email_confirmation?: boolean | null
          require_phone?: boolean | null
          security_badge_text?: string | null
          selected_pixel_ids?: string[] | null
          show_banners?: boolean | null
          show_countdown?: boolean | null
          show_discount_popup?: boolean | null
          show_notifications?: boolean | null
          show_product_image?: boolean | null
          show_security_badges?: boolean | null
          show_video?: boolean | null
          show_whatsapp_button?: boolean | null
          template?: string | null
          template_id?: string | null
          thank_you_url?: string | null
          updated_at?: string
          user_id: string
          video_poster_url?: string | null
          video_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          back_redirect_url?: string | null
          background_color?: string | null
          buyer_section_title?: string | null
          checkout_subtitle?: string | null
          checkout_title?: string | null
          countdown_color?: string | null
          countdown_minutes?: number | null
          countdown_text?: string | null
          created_at?: string
          custom_button_text?: string | null
          delivery_description?: string | null
          discount_popup_color?: string | null
          discount_popup_cta?: string | null
          discount_popup_image_url?: string | null
          discount_popup_message?: string | null
          discount_popup_percentage?: number | null
          discount_popup_title?: string | null
          footer_text?: string | null
          header_logo_url?: string | null
          id?: string
          payment_section_title?: string | null
          primary_color?: string | null
          product_id?: string
          product_pixels?: Json | null
          require_address?: boolean | null
          require_birthdate?: boolean | null
          require_cpf?: boolean | null
          require_email_confirmation?: boolean | null
          require_phone?: boolean | null
          security_badge_text?: string | null
          selected_pixel_ids?: string[] | null
          show_banners?: boolean | null
          show_countdown?: boolean | null
          show_discount_popup?: boolean | null
          show_notifications?: boolean | null
          show_product_image?: boolean | null
          show_security_badges?: boolean | null
          show_video?: boolean | null
          show_whatsapp_button?: boolean | null
          template?: string | null
          template_id?: string | null
          thank_you_url?: string | null
          updated_at?: string
          user_id?: string
          video_poster_url?: string | null
          video_url?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_checkout_configs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_checkout_configs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checkout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      product_daily_metrics: {
        Row: {
          bm_id: string | null
          budget: number | null
          created_at: string | null
          date: string
          id: string
          link: string | null
          notes: string | null
          offer_id: string | null
          product_id: string | null
          revenue: number | null
          spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bm_id?: string | null
          budget?: number | null
          created_at?: string | null
          date: string
          id?: string
          link?: string | null
          notes?: string | null
          offer_id?: string | null
          product_id?: string | null
          revenue?: number | null
          spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bm_id?: string | null
          budget?: number | null
          created_at?: string | null
          date?: string
          id?: string
          link?: string | null
          notes?: string | null
          offer_id?: string | null
          product_id?: string | null
          revenue?: number | null
          spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_daily_metrics_bm_id_fkey"
            columns: ["bm_id"]
            isOneToOne: false
            referencedRelation: "business_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_daily_metrics_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "checkout_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_daily_metrics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      product_offers: {
        Row: {
          created_at: string
          crosssell_url: string | null
          domain: string | null
          downsell_url: string | null
          id: string
          is_active: boolean
          name: string
          offer_code: string | null
          price: number
          product_id: string
          type: string
          updated_at: string
          upsell_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          crosssell_url?: string | null
          domain?: string | null
          downsell_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          offer_code?: string | null
          price?: number
          product_id: string
          type?: string
          updated_at?: string
          upsell_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          crosssell_url?: string | null
          domain?: string | null
          downsell_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          offer_code?: string | null
          price?: number
          product_id?: string
          type?: string
          updated_at?: string
          upsell_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_order_bumps: {
        Row: {
          bump_price: number
          bump_product_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          position: number | null
          product_id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bump_price: number
          bump_product_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          position?: number | null
          product_id: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bump_price?: number
          bump_product_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          position?: number | null
          product_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_order_bumps_bump_product_id_fkey"
            columns: ["bump_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_order_bumps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_testimonials: {
        Row: {
          author_name: string
          author_photo_url: string | null
          content: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name: string
          author_photo_url?: string | null
          content: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          product_id: string
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          author_photo_url?: string | null
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_testimonials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_upsells: {
        Row: {
          background_color: string | null
          button_color: string | null
          button_text: string | null
          created_at: string | null
          decline_text: string | null
          description: string | null
          headline: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          original_price: number | null
          position: number | null
          product_id: string
          timer_seconds: number | null
          title: string
          updated_at: string | null
          upsell_price: number
          upsell_product_id: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          background_color?: string | null
          button_color?: string | null
          button_text?: string | null
          created_at?: string | null
          decline_text?: string | null
          description?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          original_price?: number | null
          position?: number | null
          product_id: string
          timer_seconds?: number | null
          title?: string
          updated_at?: string | null
          upsell_price: number
          upsell_product_id: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          background_color?: string | null
          button_color?: string | null
          button_text?: string | null
          created_at?: string | null
          decline_text?: string | null
          description?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          original_price?: number | null
          position?: number | null
          product_id?: string
          timer_seconds?: number | null
          title?: string
          updated_at?: string | null
          upsell_price?: number
          upsell_product_id?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_upsells_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_upsells_upsell_product_id_fkey"
            columns: ["upsell_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          delivery_file_url: string | null
          delivery_link: string | null
          description: string | null
          folder_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          product_code: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          delivery_file_url?: string | null
          delivery_link?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          product_code?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          delivery_file_url?: string | null
          delivery_link?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          product_code?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
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
          bypass_antifraud: boolean | null
          created_at: string
          full_name: string | null
          id: string
          is_approved: boolean
          updated_at: string
        }
        Insert: {
          bypass_antifraud?: boolean | null
          created_at?: string
          full_name?: string | null
          id: string
          is_approved?: boolean
          updated_at?: string
        }
        Update: {
          bypass_antifraud?: boolean | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_events: {
        Row: {
          created_at: string
          event_type: string
          fingerprint_hash: string
          id: string
          ip_address: string | null
          reason: string | null
          unpaid_count: number | null
        }
        Insert: {
          created_at?: string
          event_type: string
          fingerprint_hash: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          unpaid_count?: number | null
        }
        Update: {
          created_at?: string
          event_type?: string
          fingerprint_hash?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          unpaid_count?: number | null
        }
        Relationships: []
      }
      retry_configurations: {
        Row: {
          acquirer_order: string[]
          created_at: string
          delay_between_retries_ms: number
          enabled: boolean
          id: string
          max_retries: number
          payment_method: string
          updated_at: string
        }
        Insert: {
          acquirer_order?: string[]
          created_at?: string
          delay_between_retries_ms?: number
          enabled?: boolean
          id?: string
          max_retries?: number
          payment_method?: string
          updated_at?: string
        }
        Update: {
          acquirer_order?: string[]
          created_at?: string
          delay_between_retries_ms?: number
          enabled?: boolean
          id?: string
          max_retries?: number
          payment_method?: string
          updated_at?: string
        }
        Relationships: []
      }
      retry_flow_steps: {
        Row: {
          acquirer: string
          created_at: string
          id: string
          is_active: boolean
          payment_method: string
          step_order: number
          updated_at: string
        }
        Insert: {
          acquirer: string
          created_at?: string
          id?: string
          is_active?: boolean
          payment_method?: string
          step_order: number
          updated_at?: string
        }
        Update: {
          acquirer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          payment_method?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      reward_requests: {
        Row: {
          created_at: string
          delivery_address: string | null
          id: string
          requested_at: string
          reward_id: string
          sent_at: string | null
          status: string
          tracking_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_address?: string | null
          id?: string
          requested_at?: string
          reward_id: string
          sent_at?: string | null
          status?: string
          tracking_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_address?: string | null
          id?: string
          requested_at?: string
          reward_id?: string
          sent_at?: string | null
          status?: string
          tracking_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_requests_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          delivery_method: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          threshold_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_method?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          threshold_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_method?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          threshold_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      sales_funnels: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          origin_url: string | null
          product_id: string
          thank_you_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          origin_url?: string | null
          product_id: string
          thank_you_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          origin_url?: string | null
          product_id?: string
          thank_you_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_funnels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      system_backups: {
        Row: {
          admin_settings_data: Json | null
          available_domains_data: Json | null
          backed_up_at: string
          backed_up_by: string | null
          backup_name: string
          backup_type: string
          checkout_offers_data: Json | null
          checkout_templates_data: Json | null
          created_at: string
          fee_configs_data: Json | null
          id: string
          pix_transactions_data: Json | null
          popup_configurations_data: Json | null
          product_checkout_configs_data: Json | null
          product_folders_data: Json | null
          product_offers_data: Json | null
          product_testimonials_data: Json | null
          products_data: Json | null
          profiles_data: Json | null
          reward_requests_data: Json | null
          rewards_data: Json | null
          size_bytes: number | null
          total_records: number | null
          withdrawal_requests_data: Json | null
        }
        Insert: {
          admin_settings_data?: Json | null
          available_domains_data?: Json | null
          backed_up_at?: string
          backed_up_by?: string | null
          backup_name: string
          backup_type?: string
          checkout_offers_data?: Json | null
          checkout_templates_data?: Json | null
          created_at?: string
          fee_configs_data?: Json | null
          id?: string
          pix_transactions_data?: Json | null
          popup_configurations_data?: Json | null
          product_checkout_configs_data?: Json | null
          product_folders_data?: Json | null
          product_offers_data?: Json | null
          product_testimonials_data?: Json | null
          products_data?: Json | null
          profiles_data?: Json | null
          reward_requests_data?: Json | null
          rewards_data?: Json | null
          size_bytes?: number | null
          total_records?: number | null
          withdrawal_requests_data?: Json | null
        }
        Update: {
          admin_settings_data?: Json | null
          available_domains_data?: Json | null
          backed_up_at?: string
          backed_up_by?: string | null
          backup_name?: string
          backup_type?: string
          checkout_offers_data?: Json | null
          checkout_templates_data?: Json | null
          created_at?: string
          fee_configs_data?: Json | null
          id?: string
          pix_transactions_data?: Json | null
          popup_configurations_data?: Json | null
          product_checkout_configs_data?: Json | null
          product_folders_data?: Json | null
          product_offers_data?: Json | null
          product_testimonials_data?: Json | null
          products_data?: Json | null
          profiles_data?: Json | null
          reward_requests_data?: Json | null
          rewards_data?: Json | null
          size_bytes?: number | null
          total_records?: number | null
          withdrawal_requests_data?: Json | null
        }
        Relationships: []
      }
      upsell_transactions: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          declined_at: string | null
          id: string
          original_transaction_id: string
          paid_at: string | null
          status: string | null
          updated_at: string | null
          upsell_id: string
          upsell_transaction_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          id?: string
          original_transaction_id: string
          paid_at?: string | null
          status?: string | null
          updated_at?: string | null
          upsell_id: string
          upsell_transaction_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          id?: string
          original_transaction_id?: string
          paid_at?: string | null
          status?: string | null
          updated_at?: string | null
          upsell_id?: string
          upsell_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upsell_transactions_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "pix_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_transactions_upsell_id_fkey"
            columns: ["upsell_id"]
            isOneToOne: false
            referencedRelation: "product_upsells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_transactions_upsell_transaction_id_fkey"
            columns: ["upsell_transaction_id"]
            isOneToOne: false
            referencedRelation: "pix_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_documents: {
        Row: {
          created_at: string | null
          document_side: string | null
          document_type: string
          file_url: string
          id: string
          person_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_side?: string | null
          document_type: string
          file_url: string
          id?: string
          person_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_side?: string | null
          document_type?: string
          file_url?: string
          id?: string
          person_type?: string
          updated_at?: string | null
          user_id?: string
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
      user_verification: {
        Row: {
          created_at: string | null
          document_type_selected: string
          id: string
          person_type: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_type_selected: string
          id?: string
          person_type: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_type_selected?: string
          id?: string
          person_type?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          api_client_id: string | null
          attempts: number | null
          created_at: string | null
          event_type: string
          id: string
          last_attempt_at: string | null
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string | null
          transaction_id: string | null
          webhook_url: string
        }
        Insert: {
          api_client_id?: string | null
          attempts?: number | null
          created_at?: string | null
          event_type: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string | null
          transaction_id?: string | null
          webhook_url: string
        }
        Update: {
          api_client_id?: string | null
          attempts?: number | null
          created_at?: string | null
          event_type?: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string | null
          transaction_id?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_api_client_id_fkey"
            columns: ["api_client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          available_balance_at_action: number
          created_at: string | null
          error_message: string | null
          gross_amount: number
          id: string
          metadata: Json | null
          net_amount: number
          user_id: string
          validation_passed: boolean
          withdrawal_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          available_balance_at_action: number
          created_at?: string | null
          error_message?: string | null
          gross_amount: number
          id?: string
          metadata?: Json | null
          net_amount: number
          user_id: string
          validation_passed: boolean
          withdrawal_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          available_balance_at_action?: number
          created_at?: string | null
          error_message?: string | null
          gross_amount?: number
          id?: string
          metadata?: Json | null
          net_amount?: number
          user_id?: string
          validation_passed?: boolean
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_audit_log_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          acquirer: string | null
          amount: number
          bank_code: string
          bank_name: string
          created_at: string
          fee_fixed: number | null
          fee_percentage: number | null
          gross_amount: number | null
          id: string
          pix_key: string
          pix_key_type: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          acquirer?: string | null
          amount: number
          bank_code: string
          bank_name: string
          created_at?: string
          fee_fixed?: number | null
          fee_percentage?: number | null
          gross_amount?: number | null
          id?: string
          pix_key: string
          pix_key_type: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          acquirer?: string | null
          amount?: number
          bank_code?: string
          bank_name?: string
          created_at?: string
          fee_fixed?: number | null
          fee_percentage?: number | null
          gross_amount?: number | null
          id?: string
          pix_key?: string
          pix_key_type?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_collaborator: {
        Args: { _collaborator_email: string; _permissions: Json }
        Returns: string
      }
      admin_can_reset_2fa: { Args: { p_user_id: string }; Returns: boolean }
      apply_default_acquirer_to_all: {
        Args: { p_acquirer: string }
        Returns: Json
      }
      approve_document_verification: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      approve_user: { Args: { target_user_id: string }; Returns: boolean }
      approve_withdrawal: {
        Args: { p_admin_notes?: string; p_withdrawal_id: string }
        Returns: Json
      }
      auto_backup_transactions: { Args: never; Returns: string }
      auto_expire_pix_cron: { Args: never; Returns: undefined }
      auto_full_system_backup: { Args: never; Returns: string }
      backup_and_reset_transactions: { Args: never; Returns: string }
      block_user: { Args: { target_user_id: string }; Returns: boolean }
      bootstrap_first_admin: { Args: { admin_email: string }; Returns: boolean }
      check_antifraud_bypass: { Args: { p_user_id: string }; Returns: boolean }
      check_login_blocked: { Args: { p_email: string }; Returns: Json }
      check_user_approved: { Args: never; Returns: boolean }
      check_user_blocked: { Args: never; Returns: boolean }
      cleanup_api_monitoring_events: { Args: never; Returns: undefined }
      cleanup_api_monitoring_events_optimized: {
        Args: never
        Returns: undefined
      }
      cleanup_old_monitoring_events: { Args: never; Returns: undefined }
      cleanup_old_rate_limit_events: { Args: never; Returns: undefined }
      cleanup_rate_limit_events: { Args: never; Returns: undefined }
      cleanup_rate_limit_events_optimized: { Args: never; Returns: undefined }
      collect_db_performance_metrics: { Args: never; Returns: undefined }
      count_backup_codes: { Args: never; Returns: number }
      create_api_client: {
        Args: { p_name: string; p_webhook_url?: string }
        Returns: {
          api_key: string
          api_key_prefix: string
          created_at: string
          id: string
          name: string
          webhook_url: string
        }[]
      }
      create_full_system_backup: { Args: never; Returns: string }
      create_light_backup:
        | { Args: never; Returns: string }
        | { Args: { p_created_by?: string }; Returns: string }
      create_manual_backup: { Args: never; Returns: string }
      delete_api_client: { Args: { p_client_id: string }; Returns: boolean }
      delete_system_backup: { Args: { p_backup_id: string }; Returns: boolean }
      delete_test_transaction: {
        Args: { p_transaction_id: string }
        Returns: boolean
      }
      delete_test_transactions: {
        Args: { transaction_ids: string[] }
        Returns: number
      }
      delete_transaction_backup: {
        Args: { p_backup_id: string }
        Returns: boolean
      }
      delete_user: { Args: { target_user_id: string }; Returns: boolean }
      expire_old_pix_transactions_batch: {
        Args: { batch_size?: number }
        Returns: {
          expired_count: number
          remaining_count: number
        }[]
      }
      export_full_backup: { Args: never; Returns: Json }
      generate_api_key: {
        Args: never
        Returns: {
          api_key: string
          api_key_hash: string
          api_key_prefix: string
        }[]
      }
      generate_backup_codes: { Args: { p_count?: number }; Returns: string[] }
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
          is_approved: boolean
          is_blocked: boolean
          last_sign_in_at: string
        }[]
      }
      get_all_users_available_balance: { Args: never; Returns: number }
      get_all_withdrawals_admin: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          bank_code: string
          bank_name: string
          created_at: string
          fee_fixed: number
          fee_percentage: number
          gross_amount: number
          id: string
          pix_key: string
          pix_key_type: string
          processed_at: string
          rejection_reason: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_email: string
          user_id: string
        }[]
      }
      get_api_client_stats: { Args: { p_client_id: string }; Returns: Json }
      get_api_events_by_period: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          acquirer: string
          created_at: string
          error_message: string
          event_type: string
          id: string
          response_time_ms: number
          retry_attempt: number
        }[]
      }
      get_api_health_summary: { Args: never; Returns: Json }
      get_available_transaction_years: { Args: never; Returns: Json }
      get_chart_data_by_day: {
        Args: { p_days?: number }
        Returns: {
          date_brazil: string
          gerados: number
          pagos: number
          valor_pago: number
        }[]
      }
      get_chart_data_by_hour: {
        Args: { p_date: string }
        Returns: {
          gerados: number
          hour_brazil: number
          pagos: number
          valor_pago: number
        }[]
      }
      get_checkout_offer_by_slug: {
        Args: { p_slug: string }
        Returns: {
          domain: string
          id: string
          meta_pixel_ids: string[]
          name: string
          popup_model: string
          product_name: string
          user_id: string
          video_url: string
        }[]
      }
      get_db_performance_summary: { Args: never; Returns: Json }
      get_effective_owner_id: { Args: { _user_id: string }; Returns: string }
      get_global_banner_url: { Args: never; Returns: string }
      get_global_billing_goal: { Args: never; Returns: number }
      get_global_dashboard_v2: { Args: never; Returns: Json }
      get_global_notification_settings: {
        Args: never
        Returns: {
          key: string
          value: string
        }[]
      }
      get_global_transactions_paginated:
        | {
            Args: {
              p_date_filter?: string
              p_limit?: number
              p_offset?: number
              p_search?: string
              p_status_filter?: string
            }
            Returns: {
              acquirer: string
              amount: number
              approved_by_email: string
              client_ip: string
              created_at: string
              donor_cpf: string
              donor_email: string
              donor_name: string
              fee_fixed: number
              fee_percentage: number
              id: string
              is_manual_approval: boolean
              order_bumps: Json
              paid_at: string
              popup_model: string
              product_name: string
              status: string
              total_count: number
              txid: string
              user_email: string
              user_id: string
              user_name: string
              utm_data: Json
            }[]
          }
        | {
            Args: {
              p_date_filter?: string
              p_end_date?: string
              p_page?: number
              p_per_page?: number
              p_search?: string
              p_start_date?: string
              p_status?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_end_date?: string
              p_page?: number
              p_per_page?: number
              p_search?: string
              p_start_date?: string
              p_status?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cursor?: string
              p_end_date?: string
              p_page_size?: number
              p_search?: string
              p_start_date?: string
              p_status?: string
              p_user_id?: string
            }
            Returns: {
              acquirer: string
              amount: number
              client_ip: string
              created_at: string
              donor_cpf: string
              donor_email: string
              donor_name: string
              donor_phone: string
              expired_at: string
              fee_fixed: number
              fee_percentage: number
              id: string
              offer_code: string
              offer_domain: string
              offer_id: string
              order_bumps: Json
              paid_at: string
              pix_code: string
              popup_model: string
              product_code: string
              product_name: string
              status: string
              txid: string
              user_id: string
              utm_data: Json
            }[]
          }
        | {
            Args: {
              p_end_date?: string
              p_page_number?: number
              p_page_size?: number
              p_popup_model?: string
              p_search?: string
              p_start_date?: string
              p_status?: string
            }
            Returns: {
              acquirer: string
              amount: number
              approved_by_email: string
              created_at: string
              donor_cep: string
              donor_city: string
              donor_complement: string
              donor_cpf: string
              donor_email: string
              donor_name: string
              donor_neighborhood: string
              donor_number: string
              donor_phone: string
              donor_state: string
              donor_street: string
              expired_at: string
              id: string
              is_manual_approval: boolean
              offer_code: string
              offer_domain: string
              offer_id: string
              order_bumps: Json
              paid_at: string
              pix_code: string
              popup_model: string
              product_code: string
              product_name: string
              status: string
              txid: string
              user_id: string
              utm_data: Json
            }[]
          }
      get_global_transactions_v2: {
        Args: {
          p_date_filter?: string
          p_email_search?: string
          p_limit?: number
          p_offset?: number
          p_status?: string
        }
        Returns: {
          acquirer: string
          amount: number
          approved_by_email: string
          created_at: string
          donor_name: string
          id: string
          is_manual_approval: boolean
          paid_at: string
          product_name: string
          status: Database["public"]["Enums"]["pix_status"]
          total_count: number
          txid: string
          user_email: string
          utm_data: Json
        }[]
      }
      get_healthy_acquirers: {
        Args: never
        Returns: {
          acquirer: string
          avg_response_time_ms: number
        }[]
      }
      get_my_collaborators: {
        Args: never
        Returns: {
          accepted_at: string
          can_manage_checkout: boolean
          can_manage_financeiro: boolean
          can_manage_integrations: boolean
          can_manage_products: boolean
          can_manage_settings: boolean
          can_view_dashboard: boolean
          can_view_financeiro: boolean
          can_view_transactions: boolean
          id: string
          invited_at: string
          is_active: boolean
          notes: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_my_permissions: {
        Args: never
        Returns: {
          can_manage_checkout: boolean
          can_manage_financeiro: boolean
          can_manage_integrations: boolean
          can_manage_products: boolean
          can_manage_settings: boolean
          can_view_dashboard: boolean
          can_view_financeiro: boolean
          can_view_transactions: boolean
          id: string
          is_active: boolean
          is_collaborator: boolean
          owner_email: string
          owner_id: string
          owner_name: string
        }[]
      }
      get_my_verification_status: {
        Args: never
        Returns: {
          created_at: string
          document_type_selected: string
          id: string
          person_type: string
          rejection_reason: string
          reviewed_at: string
          status: string
        }[]
      }
      get_offer_clicks_chart: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          clicks: number
          date: string
        }[]
      }
      get_offer_stats: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          conversion_rate: number
          offer_id: string
          total_generated: number
          total_paid: number
        }[]
      }
      get_pending_reward_requests: {
        Args: never
        Returns: {
          delivery_address: string
          id: string
          requested_at: string
          reward_id: string
          reward_image_url: string
          reward_name: string
          user_email: string
          user_id: string
        }[]
      }
      get_pending_verifications: {
        Args: never
        Returns: {
          created_at: string
          document_type_selected: string
          id: string
          person_type: string
          status: string
          user_email: string
          user_id: string
        }[]
      }
      get_pending_withdrawals: {
        Args: never
        Returns: {
          amount: number
          bank_code: string
          bank_name: string
          created_at: string
          id: string
          pix_key: string
          pix_key_type: string
          user_email: string
          user_id: string
        }[]
      }
      get_pix_dashboard_auth: { Args: never; Returns: Json }
      get_pix_dashboard_auth_v2: { Args: never; Returns: Json }
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
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          acquirer: string
          amount: number
          created_at: string
          donor_name: string
          fee_fixed: number
          fee_percentage: number
          id: string
          paid_at: string
          product_name: string
          status: Database["public"]["Enums"]["pix_status"]
          txid: string
          user_email: string
          utm_data: Json
        }[]
      }
      get_pix_transactions_count: { Args: never; Returns: number }
      get_pixel_ids_for_offer: {
        Args: { p_offer_id: string }
        Returns: string[]
      }
      get_platform_revenue_chart: {
        Args: { p_filter?: string; p_user_email?: string }
        Returns: {
          acquirer_cost: number
          date: string
          gross_revenue: number
          net_profit: number
          transaction_count: number
        }[]
      }
      get_platform_revenue_chart_monthly: {
        Args: { p_user_email?: string }
        Returns: {
          lucro: number
          month_name: string
          month_number: number
        }[]
      }
      get_platform_revenue_stats:
        | { Args: never; Returns: Json }
        | { Args: { p_user_email?: string }; Returns: Json }
        | {
            Args: { p_month?: number; p_user_id?: string; p_year?: number }
            Returns: Json
          }
      get_platform_revenue_stats_custom_range: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      get_platform_unique_users: { Args: never; Returns: Json }
      get_platform_user_profit_ranking: {
        Args: { p_filter?: string; p_limit?: number }
        Returns: Json
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
      get_product_folder_counts: { Args: { p_user_id: string }; Returns: Json }
      get_products_paginated: {
        Args: {
          p_folder_id?: string
          p_page?: number
          p_per_page?: number
          p_search?: string
          p_status?: string
          p_user_id: string
        }
        Returns: Json
      }
      get_products_paginated_with_performance:
        | {
            Args: {
              p_folder_id?: string
              p_page?: number
              p_per_page?: number
              p_search?: string
              p_status?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_folder_id?: string
              p_page?: number
              p_page_size?: number
              p_search?: string
              p_user_id: string
            }
            Returns: Json
          }
      get_products_performance: {
        Args: { p_user_id: string }
        Returns: {
          conversion_rate: number
          performance_score: number
          product_id: string
          product_name: string
          revenue: number
          total_generated: number
          total_paid: number
        }[]
      }
      get_public_checkout_config: {
        Args: { p_product_id: string }
        Returns: {
          back_redirect_url: string
          background_color: string
          buyer_section_title: string
          checkout_subtitle: string
          checkout_title: string
          countdown_color: string
          countdown_minutes: number
          countdown_text: string
          custom_button_text: string
          delivery_description: string
          discount_popup_color: string
          discount_popup_cta: string
          discount_popup_image_url: string
          discount_popup_message: string
          discount_popup_percentage: number
          discount_popup_title: string
          footer_text: string
          header_logo_url: string
          id: string
          payment_section_title: string
          primary_color: string
          product_id: string
          require_address: boolean
          require_birthdate: boolean
          require_cpf: boolean
          require_email_confirmation: boolean
          require_phone: boolean
          security_badge_text: string
          show_banners: boolean
          show_countdown: boolean
          show_discount_popup: boolean
          show_notifications: boolean
          show_product_image: boolean
          show_security_badges: boolean
          show_video: boolean
          show_whatsapp_button: boolean
          template: string
          thank_you_url: string
          user_id: string
          video_url: string
          whatsapp_number: string
        }[]
      }
      get_public_offer_by_code: {
        Args: { p_offer_code: string }
        Returns: {
          crosssell_url: string
          domain: string
          downsell_url: string
          id: string
          name: string
          offer_code: string
          price: number
          product_code: string
          product_description: string
          product_id: string
          product_image_url: string
          product_name: string
          product_price: number
          type: string
          upsell_url: string
        }[]
      }
      get_public_order_bumps: {
        Args: { p_product_id: string }
        Returns: {
          bump_price: number
          bump_product_id: string
          bump_product_image_url: string
          bump_product_name: string
          description: string
          id: string
          image_url: string
          title: string
        }[]
      }
      get_public_product_by_code: {
        Args: { p_product_code: string }
        Returns: {
          description: string
          id: string
          image_url: string
          is_active: boolean
          name: string
          price: number
          product_code: string
          website_url: string
        }[]
      }
      get_public_product_by_id: {
        Args: { p_product_id: string }
        Returns: {
          description: string
          id: string
          image_url: string
          is_active: boolean
          name: string
          price: number
          product_code: string
          website_url: string
        }[]
      }
      get_rate_limit_chart_data: {
        Args: { p_days?: number }
        Returns: {
          blocks: number
          cooldowns: number
          date: string
        }[]
      }
      get_rate_limit_stats: { Args: never; Returns: Json }
      get_recent_api_events: {
        Args: { p_limit?: number }
        Returns: {
          acquirer: string
          created_at: string
          error_message: string
          event_type: string
          id: string
          response_time_ms: number
          retry_attempt: number
        }[]
      }
      get_sent_reward_requests: {
        Args: never
        Returns: {
          delivery_address: string
          id: string
          requested_at: string
          reward_id: string
          reward_image_url: string
          reward_name: string
          sent_at: string
          tracking_code: string
          user_email: string
          user_id: string
        }[]
      }
      get_storage_files_for_backup: {
        Args: never
        Returns: {
          bucket_id: string
          created_at: string
          file_name: string
          file_path: string
          mimetype: string
          public_url: string
          size_bytes: number
        }[]
      }
      get_storage_stats_for_backup: { Args: never; Returns: Json }
      get_system_backups: {
        Args: never
        Returns: {
          backed_up_at: string
          backed_up_by_email: string
          backup_name: string
          backup_type: string
          fee_count: number
          id: string
          pix_count: number
          products_count: number
          profiles_count: number
          settings_count: number
          total_records: number
          withdrawal_count: number
        }[]
      }
      get_transaction_backups: {
        Args: never
        Returns: {
          backed_up_at: string
          backed_up_by_email: string
          backup_id: string
          backup_type: string
          transaction_count: number
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
      get_user_api_clients: {
        Args: never
        Returns: {
          api_key_prefix: string
          created_at: string
          id: string
          is_active: boolean
          last_request_at: string
          name: string
          rate_limit_per_minute: number
          total_requests: number
          webhook_url: string
        }[]
      }
      get_user_available_balance: { Args: never; Returns: number }
      get_user_available_balance_admin: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_balance_details: { Args: never; Returns: Json }
      get_user_balance_for_admin: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_by_email: {
        Args: { _email: string }
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      get_user_chart_data_by_day: {
        Args: { p_days?: number }
        Returns: {
          date_brazil: string
          gerados: number
          pagos: number
          valor_pago: number
        }[]
      }
      get_user_chart_data_by_hour: {
        Args: { p_date?: string }
        Returns: {
          gerados: number
          hour_brazil: number
          pagos: number
          valor_pago: number
        }[]
      }
      get_user_dashboard_v2: { Args: never; Returns: Json }
      get_user_documents_admin: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          document_side: string
          document_type: string
          file_url: string
          id: string
        }[]
      }
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
      get_user_stats_by_period: {
        Args: {
          p_end_date?: string
          p_period?: string
          p_platform?: string
          p_start_date?: string
          p_status?: string
        }
        Returns: Json
      }
      get_user_total_paid: { Args: { p_user_id: string }; Returns: number }
      get_user_transactions: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          acquirer: string
          amount: number
          created_at: string
          donor_name: string
          fee_fixed: number
          fee_percentage: number
          id: string
          paid_at: string
          product_name: string
          status: Database["public"]["Enums"]["pix_status"]
          txid: string
          utm_data: Json
        }[]
      }
      get_user_transactions_paginated:
        | {
            Args: {
              p_date_filter?: string
              p_end_date?: string
              p_items_per_page?: number
              p_page?: number
              p_platform_filter?: string
              p_search?: string
              p_start_date?: string
              p_status_filter?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_date_filter?: string
              p_end_date?: string
              p_items_per_page?: number
              p_page?: number
              p_platform_filter?: string
              p_search_query?: string
              p_start_date?: string
              p_status_filter?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_date_filter: string
              p_end_date?: string
              p_page: number
              p_per_page: number
              p_platform_filter: string
              p_search: string
              p_start_date?: string
              p_status_filter: string
              p_user_id: string
            }
            Returns: {
              pages: number
              total: number
              transactions: Json
            }[]
          }
        | {
            Args: {
              p_end_date?: string
              p_page?: number
              p_per_page?: number
              p_search?: string
              p_start_date?: string
              p_status_filter?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cursor?: string
              p_end_date?: string
              p_page_size?: number
              p_search?: string
              p_start_date?: string
              p_status?: string
              p_user_id: string
            }
            Returns: {
              acquirer: string
              amount: number
              client_ip: string
              created_at: string
              donor_cpf: string
              donor_email: string
              donor_name: string
              donor_phone: string
              expired_at: string
              fee_fixed: number
              fee_percentage: number
              id: string
              offer_code: string
              offer_domain: string
              offer_id: string
              order_bumps: Json
              paid_at: string
              pix_code: string
              popup_model: string
              product_code: string
              product_name: string
              status: string
              txid: string
              utm_data: Json
            }[]
          }
        | {
            Args: {
              p_end_date?: string
              p_page_number?: number
              p_page_size?: number
              p_popup_model?: string
              p_search?: string
              p_start_date?: string
              p_status?: string
              p_user_id: string
            }
            Returns: {
              acquirer: string
              amount: number
              approved_by_email: string
              created_at: string
              donor_cep: string
              donor_city: string
              donor_complement: string
              donor_cpf: string
              donor_email: string
              donor_name: string
              donor_neighborhood: string
              donor_number: string
              donor_phone: string
              donor_state: string
              donor_street: string
              expired_at: string
              id: string
              is_manual_approval: boolean
              offer_code: string
              offer_domain: string
              offer_id: string
              order_bumps: Json
              paid_at: string
              pix_code: string
              popup_model: string
              product_code: string
              product_name: string
              status: string
              txid: string
              utm_data: Json
            }[]
          }
      get_user_webhook_deliveries: {
        Args: { p_client_id?: string; p_limit?: number }
        Returns: {
          api_client_id: string
          api_client_name: string
          attempts: number
          created_at: string
          event_type: string
          id: string
          last_attempt_at: string
          response_body: string
          response_status: number
          status: string
          transaction_id: string
          webhook_url: string
        }[]
      }
      get_user_webhook_stats: { Args: never; Returns: Json }
      get_user_withdrawals: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          bank_name: string
          created_at: string
          id: string
          pix_key: string
          processed_at: string
          rejection_reason: string
          status: Database["public"]["Enums"]["withdrawal_status"]
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
      get_users_revenue_ranking_v2: {
        Args: { p_date_filter?: string; p_limit?: number; p_offset?: number }
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
      get_utmify_events: {
        Args: { p_limit?: number; p_offset?: number; p_period?: string }
        Returns: {
          created_at: string
          error_message: string
          event_type: string
          id: string
          response_time_ms: number
          total_count: number
        }[]
      }
      get_utmify_summary: { Args: never; Returns: Json }
      get_webhook_secret: { Args: { p_client_id: string }; Returns: string }
      grant_admin_role: { Args: { target_user_id: string }; Returns: boolean }
      has_collaborator_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_full_backup: { Args: { p_backup_data: Json }; Returns: Json }
      increment_login_attempt: { Args: { p_email: string }; Returns: Json }
      increment_offer_clicks: { Args: { offer_id: string }; Returns: undefined }
      is_active_product: { Args: { p_product_id: string }; Returns: boolean }
      is_admin_authenticated: { Args: never; Returns: boolean }
      is_any_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_authenticated: { Args: never; Returns: boolean }
      log_pix_generated_user:
        | {
            Args: {
              p_acquirer?: string
              p_amount: number
              p_donor_birthdate?: string
              p_donor_cep?: string
              p_donor_city?: string
              p_donor_complement?: string
              p_donor_cpf?: string
              p_donor_email?: string
              p_donor_name?: string
              p_donor_neighborhood?: string
              p_donor_number?: string
              p_donor_phone?: string
              p_donor_state?: string
              p_donor_street?: string
              p_fee_fixed?: number
              p_fee_percentage?: number
              p_offer_id?: string
              p_order_bumps?: Json
              p_pix_code: string
              p_popup_model?: string
              p_product_code?: string
              p_product_name?: string
              p_status: string
              p_txid: string
              p_user_id?: string
              p_utm_data?: Json
            }
            Returns: string
          }
        | {
            Args: {
              p_acquirer?: string
              p_amount: number
              p_client_ip?: string
              p_donor_birthdate?: string
              p_donor_cep?: string
              p_donor_city?: string
              p_donor_complement?: string
              p_donor_cpf?: string
              p_donor_email?: string
              p_donor_name?: string
              p_donor_neighborhood?: string
              p_donor_number?: string
              p_donor_phone?: string
              p_donor_state?: string
              p_donor_street?: string
              p_fee_fixed?: number
              p_fee_percentage?: number
              p_fingerprint_hash?: string
              p_order_bumps?: Json
              p_pix_code: string
              p_popup_model?: string
              p_product_name?: string
              p_txid: string
              p_user_id: string
              p_utm_data?: Json
            }
            Returns: string
          }
      mark_pix_paid: {
        Args: { p_admin_email?: string; p_txid: string }
        Returns: boolean
      }
      mark_pix_refunded: {
        Args: {
          p_external_id: string
          p_notes?: string
          p_reason?: string
          p_source?: string
          p_transaction_id: string
        }
        Returns: Json
      }
      mark_reward_sent: {
        Args: { p_request_id: string; p_tracking_code?: string }
        Returns: boolean
      }
      populate_daily_global_stats: { Args: never; Returns: undefined }
      populate_daily_user_stats: { Args: never; Returns: undefined }
      process_withdrawal: {
        Args: {
          p_rejection_reason?: string
          p_status: Database["public"]["Enums"]["withdrawal_status"]
          p_withdrawal_id: string
        }
        Returns: boolean
      }
      regenerate_webhook_secret: {
        Args: { p_client_id: string }
        Returns: string
      }
      reject_document_verification: {
        Args: { p_reason: string; p_user_id: string }
        Returns: boolean
      }
      reject_withdrawal: {
        Args: { p_rejection_reason: string; p_withdrawal_id: string }
        Returns: Json
      }
      remove_collaborator: {
        Args: { _collaborator_id: string }
        Returns: boolean
      }
      request_withdrawal: {
        Args: {
          p_acquirer?: string
          p_amount: number
          p_bank_code: string
          p_bank_name: string
          p_pix_key: string
          p_pix_key_type: string
        }
        Returns: Json
      }
      reset_login_attempts: { Args: { p_email: string }; Returns: boolean }
      reset_pix_transactions: {
        Args: { input_token: string }
        Returns: boolean
      }
      reset_pix_transactions_auth: { Args: never; Returns: boolean }
      reset_user_transactions: { Args: never; Returns: boolean }
      restore_full_system_backup: {
        Args: { p_backup_id: string }
        Returns: boolean
      }
      restore_transactions_from_backup: {
        Args: { p_backup_id: string }
        Returns: boolean
      }
      retry_webhook_delivery: {
        Args: { p_delivery_id: string }
        Returns: boolean
      }
      revert_manual_approval: {
        Args: { p_admin_email: string; p_txid: string }
        Returns: Json
      }
      revoke_admin_role: { Args: { target_user_id: string }; Returns: boolean }
      revoke_user_approval: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      set_default_acquirer_with_retry_order: {
        Args: { p_acquirer: string }
        Returns: Json
      }
      set_user_antifraud_bypass: {
        Args: { p_bypass: boolean; p_user_id: string }
        Returns: boolean
      }
      unblock_user: { Args: { target_user_id: string }; Returns: boolean }
      update_acquirer_health: {
        Args: {
          p_acquirer: string
          p_error_message?: string
          p_is_healthy: boolean
          p_response_time_ms?: number
        }
        Returns: undefined
      }
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
      update_api_client: {
        Args: {
          p_client_id: string
          p_is_active?: boolean
          p_name?: string
          p_webhook_url?: string
        }
        Returns: boolean
      }
      update_collaborator_permissions: {
        Args: { _collaborator_id: string; _permissions: Json }
        Returns: boolean
      }
      update_daily_global_stats: {
        Args: {
          p_date: string
          p_expired_count: number
          p_fees: number
          p_generated_amount: number
          p_generated_count: number
          p_paid_amount: number
          p_paid_count: number
        }
        Returns: undefined
      }
      update_daily_user_stats: {
        Args: {
          p_date: string
          p_expired_count?: number
          p_fees?: number
          p_generated_amount?: number
          p_generated_count?: number
          p_paid_amount?: number
          p_paid_count?: number
          p_user_id: string
        }
        Returns: undefined
      }
      update_global_notification_setting: {
        Args: { setting_key: string; setting_value: string }
        Returns: boolean
      }
      update_user_setting: {
        Args: { setting_key: string; setting_value: string }
        Returns: boolean
      }
      validate_admin_token: { Args: { input_token: string }; Returns: boolean }
      validate_api_key: {
        Args: { p_api_key: string }
        Returns: {
          client_id: string
          client_name: string
          is_valid: boolean
          rate_limit: number
          user_id: string
          webhook_secret: string
          webhook_url: string
        }[]
      }
      verify_backup_code: { Args: { p_code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
      pix_status: "generated" | "paid" | "expired" | "refunded"
      withdrawal_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "user", "super_admin"],
      pix_status: ["generated", "paid", "expired", "refunded"],
      withdrawal_status: ["pending", "approved", "rejected"],
    },
  },
} as const
