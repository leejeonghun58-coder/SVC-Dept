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
      app_members: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: number
          invited_by: string | null
          is_active: boolean
          public_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id?: never
          invited_by?: string | null
          is_active?: boolean
          public_id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: never
          invited_by?: string | null
          is_active?: boolean
          public_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          details: Json
          entity_public_id: string | null
          entity_type: string
          event_type: string
          id: number
          public_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          entity_public_id?: string | null
          entity_type: string
          event_type: string
          id?: never
          public_id?: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          entity_public_id?: string | null
          entity_type?: string
          event_type?: string
          id?: never
          public_id?: string
        }
        Relationships: []
      }
      customer_mappings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          customer_id: number
          id: number
          public_id: string
          source_customer_name: string
          source_customer_no: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_id: number
          id?: never
          public_id?: string
          source_customer_name: string
          source_customer_no: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_id?: number
          id?: never
          public_id?: string
          source_customer_name?: string
          source_customer_no?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_mappings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          customer_name: string
          customer_no: string
          id: number
          normalized_name: string | null
          public_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_no: string
          id?: never
          normalized_name?: string | null
          public_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_no?: string
          id?: never
          normalized_name?: string | null
          public_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_versions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string
          error_count: number
          id: number
          is_active: boolean
          is_official: boolean
          kind: string
          public_id: string
          row_count: number
          source_sha256: string
          status: string
          supersedes_version_id: number | null
          upload_job_id: number
          validated_at: string | null
          warning_count: number
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          error_count?: number
          id?: never
          is_active?: boolean
          is_official?: boolean
          kind: string
          public_id?: string
          row_count?: number
          source_sha256: string
          status?: string
          supersedes_version_id?: number | null
          upload_job_id: number
          validated_at?: string | null
          warning_count?: number
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          error_count?: number
          id?: never
          is_active?: boolean
          is_official?: boolean
          kind?: string
          public_id?: string
          row_count?: number
          source_sha256?: string
          status?: string
          supersedes_version_id?: number | null
          upload_job_id?: number
          validated_at?: string | null
          warning_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_versions_supersedes_version_id_fkey"
            columns: ["supersedes_version_id"]
            isOneToOne: false
            referencedRelation: "data_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_versions_upload_job_id_fkey"
            columns: ["upload_job_id"]
            isOneToOne: true
            referencedRelation: "upload_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      dv_records: {
        Row: {
          billing_month: string
          channel: string | null
          created_at: string
          currency: string | null
          customer_id: number | null
          customer_name: string
          customer_no: string
          data_version_id: number
          id: number
          is_exact_duplicate: boolean
          item_number: string
          model: string | null
          public_id: string
          raw_data: Json
          serial_no: string | null
          source_row_hash: string
          source_row_number: number
          svc_team: string | null
          total_dv: number
          total_revenue: number | null
        }
        Insert: {
          billing_month: string
          channel?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: number | null
          customer_name: string
          customer_no: string
          data_version_id: number
          id?: never
          is_exact_duplicate?: boolean
          item_number: string
          model?: string | null
          public_id?: string
          raw_data?: Json
          serial_no?: string | null
          source_row_hash: string
          source_row_number: number
          svc_team?: string | null
          total_dv: number
          total_revenue?: number | null
        }
        Update: {
          billing_month?: string
          channel?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: number | null
          customer_name?: string
          customer_no?: string
          data_version_id?: number
          id?: never
          is_exact_duplicate?: boolean
          item_number?: string
          model?: string | null
          public_id?: string
          raw_data?: Json
          serial_no?: string | null
          source_row_hash?: string
          source_row_number?: number
          svc_team?: string | null
          total_dv?: number
          total_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dv_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dv_records_data_version_id_fkey"
            columns: ["data_version_id"]
            isOneToOne: false
            referencedRelation: "data_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_customer_item_summary: {
        Row: {
          billing_month: string
          customer_id: number | null
          customer_name: string
          customer_no: string
          data_version_id: number
          id: number
          item_number: string
          row_count: number
          shipment_amount: number | null
          shipment_cost: number | null
          shipment_quantity: number | null
          total_dv: number | null
        }
        Insert: {
          billing_month: string
          customer_id?: number | null
          customer_name: string
          customer_no: string
          data_version_id: number
          id?: never
          item_number: string
          row_count: number
          shipment_amount?: number | null
          shipment_cost?: number | null
          shipment_quantity?: number | null
          total_dv?: number | null
        }
        Update: {
          billing_month?: string
          customer_id?: number | null
          customer_name?: string
          customer_no?: string
          data_version_id?: number
          id?: never
          item_number?: string
          row_count?: number
          shipment_amount?: number | null
          shipment_cost?: number | null
          shipment_quantity?: number | null
          total_dv?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_customer_item_summary_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_customer_item_summary_data_version_id_fkey"
            columns: ["data_version_id"]
            isOneToOne: false
            referencedRelation: "data_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_customer_summary: {
        Row: {
          billing_month: string
          customer_id: number | null
          customer_name: string
          customer_no: string
          data_version_id: number
          id: number
          row_count: number
          shipment_amount: number | null
          shipment_cost: number | null
          shipment_quantity: number | null
          total_dv: number | null
          total_revenue: number | null
        }
        Insert: {
          billing_month: string
          customer_id?: number | null
          customer_name: string
          customer_no: string
          data_version_id: number
          id?: never
          row_count: number
          shipment_amount?: number | null
          shipment_cost?: number | null
          shipment_quantity?: number | null
          total_dv?: number | null
          total_revenue?: number | null
        }
        Update: {
          billing_month?: string
          customer_id?: number | null
          customer_name?: string
          customer_no?: string
          data_version_id?: number
          id?: never
          row_count?: number
          shipment_amount?: number | null
          shipment_cost?: number | null
          shipment_quantity?: number | null
          total_dv?: number | null
          total_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_customer_summary_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_customer_summary_data_version_id_fkey"
            columns: ["data_version_id"]
            isOneToOne: false
            referencedRelation: "data_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_item_summary: {
        Row: {
          billing_month: string
          category: string | null
          data_version_id: number
          exact_amount: number | null
          id: number
          item_number: string
          quantity: number
          row_count: number
          total_cost: number | null
        }
        Insert: {
          billing_month: string
          category?: string | null
          data_version_id: number
          exact_amount?: number | null
          id?: never
          item_number: string
          quantity?: number
          row_count: number
          total_cost?: number | null
        }
        Update: {
          billing_month?: string
          category?: string | null
          data_version_id?: number
          exact_amount?: number | null
          id?: never
          item_number?: string
          quantity?: number
          row_count?: number
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_item_summary_data_version_id_fkey"
            columns: ["data_version_id"]
            isOneToOne: false
            referencedRelation: "data_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_records: {
        Row: {
          billing_month: string
          category: string | null
          channel: string | null
          created_at: string
          currency: string
          customer_id: number | null
          customer_name: string
          customer_no: string
          data_version_id: number
          exact_amount: number | null
          id: number
          item_description: string | null
          item_number: string | null
          model: string | null
          public_id: string
          quantity: number
          raw_data: Json
          source_row_hash: string
          source_row_number: number
          sub_category: string | null
          svc_team: string | null
          total_cost: number | null
          unit_cost: number | null
          unit_price: number | null
        }
        Insert: {
          billing_month: string
          category?: string | null
          channel?: string | null
          created_at?: string
          currency?: string
          customer_id?: number | null
          customer_name: string
          customer_no: string
          data_version_id: number
          exact_amount?: number | null
          id?: never
          item_description?: string | null
          item_number?: string | null
          model?: string | null
          public_id?: string
          quantity: number
          raw_data?: Json
          source_row_hash: string
          source_row_number: number
          sub_category?: string | null
          svc_team?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          unit_price?: number | null
        }
        Update: {
          billing_month?: string
          category?: string | null
          channel?: string | null
          created_at?: string
          currency?: string
          customer_id?: number | null
          customer_name?: string
          customer_no?: string
          data_version_id?: number
          exact_amount?: number | null
          id?: never
          item_description?: string | null
          item_number?: string | null
          model?: string | null
          public_id?: string
          quantity?: number
          raw_data?: Json
          source_row_hash?: string
          source_row_number?: number
          sub_category?: string | null
          svc_team?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_records_data_version_id_fkey"
            columns: ["data_version_id"]
            isOneToOne: false
            referencedRelation: "data_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          error_code: string | null
          error_message: string | null
          file_name: string
          id: number
          kind: string
          progress_percent: number
          public_id: string
          sha256: string
          size_bytes: number
          status: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_code?: string | null
          error_message?: string | null
          file_name: string
          id?: never
          kind: string
          progress_percent?: number
          public_id?: string
          sha256: string
          size_bytes: number
          status?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_code?: string | null
          error_message?: string | null
          file_name?: string
          id?: never
          kind?: string
          progress_percent?: number
          public_id?: string
          sha256?: string
          size_bytes?: number
          status?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      validation_issues: {
        Row: {
          code: string
          created_at: string
          data_version_id: number
          field_name: string | null
          id: number
          issue_count: number
          masked_sample: string | null
          public_id: string
          severity: string
          source_row_number: number | null
        }
        Insert: {
          code: string
          created_at?: string
          data_version_id: number
          field_name?: string | null
          id?: never
          issue_count?: number
          masked_sample?: string | null
          public_id?: string
          severity: string
          source_row_number?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          data_version_id?: number
          field_name?: string | null
          id?: never
          issue_count?: number
          masked_sample?: string | null
          public_id?: string
          severity?: string
          source_row_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "validation_issues_data_version_id_fkey"
            columns: ["data_version_id"]
            isOneToOne: false
            referencedRelation: "data_versions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
