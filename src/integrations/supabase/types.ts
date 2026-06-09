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
      access_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      agency_goals: {
        Row: {
          created_at: string
          id: string
          month: number | null
          owner_id: string | null
          period: string
          target_value: number
          type: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month?: number | null
          owner_id?: string | null
          period: string
          target_value?: number
          type: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number | null
          owner_id?: string | null
          period?: string
          target_value?: number
          type?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      agency_indicator_targets: {
        Row: {
          created_at: string
          id: string
          indicator_id: string
          month: number | null
          target_value: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          indicator_id: string
          month?: number | null
          target_value: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          indicator_id?: string
          month?: number | null
          target_value?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_indicator_targets_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "agency_indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_indicators: {
        Row: {
          category: string
          created_at: string
          data_source: string
          end_date: string | null
          id: string
          name: string
          owner_id: string | null
          periodicity: string
          responsible: string
          start_date: string
          status: string | null
          target_value: number
          type: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          data_source: string
          end_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          periodicity: string
          responsible: string
          start_date: string
          status?: string | null
          target_value: number
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          data_source?: string
          end_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          periodicity?: string
          responsible?: string
          start_date?: string
          status?: string | null
          target_value?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      agency_settings: {
        Row: {
          address: string | null
          agency_signature_url: string | null
          banner_url: string | null
          brand_primary: string | null
          brand_secondary: string | null
          created_at: string
          default_currency: string
          document: string | null
          email: string | null
          icon_system_url: string | null
          id: string
          integrations: Json
          legal_name: string | null
          logo_black_url: string | null
          logo_login_url: string | null
          logo_proposals_url: string | null
          logo_reports_url: string | null
          logo_sidebar_url: string | null
          logo_url: string | null
          logo_white_url: string | null
          logo_yellow_url: string | null
          name: string
          notify_email: boolean
          notify_whatsapp: boolean
          phone: string | null
          plan_name: string | null
          pwa_background_color: string | null
          pwa_description: string | null
          pwa_favicon_url: string | null
          pwa_icon_192_url: string | null
          pwa_icon_512_url: string | null
          pwa_name: string | null
          pwa_short_name: string | null
          pwa_theme_color: string | null
          splash_screen_url: string | null
          timezone: string
          updated_at: string
          user_limit: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          agency_signature_url?: string | null
          banner_url?: string | null
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string
          default_currency?: string
          document?: string | null
          email?: string | null
          icon_system_url?: string | null
          id?: string
          integrations?: Json
          legal_name?: string | null
          logo_black_url?: string | null
          logo_login_url?: string | null
          logo_proposals_url?: string | null
          logo_reports_url?: string | null
          logo_sidebar_url?: string | null
          logo_url?: string | null
          logo_white_url?: string | null
          logo_yellow_url?: string | null
          name?: string
          notify_email?: boolean
          notify_whatsapp?: boolean
          phone?: string | null
          plan_name?: string | null
          pwa_background_color?: string | null
          pwa_description?: string | null
          pwa_favicon_url?: string | null
          pwa_icon_192_url?: string | null
          pwa_icon_512_url?: string | null
          pwa_name?: string | null
          pwa_short_name?: string | null
          pwa_theme_color?: string | null
          splash_screen_url?: string | null
          timezone?: string
          updated_at?: string
          user_limit?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          agency_signature_url?: string | null
          banner_url?: string | null
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string
          default_currency?: string
          document?: string | null
          email?: string | null
          icon_system_url?: string | null
          id?: string
          integrations?: Json
          legal_name?: string | null
          logo_black_url?: string | null
          logo_login_url?: string | null
          logo_proposals_url?: string | null
          logo_reports_url?: string | null
          logo_sidebar_url?: string | null
          logo_url?: string | null
          logo_white_url?: string | null
          logo_yellow_url?: string | null
          name?: string
          notify_email?: boolean
          notify_whatsapp?: boolean
          phone?: string | null
          plan_name?: string | null
          pwa_background_color?: string | null
          pwa_description?: string | null
          pwa_favicon_url?: string | null
          pwa_icon_192_url?: string | null
          pwa_icon_512_url?: string | null
          pwa_name?: string | null
          pwa_short_name?: string | null
          pwa_theme_color?: string | null
          splash_screen_url?: string | null
          timezone?: string
          updated_at?: string
          user_limit?: number | null
          website?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          agency: string | null
          bank: string | null
          bank_logo_url: string | null
          color: string | null
          created_at: string
          id: string
          initial_balance: number
          is_active: boolean
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank?: string | null
          bank_logo_url?: string | null
          color?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          is_active?: boolean
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank?: string | null
          bank_logo_url?: string | null
          color?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          is_active?: boolean
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          approval_id: string | null
          client_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          external_id: string | null
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          kind: string | null
          last_synced_at: string | null
          origin_id: string | null
          origin_type: string | null
          project_id: string | null
          source: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          approval_id?: string | null
          client_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          external_id?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          kind?: string | null
          last_synced_at?: string | null
          origin_id?: string | null
          origin_type?: string | null
          project_id?: string | null
          source?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          approval_id?: string | null
          client_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          external_id?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          kind?: string | null
          last_synced_at?: string | null
          origin_id?: string | null
          origin_type?: string | null
          project_id?: string | null
          source?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_deletion_audit: {
        Row: {
          client_id: string
          client_name: string
          created_at: string
          deleted_by: string | null
          deleted_by_name: string | null
          id: string
          jobs_removed: number
          portal_users_removed: number
          projects_removed: number
          proposals_kept: number
          proposals_removed: number
          services_removed: number
          transactions_cancelled: number
          transactions_kept: number
        }
        Insert: {
          client_id: string
          client_name: string
          created_at?: string
          deleted_by?: string | null
          deleted_by_name?: string | null
          id?: string
          jobs_removed?: number
          portal_users_removed?: number
          projects_removed?: number
          proposals_kept?: number
          proposals_removed?: number
          services_removed?: number
          transactions_cancelled?: number
          transactions_kept?: number
        }
        Update: {
          client_id?: string
          client_name?: string
          created_at?: string
          deleted_by?: string | null
          deleted_by_name?: string | null
          id?: string
          jobs_removed?: number
          portal_users_removed?: number
          projects_removed?: number
          proposals_kept?: number
          proposals_removed?: number
          services_removed?: number
          transactions_cancelled?: number
          transactions_kept?: number
        }
        Relationships: []
      }
      client_portal_users: {
        Row: {
          auth_user_id: string | null
          client_id: string
          created_at: string
          email: string
          id: string
          name: string
          permissions: Json
          phone: string | null
          role: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          client_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          permissions?: Json
          phone?: string | null
          role?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          client_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          permissions?: Json
          phone?: string | null
          role?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          billing_day: number
          client_id: string
          contract_type: string
          created_at: string
          id: string
          monthly_value: number
          notes: string | null
          one_time_value: number
          service_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_day?: number
          client_id: string
          contract_type?: string
          created_at?: string
          id?: string
          monthly_value?: number
          notes?: string | null
          one_time_value?: number
          service_id: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_day?: number
          client_id?: string
          contract_type?: string
          created_at?: string
          id?: string
          monthly_value?: number
          notes?: string | null
          one_time_value?: number
          service_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_timeline_events: {
        Row: {
          actor_id: string | null
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          title: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          title: string
          type: string
        }
        Update: {
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_timeline_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_timeline_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          banner_url: string | null
          brand_primary: string | null
          brand_secondary: string | null
          company: string | null
          contract_type: string | null
          contract_value: number
          created_at: string
          document: string | null
          email: string | null
          id: string
          lead_id: string | null
          logo_url: string | null
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          portal_cover_url: string | null
          portal_enabled: boolean
          portal_slug: string | null
          portal_user_id: string | null
          start_date: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          brand_primary?: string | null
          brand_secondary?: string | null
          company?: string | null
          contract_type?: string | null
          contract_value?: number
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          portal_cover_url?: string | null
          portal_enabled?: boolean
          portal_slug?: string | null
          portal_user_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          brand_primary?: string | null
          brand_secondary?: string | null
          company?: string | null
          contract_type?: string | null
          contract_value?: number
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          portal_cover_url?: string | null
          portal_enabled?: boolean
          portal_slug?: string | null
          portal_user_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          archived_at: string | null
          content: string
          created_at: string
          id: string
          is_active: boolean
          owner_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          owner_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          owner_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          auto_renew: boolean | null
          billing_day: number
          client_id: string | null
          created_at: string
          end_date: string | null
          id: string
          installments_count: number | null
          monthly_value: number
          next_billing_date: string | null
          notes: string | null
          owner_id: string | null
          partner_id: string | null
          proposal_id: string | null
          service_ids: string[] | null
          start_date: string
          status: string
          title: string
          total_value: number | null
          type: string | null
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean | null
          billing_day?: number
          client_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          installments_count?: number | null
          monthly_value?: number
          next_billing_date?: string | null
          notes?: string | null
          owner_id?: string | null
          partner_id?: string | null
          proposal_id?: string | null
          service_ids?: string[] | null
          start_date?: string
          status?: string
          title: string
          total_value?: number | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean | null
          billing_day?: number
          client_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          installments_count?: number | null
          monthly_value?: number
          next_billing_date?: string | null
          notes?: string | null
          owner_id?: string | null
          partner_id?: string | null
          proposal_id?: string | null
          service_ids?: string[] | null
          start_date?: string
          status?: string
          title?: string
          total_value?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          column_number: number | null
          context: Json | null
          created_at: string
          file_path: string | null
          id: string
          line_number: number | null
          message: string
          page_url: string | null
          stack: string | null
          user_id: string | null
        }
        Insert: {
          column_number?: number | null
          context?: Json | null
          created_at?: string
          file_path?: string | null
          id?: string
          line_number?: number | null
          message: string
          page_url?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          column_number?: number | null
          context?: Json | null
          created_at?: string
          file_path?: string | null
          id?: string
          line_number?: number | null
          message?: string
          page_url?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      extra_demands: {
        Row: {
          approved_at: string | null
          client_id: string
          contract_id: string | null
          conversion_alert_dismissed: boolean | null
          created_at: string
          deadline_days: number | null
          description: string | null
          id: string
          is_billable: boolean
          number_display: string
          origin: string | null
          owner_id: string | null
          public_token: string | null
          responsible_id: string | null
          status: string
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          approved_at?: string | null
          client_id: string
          contract_id?: string | null
          conversion_alert_dismissed?: boolean | null
          created_at?: string
          deadline_days?: number | null
          description?: string | null
          id?: string
          is_billable?: boolean
          number_display?: string
          origin?: string | null
          owner_id?: string | null
          public_token?: string | null
          responsible_id?: string | null
          status?: string
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          approved_at?: string | null
          client_id?: string
          contract_id?: string | null
          conversion_alert_dismissed?: boolean | null
          created_at?: string
          deadline_days?: number | null
          description?: string | null
          id?: string
          is_billable?: boolean
          number_display?: string
          origin?: string | null
          owner_id?: string | null
          public_token?: string | null
          responsible_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "extra_demands_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_demands_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          cost_center: string | null
          created_at: string
          id: string
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          cost_center?: string | null
          created_at?: string
          id?: string
          kind?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          cost_center?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      google_calendar_connections: {
        Row: {
          created_at: string | null
          google_account_email: string | null
          id: string
          is_bidirectional: boolean | null
          is_sync_enabled: boolean | null
          last_pulled_at: string | null
          selected_calendar_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          google_account_email?: string | null
          id?: string
          is_bidirectional?: boolean | null
          is_sync_enabled?: boolean | null
          last_pulled_at?: string | null
          selected_calendar_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          google_account_email?: string | null
          id?: string
          is_bidirectional?: boolean | null
          is_sync_enabled?: boolean | null
          last_pulled_at?: string | null
          selected_calendar_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_attachments: {
        Row: {
          category: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          job_id: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          job_id: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          job_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_checklist: {
        Row: {
          content: string
          created_at: string
          done: boolean
          id: string
          job_id: string
          order_index: number
        }
        Insert: {
          content: string
          created_at?: string
          done?: boolean
          id?: string
          job_id: string
          order_index?: number
        }
        Update: {
          content?: string
          created_at?: string
          done?: boolean
          id?: string
          job_id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_checklist_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_system: boolean | null
          job_id: string
          mentions: Json
          metadata: Json | null
          previous_versions: Json | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_system?: boolean | null
          job_id: string
          mentions?: Json
          metadata?: Json | null
          previous_versions?: Json | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_system?: boolean | null
          job_id?: string
          mentions?: Json
          metadata?: Json | null
          previous_versions?: Json | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_comments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_history: {
        Row: {
          action: string
          created_at: string
          from_value: string | null
          id: string
          job_id: string
          metadata: Json | null
          to_value: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          from_value?: string | null
          id?: string
          job_id: string
          metadata?: Json | null
          to_value?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          from_value?: string | null
          id?: string
          job_id?: string
          metadata?: Json | null
          to_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_done: boolean
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_done?: boolean
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_done?: boolean
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          approval_token: string | null
          assignee_id: string | null
          attachments: Json | null
          briefing_guidelines: string | null
          briefing_links: string[] | null
          briefing_notes: string | null
          briefing_objective: string | null
          briefing_references: string | null
          client_id: string
          completed_steps: number | null
          contract_id: string
          created_at: string
          custom_fields: Json | null
          custom_fields_schema: Json | null
          custom_form_data: Json | null
          description: string | null
          dme_id: string | null
          done_at: string | null
          due_date: string | null
          feedback_at: string | null
          freelancer_id: string | null
          id: string
          job_type: string | null
          labels: Json
          last_activity_at: string | null
          last_feedback: string | null
          main_responsible_id: string | null
          operational_observations: string | null
          order_index: number
          period: string | null
          priority: string
          progress_percentage: number | null
          project_id: string
          service_id: string
          stage_id: string | null
          status: string | null
          team_involved: Json | null
          title: string
          total_steps: number | null
          updated_at: string
        }
        Insert: {
          approval_token?: string | null
          assignee_id?: string | null
          attachments?: Json | null
          briefing_guidelines?: string | null
          briefing_links?: string[] | null
          briefing_notes?: string | null
          briefing_objective?: string | null
          briefing_references?: string | null
          client_id: string
          completed_steps?: number | null
          contract_id: string
          created_at?: string
          custom_fields?: Json | null
          custom_fields_schema?: Json | null
          custom_form_data?: Json | null
          description?: string | null
          dme_id?: string | null
          done_at?: string | null
          due_date?: string | null
          feedback_at?: string | null
          freelancer_id?: string | null
          id?: string
          job_type?: string | null
          labels?: Json
          last_activity_at?: string | null
          last_feedback?: string | null
          main_responsible_id?: string | null
          operational_observations?: string | null
          order_index?: number
          period?: string | null
          priority?: string
          progress_percentage?: number | null
          project_id: string
          service_id: string
          stage_id?: string | null
          status?: string | null
          team_involved?: Json | null
          title: string
          total_steps?: number | null
          updated_at?: string
        }
        Update: {
          approval_token?: string | null
          assignee_id?: string | null
          attachments?: Json | null
          briefing_guidelines?: string | null
          briefing_links?: string[] | null
          briefing_notes?: string | null
          briefing_objective?: string | null
          briefing_references?: string | null
          client_id?: string
          completed_steps?: number | null
          contract_id?: string
          created_at?: string
          custom_fields?: Json | null
          custom_fields_schema?: Json | null
          custom_form_data?: Json | null
          description?: string | null
          dme_id?: string | null
          done_at?: string | null
          due_date?: string | null
          feedback_at?: string | null
          freelancer_id?: string | null
          id?: string
          job_type?: string | null
          labels?: Json
          last_activity_at?: string | null
          last_feedback?: string | null
          main_responsible_id?: string | null
          operational_observations?: string | null
          order_index?: number
          period?: string | null
          priority?: string
          progress_percentage?: number | null
          project_id?: string
          service_id?: string
          stage_id?: string | null
          status?: string | null
          team_involved?: Json | null
          title?: string
          total_steps?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_dme_id_fkey"
            columns: ["dme_id"]
            isOneToOne: false
            referencedRelation: "extra_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          content: string | null
          created_at: string
          id: string
          lead_id: string
          metadata: Json
          type: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          lead_id: string
          metadata?: Json
          type?: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          metadata?: Json
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          lost_reason: string | null
          name: string
          notes: string | null
          order_index: number
          origin_partner_id: string | null
          owner_id: string | null
          phone: string | null
          source: string | null
          stage_id: string | null
          updated_at: string
          value: number
          won_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lost_reason?: string | null
          name: string
          notes?: string | null
          order_index?: number
          origin_partner_id?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          stage_id?: string | null
          updated_at?: string
          value?: number
          won_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lost_reason?: string | null
          name?: string
          notes?: string | null
          order_index?: number
          origin_partner_id?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          stage_id?: string | null
          updated_at?: string
          value?: number
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_origin_partner_id_fkey"
            columns: ["origin_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "lead_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          status: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          agenda: boolean | null
          approvals: boolean | null
          comments: boolean | null
          email_enabled: boolean | null
          finance: boolean | null
          jobs: boolean | null
          mentions: boolean | null
          push_enabled: boolean | null
          sound_agenda: boolean | null
          sound_approvals: boolean | null
          sound_enabled: boolean | null
          sound_jobs: boolean | null
          sound_mentions: boolean | null
          sound_volume: string | null
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          agenda?: boolean | null
          approvals?: boolean | null
          comments?: boolean | null
          email_enabled?: boolean | null
          finance?: boolean | null
          jobs?: boolean | null
          mentions?: boolean | null
          push_enabled?: boolean | null
          sound_agenda?: boolean | null
          sound_approvals?: boolean | null
          sound_enabled?: boolean | null
          sound_jobs?: boolean | null
          sound_mentions?: boolean | null
          sound_volume?: string | null
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          agenda?: boolean | null
          approvals?: boolean | null
          comments?: boolean | null
          email_enabled?: boolean | null
          finance?: boolean | null
          jobs?: boolean | null
          mentions?: boolean | null
          push_enabled?: boolean | null
          sound_agenda?: boolean | null
          sound_approvals?: boolean | null
          sound_enabled?: boolean | null
          sound_jobs?: boolean | null
          sound_mentions?: boolean | null
          sound_volume?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          link: string | null
          origin_id: string | null
          origin_type: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          link?: string | null
          origin_id?: string | null
          origin_type?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          link?: string | null
          origin_id?: string | null
          origin_type?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          availability: string | null
          bank_info: string | null
          city: string | null
          commission_type: string | null
          commission_value: number | null
          company_name: string | null
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          name: string
          observations: string | null
          partnership_type: string | null
          phone: string | null
          photo_url: string | null
          pix_key: string | null
          project_rate: number | null
          responsible_name: string | null
          specialty: string | null
          status: string | null
          type: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          availability?: string | null
          bank_info?: string | null
          city?: string | null
          commission_type?: string | null
          commission_value?: number | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          observations?: string | null
          partnership_type?: string | null
          phone?: string | null
          photo_url?: string | null
          pix_key?: string | null
          project_rate?: number | null
          responsible_name?: string | null
          specialty?: string | null
          status?: string | null
          type: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          availability?: string | null
          bank_info?: string | null
          city?: string | null
          commission_type?: string | null
          commission_value?: number | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          observations?: string | null
          partnership_type?: string | null
          phone?: string | null
          photo_url?: string | null
          pix_key?: string | null
          project_rate?: number | null
          responsible_name?: string | null
          specialty?: string | null
          status?: string | null
          type?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_logo_url: string | null
          avatar_url: string | null
          created_at: string
          custom_role_id: string | null
          department: string | null
          display_name: string | null
          full_name: string | null
          google_calendar_connected: boolean | null
          google_calendar_id: string | null
          google_refresh_token: string | null
          id: string
          job_title: string | null
          last_access: string | null
          phone: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          agency_logo_url?: string | null
          avatar_url?: string | null
          created_at?: string
          custom_role_id?: string | null
          department?: string | null
          display_name?: string | null
          full_name?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          id: string
          job_title?: string | null
          last_access?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          agency_logo_url?: string | null
          avatar_url?: string | null
          created_at?: string
          custom_role_id?: string | null
          department?: string | null
          display_name?: string | null
          full_name?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          id?: string
          job_title?: string | null
          last_access?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          briefing: string | null
          client_id: string | null
          color: string | null
          completed_jobs: number
          contract_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          owner_id: string | null
          proposal_id: string | null
          responsible_id: string | null
          start_date: string | null
          status: string
          total_jobs: number
          type: string | null
          updated_at: string
        }
        Insert: {
          briefing?: string | null
          client_id?: string | null
          color?: string | null
          completed_jobs?: number
          contract_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          proposal_id?: string | null
          responsible_id?: string | null
          start_date?: string | null
          status?: string
          total_jobs?: number
          type?: string | null
          updated_at?: string
        }
        Update: {
          briefing?: string | null
          client_id?: string | null
          color?: string | null
          completed_jobs?: number
          contract_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          proposal_id?: string | null
          responsible_id?: string | null
          start_date?: string | null
          status?: string
          total_jobs?: number
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_email"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_events: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          payload: Json
          proposal_id: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          payload?: Json
          proposal_id: string
          type: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          payload?: Json
          proposal_id?: string
          type?: string
        }
        Relationships: []
      }
      proposal_items: {
        Row: {
          created_at: string
          deliverables: Json
          description: string | null
          id: string
          order_index: number
          proposal_id: string
          quantity: number
          recurrence: string
          title: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          deliverables?: Json
          description?: string | null
          id?: string
          order_index?: number
          proposal_id: string
          quantity?: number
          recurrence?: string
          title: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          deliverables?: Json
          description?: string | null
          id?: string
          order_index?: number
          proposal_id?: string
          quantity?: number
          recurrence?: string
          title?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_at: string | null
          accepted_ip: string | null
          accepted_name: string | null
          accepted_user_agent: string | null
          account_id: string | null
          approval_token: string | null
          auto_create_jobs: boolean
          billing_day: number
          briefing: string | null
          cancellation_reason: string | null
          cancellation_type: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category_id: string | null
          client_cpf: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_role: string | null
          client_signature_data: string | null
          client_signed_email: string | null
          commercial_id: string | null
          contract_content: string | null
          contract_template_id: string | null
          contract_term: string | null
          contract_type: string
          converted_at: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          first_due_date: string | null
          generated_contract_id: string | null
          generated_project_id: string | null
          id: string
          installments: number
          internal_approval: boolean | null
          internal_approval_at: string | null
          internal_approval_by: string | null
          intro: string | null
          lead_id: string | null
          monthly_investment: number
          notes: string | null
          number_display: string | null
          one_time_investment: number
          owner_id: string | null
          parent_id: string | null
          payment_kind: string
          payment_method: string | null
          public_token: string
          recurring_months: number
          responsible_id: string | null
          root_proposal_id: string | null
          scope: string[] | null
          scope_text: string | null
          sent_at: string | null
          service_ids: string[]
          service_type: string | null
          signature_agency: string | null
          signature_client: string | null
          signed_at_agency: string | null
          signed_at_client: string | null
          signed_metadata: Json | null
          status: string
          structure_status: string | null
          target_kind: string
          title: string
          total: number
          updated_at: string
          valid_until: string | null
          version: number | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_ip?: string | null
          accepted_name?: string | null
          accepted_user_agent?: string | null
          account_id?: string | null
          approval_token?: string | null
          auto_create_jobs?: boolean
          billing_day?: number
          briefing?: string | null
          cancellation_reason?: string | null
          cancellation_type?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category_id?: string | null
          client_cpf?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_role?: string | null
          client_signature_data?: string | null
          client_signed_email?: string | null
          commercial_id?: string | null
          contract_content?: string | null
          contract_template_id?: string | null
          contract_term?: string | null
          contract_type?: string
          converted_at?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          first_due_date?: string | null
          generated_contract_id?: string | null
          generated_project_id?: string | null
          id?: string
          installments?: number
          internal_approval?: boolean | null
          internal_approval_at?: string | null
          internal_approval_by?: string | null
          intro?: string | null
          lead_id?: string | null
          monthly_investment?: number
          notes?: string | null
          number_display?: string | null
          one_time_investment?: number
          owner_id?: string | null
          parent_id?: string | null
          payment_kind?: string
          payment_method?: string | null
          public_token?: string
          recurring_months?: number
          responsible_id?: string | null
          root_proposal_id?: string | null
          scope?: string[] | null
          scope_text?: string | null
          sent_at?: string | null
          service_ids?: string[]
          service_type?: string | null
          signature_agency?: string | null
          signature_client?: string | null
          signed_at_agency?: string | null
          signed_at_client?: string | null
          signed_metadata?: Json | null
          status?: string
          structure_status?: string | null
          target_kind?: string
          title: string
          total?: number
          updated_at?: string
          valid_until?: string | null
          version?: number | null
        }
        Update: {
          accepted_at?: string | null
          accepted_ip?: string | null
          accepted_name?: string | null
          accepted_user_agent?: string | null
          account_id?: string | null
          approval_token?: string | null
          auto_create_jobs?: boolean
          billing_day?: number
          briefing?: string | null
          cancellation_reason?: string | null
          cancellation_type?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category_id?: string | null
          client_cpf?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_role?: string | null
          client_signature_data?: string | null
          client_signed_email?: string | null
          commercial_id?: string | null
          contract_content?: string | null
          contract_template_id?: string | null
          contract_term?: string | null
          contract_type?: string
          converted_at?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          first_due_date?: string | null
          generated_contract_id?: string | null
          generated_project_id?: string | null
          id?: string
          installments?: number
          internal_approval?: boolean | null
          internal_approval_at?: string | null
          internal_approval_by?: string | null
          intro?: string | null
          lead_id?: string | null
          monthly_investment?: number
          notes?: string | null
          number_display?: string | null
          one_time_investment?: number
          owner_id?: string | null
          parent_id?: string | null
          payment_kind?: string
          payment_method?: string | null
          public_token?: string
          recurring_months?: number
          responsible_id?: string | null
          root_proposal_id?: string | null
          scope?: string[] | null
          scope_text?: string | null
          sent_at?: string | null
          service_ids?: string[]
          service_type?: string | null
          signature_agency?: string | null
          signature_client?: string | null
          signed_at_agency?: string | null
          signed_at_client?: string | null
          signed_metadata?: Json | null
          status?: string
          structure_status?: string | null
          target_kind?: string
          title?: string
          total?: number
          updated_at?: string
          valid_until?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_contract_template_id_fkey"
            columns: ["contract_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_root_proposal_id_fkey"
            columns: ["root_proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scope_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          archived_at: string | null
          category: string | null
          checklist_items: Json | null
          contract_template_id: string | null
          created_at: string
          default_scope: Json | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category?: string | null
          checklist_items?: Json | null
          contract_template_id?: string | null
          created_at?: string
          default_scope?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string | null
          checklist_items?: Json | null
          contract_template_id?: string | null
          created_at?: string
          default_scope?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_contract_template_id_fkey"
            columns: ["contract_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_errors_log: {
        Row: {
          column_name: string | null
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          query_text: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          column_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          query_text?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          column_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          query_text?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          client_id: string | null
          contract_id: string | null
          created_at: string
          created_by: string | null
          description: string
          dme_id: string | null
          due_date: string
          id: string
          installment_number: number | null
          installment_total: number | null
          is_recurring: boolean
          job_id: string | null
          kind: string
          notes: string | null
          origin_type: string | null
          owner_id: string | null
          paid_at: string | null
          partner_id: string | null
          project_id: string | null
          proposal_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          dme_id?: string | null
          due_date?: string
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_recurring?: boolean
          job_id?: string | null
          kind: string
          notes?: string | null
          origin_type?: string | null
          owner_id?: string | null
          paid_at?: string | null
          partner_id?: string | null
          project_id?: string | null
          proposal_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          dme_id?: string | null
          due_date?: string
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_recurring?: boolean
          job_id?: string | null
          kind?: string
          notes?: string | null
          origin_type?: string | null
          owner_id?: string | null
          paid_at?: string | null
          partner_id?: string | null
          project_id?: string | null
          proposal_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_dme_id_fkey"
            columns: ["dme_id"]
            isOneToOne: false
            referencedRelation: "extra_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          full_name: string
          id: string
          inviter_id: string | null
          role_id: string | null
          status: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          full_name: string
          id?: string
          inviter_id?: string | null
          role_id?: string | null
          status?: string | null
          token?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          full_name?: string
          id?: string
          inviter_id?: string | null
          role_id?: string | null
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      profiles_with_email: {
        Row: {
          agency_logo_url: string | null
          avatar_url: string | null
          created_at: string | null
          custom_role_id: string | null
          department: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          google_calendar_connected: boolean | null
          google_calendar_id: string | null
          google_refresh_token: string | null
          id: string | null
          job_title: string | null
          last_access: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      account_balance: { Args: { _account_id: string }; Returns: number }
      check_financial_notifications: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      fn_record_timeline_event: {
        Args: {
          p_client_id: string
          p_description?: string
          p_lead_id: string
          p_metadata?: Json
          p_title: string
          p_type: string
        }
        Returns: string
      }
      get_finance_summary: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      has_module_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notify_user: {
        Args: {
          p_category?: string
          p_description?: string
          p_link?: string
          p_origin_id?: string
          p_origin_type?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      project_progress: { Args: { _project_id: string }; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "ceo" | "gestor" | "operador" | "cliente"
      project_type: "automatic" | "special"
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
      app_role: ["admin", "ceo", "gestor", "operador", "cliente"],
      project_type: ["automatic", "special"],
    },
  },
} as const
