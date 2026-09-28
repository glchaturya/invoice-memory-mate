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
      exceptions: {
        Row: {
          ai_recommendation: Json | null
          amount_delta: number | null
          created_at: string
          detail: string | null
          exception_type: string
          id: string
          invoice_id: string
          severity: string
          status: string
          title: string
          vendor_id: string
        }
        Insert: {
          ai_recommendation?: Json | null
          amount_delta?: number | null
          created_at?: string
          detail?: string | null
          exception_type: string
          id?: string
          invoice_id: string
          severity?: string
          status?: string
          title: string
          vendor_id: string
        }
        Update: {
          ai_recommendation?: Json | null
          amount_delta?: number | null
          created_at?: string
          detail?: string | null
          exception_type?: string
          id?: string
          invoice_id?: string
          severity?: string
          status?: string
          title?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exceptions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exceptions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          description: string
          id: string
          invoice_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          amount?: number
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          due_date: string | null
          file_name: string | null
          id: string
          invoice_date: string | null
          invoice_number: string
          payment_terms: string | null
          po_id: string | null
          po_number: string | null
          source: string
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          vendor_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          file_name?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          payment_terms?: string | null
          po_id?: string | null
          po_number?: string | null
          source?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          vendor_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          file_name?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          payment_terms?: string | null
          po_id?: string | null
          po_number?: string | null
          source?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          line_item_count: number
          payment_terms: string | null
          po_amount: number
          po_number: string
          status: string
          vendor_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          line_item_count?: number
          payment_terms?: string | null
          po_amount: number
          po_number: string
          status?: string
          vendor_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          line_item_count?: number
          payment_terms?: string | null
          po_amount?: number
          po_number?: string
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      resolutions: {
        Row: {
          action: string
          created_at: string
          exception_id: string
          id: string
          invoice_id: string
          notes: string | null
          resolved_by: string
          vendor_id: string
        }
        Insert: {
          action: string
          created_at?: string
          exception_id: string
          id?: string
          invoice_id: string
          notes?: string | null
          resolved_by?: string
          vendor_id: string
        }
        Update: {
          action?: string
          created_at?: string
          exception_id?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          resolved_by?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolutions_exception_id_fkey"
            columns: ["exception_id"]
            isOneToOne: false
            referencedRelation: "exceptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_memory_cases: {
        Row: {
          amount_delta: number | null
          case_type: string
          created_at: string
          id: string
          invoice_number: string | null
          occurred_on: string | null
          outcome: string
          resolution: string | null
          summary: string | null
          tags: string[]
          title: string
          vendor_id: string
        }
        Insert: {
          amount_delta?: number | null
          case_type: string
          created_at?: string
          id?: string
          invoice_number?: string | null
          occurred_on?: string | null
          outcome?: string
          resolution?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          vendor_id: string
        }
        Update: {
          amount_delta?: number | null
          case_type?: string
          created_at?: string
          id?: string
          invoice_number?: string | null
          occurred_on?: string | null
          outcome?: string
          resolution?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_memory_cases_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          city: string | null
          common_patterns: string[]
          created_at: string
          credit_limit: number | null
          id: string
          name: string
          notes: string | null
          standard_payment_terms: string
          vendor_code: string
        }
        Insert: {
          city?: string | null
          common_patterns?: string[]
          created_at?: string
          credit_limit?: number | null
          id?: string
          name: string
          notes?: string | null
          standard_payment_terms?: string
          vendor_code: string
        }
        Update: {
          city?: string | null
          common_patterns?: string[]
          created_at?: string
          credit_limit?: number | null
          id?: string
          name?: string
          notes?: string | null
          standard_payment_terms?: string
          vendor_code?: string
        }
        Relationships: []
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
