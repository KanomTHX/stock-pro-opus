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
      commissions: {
        Row: {
          amount: number
          commission_type: string
          contract_id: string | null
          created_at: string | null
          employee_id: string
          id: string
          payment_id: string | null
        }
        Insert: {
          amount: number
          commission_type: string
          contract_id?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          payment_id?: string | null
        }
        Update: {
          amount?: number
          commission_type?: string
          contract_id?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          admin_override_reason: string | null
          contract_no: string
          created_at: string | null
          created_by: string | null
          customer_id: string
          down_payment: number | null
          id: string
          installment_months: number
          interest_rate: number | null
          monthly_payment: number
          principal_amount: number
          product_id: string
          salesperson_id: string | null
          serial_number_id: string
          start_date: string
          status: Database["public"]["Enums"]["contract_status"] | null
          total_amount: number
          total_interest: number | null
          updated_at: string | null
        }
        Insert: {
          admin_override_reason?: string | null
          contract_no: string
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          down_payment?: number | null
          id?: string
          installment_months: number
          interest_rate?: number | null
          monthly_payment: number
          principal_amount: number
          product_id: string
          salesperson_id?: string | null
          serial_number_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"] | null
          total_amount: number
          total_interest?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_override_reason?: string | null
          contract_no?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          down_payment?: number | null
          id?: string
          installment_months?: number
          interest_rate?: number | null
          monthly_payment?: number
          principal_amount?: number
          product_id?: string
          salesperson_id?: string | null
          serial_number_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"] | null
          total_amount?: number
          total_interest?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_serial_number_id_fkey"
            columns: ["serial_number_id"]
            isOneToOne: false
            referencedRelation: "serial_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          credit_grade: Database["public"]["Enums"]["credit_grade"] | null
          credit_limit: number | null
          full_name: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          id_card: string
          is_active: boolean | null
          occupation: string | null
          phone: string | null
          photo_url: string | null
          salary: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          credit_grade?: Database["public"]["Enums"]["credit_grade"] | null
          credit_limit?: number | null
          full_name: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          id_card: string
          is_active?: boolean | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          salary?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          credit_grade?: Database["public"]["Enums"]["credit_grade"] | null
          credit_limit?: number | null
          full_name?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          id_card?: string
          is_active?: boolean | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          salary?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          collection_commission_pct: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          role: string
          sales_commission_pct: number | null
          updated_at: string | null
        }
        Insert: {
          collection_commission_pct?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          role: string
          sales_commission_pct?: number | null
          updated_at?: string | null
        }
        Update: {
          collection_commission_pct?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string
          sales_commission_pct?: number | null
          updated_at?: string | null
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
          attachment_url: string | null
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
          attachment_url?: string | null
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
          attachment_url?: string | null
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
      guarantors: {
        Row: {
          address: string | null
          created_at: string | null
          customer_id: string
          full_name: string
          id: string
          id_card: string
          phone: string | null
          relationship: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          customer_id: string
          full_name: string
          id?: string
          id_card: string
          phone?: string | null
          relationship?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          customer_id?: string
          full_name?: string
          id?: string
          id_card?: string
          phone?: string | null
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guarantors_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      payments: {
        Row: {
          amount: number
          collector_id: string | null
          contract_id: string
          created_at: string | null
          id: string
          note: string | null
          paid_at: string | null
          payment_no: number
        }
        Insert: {
          amount: number
          collector_id?: string | null
          contract_id: string
          created_at?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          payment_no: number
        }
        Update: {
          amount?: number
          collector_id?: string | null
          contract_id?: string
          created_at?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          payment_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
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
      serial_numbers: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          issued_date: string | null
          product_id: string
          received_date: string | null
          sn: string
          status: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          issued_date?: string | null
          product_id: string
          received_date?: string | null
          sn: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          issued_date?: string | null
          product_id?: string
          received_date?: string | null
          sn?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serial_numbers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serial_numbers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_by_branch: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          product_id: string
          qty: number
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          product_id: string
          qty?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
          qty?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_by_branch_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_by_branch_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_count_headers: {
        Row: {
          branch_id: string
          count_no: string
          counted_at: string | null
          counted_by: string
          created_at: string | null
          id: string
          note: string | null
          status: Database["public"]["Enums"]["stock_count_status"] | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          count_no: string
          counted_at?: string | null
          counted_by: string
          created_at?: string | null
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["stock_count_status"] | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          count_no?: string
          counted_at?: string | null
          counted_by?: string
          created_at?: string | null
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["stock_count_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_count_headers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_count_items: {
        Row: {
          count_id: string
          counted_qty: number
          created_at: string | null
          id: string
          note: string | null
          product_id: string
          system_qty: number
          variance: number | null
        }
        Insert: {
          count_id: string
          counted_qty?: number
          created_at?: string | null
          id?: string
          note?: string | null
          product_id: string
          system_qty?: number
          variance?: number | null
        }
        Update: {
          count_id?: string
          counted_qty?: number
          created_at?: string | null
          id?: string
          note?: string | null
          product_id?: string
          system_qty?: number
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_count_items_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "stock_count_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      get_customer_active_debt: {
        Args: { customer_uuid: string }
        Returns: number
      }
      get_customer_remaining_credit: {
        Args: { customer_uuid: string }
        Returns: number
      }
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
      contract_status: "active" | "completed" | "defaulted" | "cancelled"
      credit_grade: "A" | "B" | "C" | "F"
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
      stock_count_status: "draft" | "completed" | "cancelled"
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
      contract_status: ["active", "completed", "defaulted", "cancelled"],
      credit_grade: ["A", "B", "C", "F"],
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
      stock_count_status: ["draft", "completed", "cancelled"],
      transfer_status: ["pending", "in_transit", "completed", "cancelled"],
    },
  },
} as const
