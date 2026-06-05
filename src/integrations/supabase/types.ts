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
      agency_settings: {
        Row: {
          address: string | null
          banner_url: string | null
          brand_primary: string | null
          brand_secondary: string | null
          created_at: string
          default_currency: string
          document: string | null
          email: string | null
          id: string
          integrations: Json
          legal_name: string | null
          logo_url: string | null
          name: string
          notify_email: boolean
          notify_whatsapp: boolean
          phone: string | null
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string
          default_currency?: string
          document?: string | null
          email?: string | null
          id?: string
          integrations?: Json
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          notify_email?: boolean
          notify_whatsapp?: boolean
          phone?: string | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string
          default_currency?: string
          document?: string | null
          email?: string | null
          id?: string
          integrations?: Json
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          notify_email?: boolean
          notify_whatsapp?: boolean
          phone?: string | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          agency: string | null
          bank: string | null
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
          billing_day: number
          client_id: string | null
          created_at: string
          end_date: string | null
          id: string
          monthly_value: number
          notes: string | null
          owner_id: string | null
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
          billing_day?: number
          client_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_value?: number
          notes?: string | null
          owner_id?: string | null
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
          billing_day?: number
          client_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_value?: number
          notes?: string | null
          owner_id?: string | null
          proposal_id?: string | null
          service_ids?: string[] | null
          start_date?: string
          status?: string
          title?: string
          total_value?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
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
          job_id: string
          mentions: Json
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          job_id: string
          mentions?: Json
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          job_id?: string
          mentions?: Json
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
          assignee_id: string | null
          client_id: string | null
          created_at: string
          description: string | null
          done_at: string | null
          due_date: string | null
          id: string
          labels: Json
          order_index: number
          priority: string
          project_id: string | null
          stage_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          done_at?: string | null
          due_date?: string | null
          id?: string
          labels?: Json
          order_index?: number
          priority?: string
          project_id?: string | null
          stage_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          done_at?: string | null
          due_date?: string | null
          id?: string
          labels?: Json
          order_index?: number
          priority?: string
          project_id?: string | null
          stage_id?: string | null
          title?: string
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
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "lead_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          custom_role_id: string | null
          display_name: string | null
          full_name: string | null
          id: string
          job_title: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          custom_role_id?: string | null
          display_name?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          custom_role_id?: string | null
          display_name?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
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
          contract_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          owner_id: string | null
          proposal_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          briefing?: string | null
          client_id?: string | null
          color?: string | null
          contract_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          proposal_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          briefing?: string | null
          client_id?: string | null
          color?: string | null
          contract_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          proposal_id?: string | null
          start_date?: string | null
          status?: string
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
          job_template: string | null
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
          job_template?: string | null
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
          job_template?: string | null
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
          account_id: string | null
          auto_create_jobs: boolean
          billing_day: number
          briefing: string | null
          category_id: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          commercial_id: string | null
          contract_content: string | null
          contract_template_id: string | null
          contract_term: string | null
          contract_type: string
          created_at: string
          currency: string
          first_due_date: string | null
          generated_contract_id: string | null
          generated_project_id: string | null
          id: string
          installments: number
          intro: string | null
          lead_id: string | null
          monthly_investment: number
          one_time_investment: number
          operational_id: string | null
          owner_id: string | null
          payment_kind: string
          payment_method: string | null
          public_token: string
          recurring_months: number
          responsible_id: string | null
          service_ids: string[]
          service_type: string | null
          signature_agency: string | null
          signature_client: string | null
          signed_at_agency: string | null
          signed_at_client: string | null
          status: string
          target_kind: string
          title: string
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_ip?: string | null
          accepted_name?: string | null
          account_id?: string | null
          auto_create_jobs?: boolean
          billing_day?: number
          briefing?: string | null
          category_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          commercial_id?: string | null
          contract_content?: string | null
          contract_template_id?: string | null
          contract_term?: string | null
          contract_type?: string
          created_at?: string
          currency?: string
          first_due_date?: string | null
          generated_contract_id?: string | null
          generated_project_id?: string | null
          id?: string
          installments?: number
          intro?: string | null
          lead_id?: string | null
          monthly_investment?: number
          one_time_investment?: number
          operational_id?: string | null
          owner_id?: string | null
          payment_kind?: string
          payment_method?: string | null
          public_token?: string
          recurring_months?: number
          responsible_id?: string | null
          service_ids?: string[]
          service_type?: string | null
          signature_agency?: string | null
          signature_client?: string | null
          signed_at_agency?: string | null
          signed_at_client?: string | null
          status?: string
          target_kind?: string
          title: string
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_ip?: string | null
          accepted_name?: string | null
          account_id?: string | null
          auto_create_jobs?: boolean
          billing_day?: number
          briefing?: string | null
          category_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          commercial_id?: string | null
          contract_content?: string | null
          contract_template_id?: string | null
          contract_term?: string | null
          contract_type?: string
          created_at?: string
          currency?: string
          first_due_date?: string | null
          generated_contract_id?: string | null
          generated_project_id?: string | null
          id?: string
          installments?: number
          intro?: string | null
          lead_id?: string | null
          monthly_investment?: number
          one_time_investment?: number
          operational_id?: string | null
          owner_id?: string | null
          payment_kind?: string
          payment_method?: string | null
          public_token?: string
          recurring_months?: number
          responsible_id?: string | null
          service_ids?: string[]
          service_type?: string | null
          signature_agency?: string | null
          signature_client?: string | null
          signed_at_agency?: string | null
          signed_at_client?: string | null
          status?: string
          target_kind?: string
          title?: string
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
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
        ]
      }
      service_job_checklist: {
        Row: {
          content: string
          created_at: string
          id: string
          order_index: number
          template_job_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          order_index?: number
          template_job_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          order_index?: number
          template_job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_job_checklist_template_job_id_fkey"
            columns: ["template_job_id"]
            isOneToOne: false
            referencedRelation: "service_job_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      service_job_templates: {
        Row: {
          created_at: string
          default_assignee_id: string | null
          default_duration_days: number
          id: string
          initial_stage_id: string | null
          name: string
          order_index: number
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_assignee_id?: string | null
          default_duration_days?: number
          id?: string
          initial_stage_id?: string | null
          name: string
          order_index?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_assignee_id?: string | null
          default_duration_days?: number
          id?: string
          initial_stage_id?: string | null
          name?: string
          order_index?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_job_templates_initial_stage_id_fkey"
            columns: ["initial_stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_job_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          archived_at: string | null
          category: string | null
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
          description: string
          due_date: string
          id: string
          installment_number: number | null
          installment_total: number | null
          is_recurring: boolean
          job_id: string | null
          kind: string
          notes: string | null
          owner_id: string | null
          paid_at: string | null
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
          description: string
          due_date?: string
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_recurring?: boolean
          job_id?: string | null
          kind: string
          notes?: string | null
          owner_id?: string | null
          paid_at?: string | null
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
          description?: string
          due_date?: string
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_recurring?: boolean
          job_id?: string | null
          kind?: string
          notes?: string | null
          owner_id?: string | null
          paid_at?: string | null
          project_id?: string | null
          proposal_id?: string | null
          status?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_balance: { Args: { _account_id: string }; Returns: number }
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
      project_progress: { Args: { _project_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "ceo" | "gestor" | "operador" | "cliente"
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
    },
  },
} as const
