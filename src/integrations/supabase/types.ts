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
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      gi_headers: {
        Row: {
          branch_id: string
          created_at: string | null
          gi_no: string
          id: string
          issued_at: string | null
          issued_by: string
          note: string | null
          purpose: Database["public"]["Enums"]["gi_purpose"]
          status: Database["public"]["Enums"]["gi_status"] | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          gi_no: string
          id?: string
          issued_at?: string | null
          issued_by: string
          note?: string | null
          purpose: Database["public"]["Enums"]["gi_purpose"]
          status?: Database["public"]["Enums"]["gi_status"] | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          gi_no?: string
          id?: string
          issued_at?: string | null
          issued_by?: string
          note?: string | null
          purpose?: Database["public"]["Enums"]["gi_purpose"]
          status?: Database["public"]["Enums"]["gi_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gi_headers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      gi_items: {
        Row: {
          created_at: string | null
          gi_id: string
          id: string
          product_id: string
          qty: number
          sn_list: string[] | null
        }
        Insert: {
          created_at?: string | null
          gi_id: string
          id?: string
          product_id: string
          qty: number
          sn_list?: string[] | null
        }
        Update: {
          created_at?: string | null
          gi_id?: string
          id?: string
          product_id?: string
          qty?: number
          sn_list?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "gi_items_gi_id_fkey"
            columns: ["gi_id"]
            isOneToOne: false
            referencedRelation: "gi_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gi_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_headers: {
        Row: {
          branch_id: string
          created_at: string | null
          grn_no: string
          id: string
          invoice_date: string | null
          invoice_no: string | null
          note: string | null
          received_at: string | null
          received_by: string
          status: Database["public"]["Enums"]["grn_status"] | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          grn_no: string
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          note?: string | null
          received_at?: string | null
          received_by: string
          status?: Database["public"]["Enums"]["grn_status"] | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          grn_no?: string
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          note?: string | null
          received_at?: string | null
          received_by?: string
          status?: Database["public"]["Enums"]["grn_status"] | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grn_headers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_headers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_items: {
        Row: {
          created_at: string | null
          grn_id: string
          id: string
          product_id: string
          qty: number
          sn_list: string[] | null
          unit_cost: number | null
          vat_rate: number | null
        }
        Insert: {
          created_at?: string | null
          grn_id: string
          id?: string
          product_id: string
          qty: number
          sn_list?: string[] | null
          unit_cost?: number | null
          vat_rate?: number | null
        }
        Update: {
          created_at?: string | null
          grn_id?: string
          id?: string
          product_id?: string
          qty?: number
          sn_list?: string[] | null
          unit_cost?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grn_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      movement_logs: {
        Row: {
          action: Database["public"]["Enums"]["movement_action"]
          actor_id: string
          created_at: string | null
          from_branch_id: string | null
          id: string
          note: string | null
          product_id: string
          qty: number
          ref_id: string | null
          ref_table: string | null
          to_branch_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["movement_action"]
          actor_id: string
          created_at?: string | null
          from_branch_id?: string | null
          id?: string
          note?: string | null
          product_id: string
          qty: number
          ref_id?: string | null
          ref_table?: string | null
          to_branch_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["movement_action"]
          actor_id?: string
          created_at?: string | null
          from_branch_id?: string | null
          id?: string
          note?: string | null
          product_id?: string
          qty?: number
          ref_id?: string | null
          ref_table?: string | null
          to_branch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movement_logs_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movement_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movement_logs_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          height: number | null
          id: string
          is_primary: boolean | null
          position: number | null
          product_id: string
          uploaded_at: string | null
          uploaded_by: string | null
          url: string
          variant_id: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          height?: number | null
          id?: string
          is_primary?: boolean | null
          position?: number | null
          product_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          url: string
          variant_id?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          height?: number | null
          id?: string
          is_primary?: boolean | null
          position?: number | null
          product_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          url?: string
          variant_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          color: string | null
          created_at: string | null
          default_image_url: string | null
          description: string | null
          dimensions: string | null
          id: string
          is_active: boolean | null
          material: string | null
          min_stock: number | null
          name: string
          sku: string
          track_by_sn: boolean | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          created_at?: string | null
          default_image_url?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean | null
          material?: string | null
          min_stock?: number | null
          name: string
          sku: string
          track_by_sn?: boolean | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          created_at?: string | null
          default_image_url?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean | null
          material?: string | null
          min_stock?: number | null
          name?: string
          sku?: string
          track_by_sn?: boolean | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          is_active?: boolean | null
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transfer_headers: {
        Row: {
          created_at: string | null
          from_branch_id: string
          id: string
          initiated_at: string | null
          initiated_by: string
          note: string | null
          received_at: string | null
          received_by: string | null
          status: Database["public"]["Enums"]["transfer_status"] | null
          to_branch_id: string
          transfer_no: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_branch_id: string
          id?: string
          initiated_at?: string | null
          initiated_by: string
          note?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"] | null
          to_branch_id: string
          transfer_no: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_branch_id?: string
          id?: string
          initiated_at?: string | null
          initiated_by?: string
          note?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"] | null
          to_branch_id?: string
          transfer_no?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_headers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_headers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          qty: number
          sn_list: string[] | null
          transfer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          qty: number
          sn_list?: string[] | null
          transfer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          qty?: number
          sn_list?: string[] | null
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfer_headers"
            referencedColumns: ["id"]
          },
        ]
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
      app_role:
        | "manager"
        | "assistant_manager"
        | "branch_staff"
        | "warehouse_staff"
        | "auditor"
      gi_purpose: "sale" | "sample" | "service" | "adjustment"
      gi_status: "pending" | "completed" | "cancelled"
      grn_status: "draft" | "completed" | "cancelled"
      item_condition: "new" | "used" | "refurbished" | "damaged"
      item_status: "available" | "reserved" | "sold" | "defective"
      movement_action:
        | "receive"
        | "issue"
        | "transfer_out"
        | "transfer_in"
        | "adjustment"
      transfer_status: "pending" | "in_transit" | "completed" | "cancelled"
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
      app_role: [
        "manager",
        "assistant_manager",
        "branch_staff",
        "warehouse_staff",
        "auditor",
      ],
      gi_purpose: ["sale", "sample", "service", "adjustment"],
      gi_status: ["pending", "completed", "cancelled"],
      grn_status: ["draft", "completed", "cancelled"],
      item_condition: ["new", "used", "refurbished", "damaged"],
      item_status: ["available", "reserved", "sold", "defective"],
      movement_action: [
        "receive",
        "issue",
        "transfer_out",
        "transfer_in",
        "adjustment",
      ],
      transfer_status: ["pending", "in_transit", "completed", "cancelled"],
    },
  },
} as const
