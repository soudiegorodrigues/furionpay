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
          fee_fixed: number | null
          fee_percentage: number | null
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
          fee_fixed?: number | null
          fee_percentage?: number | null
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
          fee_fixed?: number | null
          fee_percentage?: number | null
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
      product_checkout_configs: {
        Row: {
          back_redirect_url: string | null
          background_color: string | null
          buyer_section_title: string | null
          checkout_subtitle: string | null
          checkout_title: string | null
          countdown_minutes: number | null
          created_at: string
          custom_button_text: string | null
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
          require_address: boolean | null
          require_birthdate: boolean | null
          require_cpf: boolean | null
          require_email_confirmation: boolean | null
          require_phone: boolean | null
          security_badge_text: string | null
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
          video_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          back_redirect_url?: string | null
          background_color?: string | null
          buyer_section_title?: string | null
          checkout_subtitle?: string | null
          checkout_title?: string | null
          countdown_minutes?: number | null
          created_at?: string
          custom_button_text?: string | null
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
          require_address?: boolean | null
          require_birthdate?: boolean | null
          require_cpf?: boolean | null
          require_email_confirmation?: boolean | null
          require_phone?: boolean | null
          security_badge_text?: string | null
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
          video_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          back_redirect_url?: string | null
          background_color?: string | null
          buyer_section_title?: string | null
          checkout_subtitle?: string | null
          checkout_title?: string | null
          countdown_minutes?: number | null
          created_at?: string
          custom_button_text?: string | null
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
          require_address?: boolean | null
          require_birthdate?: boolean | null
          require_cpf?: boolean | null
          require_email_confirmation?: boolean | null
          require_phone?: boolean | null
          security_badge_text?: string | null
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
            foreignKeyName: "product_checkout_configs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "public_products"
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
          domain: string | null
          id: string
          is_active: boolean
          name: string
          offer_code: string | null
          price: number
          product_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          name: string
          offer_code?: string | null
          price?: number
          product_id: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          name?: string
          offer_code?: string | null
          price?: number
          product_id?: string
          type?: string
          updated_at?: string
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
          {
            foreignKeyName: "product_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
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
          {
            foreignKeyName: "product_testimonials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
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
          product_code: string | null
          updated_at: string
          user_id: string
          website_url: string | null
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
          product_code?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
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
          created_at: string
          full_name: string | null
          id: string
          is_approved: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_approved?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean
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
      withdrawal_requests: {
        Row: {
          amount: number
          bank_code: string
          bank_name: string
          created_at: string
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
          amount: number
          bank_code: string
          bank_name: string
          created_at?: string
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
          amount?: number
          bank_code?: string
          bank_name?: string
          created_at?: string
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
      public_products: {
        Row: {
          created_at: string | null
          description: string | null
          folder_id: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          name: string | null
          price: number | null
          product_code: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          price?: number | null
          product_code?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          price?: number | null
          product_code?: string | null
          updated_at?: string | null
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
    }
    Functions: {
      approve_document_verification: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      approve_user: { Args: { target_user_id: string }; Returns: boolean }
      block_user: { Args: { target_user_id: string }; Returns: boolean }
      bootstrap_first_admin: { Args: { admin_email: string }; Returns: boolean }
      check_login_blocked: { Args: { p_email: string }; Returns: Json }
      check_user_approved: { Args: never; Returns: boolean }
      check_user_blocked: { Args: never; Returns: boolean }
      cleanup_old_monitoring_events: { Args: never; Returns: undefined }
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
          is_approved: boolean
          is_blocked: boolean
          last_sign_in_at: string
        }[]
      }
      get_all_withdrawals_admin: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          bank_code: string
          bank_name: string
          created_at: string
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
      get_api_health_summary: { Args: never; Returns: Json }
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
          fee_fixed: number
          fee_percentage: number
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
      get_public_offer_by_code: {
        Args: { p_offer_code: string }
        Returns: {
          domain: string
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
        }[]
      }
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
      get_user_available_balance: { Args: never; Returns: number }
      get_user_available_balance_admin: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_balance_details: { Args: never; Returns: Json }
      get_user_dashboard: { Args: never; Returns: Json }
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
      get_user_transactions: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          created_at: string
          donor_name: string
          fee_fixed: number
          fee_percentage: number
          id: string
          paid_at: string
          popup_model: string
          product_name: string
          status: Database["public"]["Enums"]["pix_status"]
          txid: string
          utm_data: Json
        }[]
      }
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
              p_fee_fixed?: number
              p_fee_percentage?: number
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
      mark_reward_sent: {
        Args: { p_request_id: string; p_tracking_code?: string }
        Returns: boolean
      }
      process_withdrawal: {
        Args: {
          p_rejection_reason?: string
          p_status: Database["public"]["Enums"]["withdrawal_status"]
          p_withdrawal_id: string
        }
        Returns: boolean
      }
      reject_document_verification: {
        Args: { p_reason: string; p_user_id: string }
        Returns: boolean
      }
      request_withdrawal: {
        Args: {
          p_amount: number
          p_bank_code: string
          p_bank_name: string
          p_pix_key: string
          p_pix_key_type: string
        }
        Returns: string
      }
      reset_login_attempts: { Args: { p_email: string }; Returns: boolean }
      reset_pix_transactions: {
        Args: { input_token: string }
        Returns: boolean
      }
      reset_pix_transactions_auth: { Args: never; Returns: boolean }
      reset_user_transactions: { Args: never; Returns: boolean }
      revoke_admin_role: { Args: { target_user_id: string }; Returns: boolean }
      revoke_user_approval: {
        Args: { target_user_id: string }
        Returns: boolean
      }
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
      app_role: ["admin", "user"],
      pix_status: ["generated", "paid", "expired"],
      withdrawal_status: ["pending", "approved", "rejected"],
    },
  },
} as const
