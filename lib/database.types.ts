export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TransactionType = "RECEIVED" | "DISPENSED" | "ADJUSTMENT";
export type RiskLevel =
  | "OTC"
  | "Rx-Only"
  | "Non-controlled"
  | "Schedule II"
  | "Schedule III"
  | "Schedule IV"
  | "Schedule V";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: string;
          low_stock_threshold: number;
          near_expiry_days: number;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: string;
          low_stock_threshold?: number;
          near_expiry_days?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: string;
          low_stock_threshold?: number;
          near_expiry_days?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      medications: {
        Row: {
          id: string;
          owner_id: string;
          sku: string;
          ndc_gtin: string | null;
          generic_name: string;
          brand_name: string | null;
          category: string | null;
          dosage_form: string | null;
          strength: string | null;
          pack_size: string | null;
          risk_level: string;
          storage_requirements: string | null;
          unit_cost_price: number;
          unit_selling_price: number;
          reorder_point: number;
          max_stock_level: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          sku: string;
          ndc_gtin?: string | null;
          generic_name: string;
          brand_name?: string | null;
          category?: string | null;
          dosage_form?: string | null;
          strength?: string | null;
          pack_size?: string | null;
          risk_level?: string;
          storage_requirements?: string | null;
          unit_cost_price?: number;
          unit_selling_price?: number;
          reorder_point?: number;
          max_stock_level?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          sku?: string;
          ndc_gtin?: string | null;
          generic_name?: string;
          brand_name?: string | null;
          category?: string | null;
          dosage_form?: string | null;
          strength?: string | null;
          pack_size?: string | null;
          risk_level?: string;
          storage_requirements?: string | null;
          unit_cost_price?: number;
          unit_selling_price?: number;
          reorder_point?: number;
          max_stock_level?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      batches: {
        Row: {
          id: string;
          owner_id: string;
          medication_id: string;
          lot_number: string;
          expiration_date: string;
          quantity_on_hand: number;
          supplier_name: string | null;
          storage_location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          medication_id: string;
          lot_number: string;
          expiration_date: string;
          quantity_on_hand?: number;
          supplier_name?: string | null;
          storage_location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          medication_id?: string;
          lot_number?: string;
          expiration_date?: string;
          quantity_on_hand?: number;
          supplier_name?: string | null;
          storage_location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "batches_medication_id_fkey";
            columns: ["medication_id"];
            isOneToOne: false;
            referencedRelation: "medications";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_transactions: {
        Row: {
          id: string;
          owner_id: string;
          medication_id: string;
          batch_id: string;
          type: TransactionType;
          quantity: number;
          unit_price_snapshot: number;
          line_total: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          medication_id: string;
          batch_id: string;
          type: TransactionType;
          quantity: number;
          unit_price_snapshot: number;
          line_total: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          medication_id?: string;
          batch_id?: string;
          type?: TransactionType;
          quantity?: number;
          unit_price_snapshot?: number;
          line_total?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_medication_id_fkey";
            columns: ["medication_id"];
            isOneToOne: false;
            referencedRelation: "medications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_transactions_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          owner_id: string;
          status: string;
          plan_code: string;
          amount_centavos: number;
          currency: string;
          current_period_start: string | null;
          current_period_end: string | null;
          paymongo_checkout_session_id: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          status?: string;
          plan_code?: string;
          amount_centavos?: number;
          currency?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          paymongo_checkout_session_id?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          owner_id?: string;
          status?: string;
          plan_code?: string;
          amount_centavos?: number;
          currency?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          paymongo_checkout_session_id?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      subscription_payments: {
        Row: {
          id: string;
          owner_id: string;
          checkout_session_id: string;
          reference_number: string | null;
          amount_centavos: number;
          currency: string;
          status: string;
          paymongo_event_id: string | null;
          paid_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          checkout_session_id: string;
          reference_number?: string | null;
          amount_centavos: number;
          currency?: string;
          status?: string;
          paymongo_event_id?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          checkout_session_id?: string;
          reference_number?: string | null;
          amount_centavos?: number;
          currency?: string;
          status?: string;
          paymongo_event_id?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      record_stock_in: {
        Args: {
          p_medication_id: string;
          p_lot_number: string;
          p_expiration_date: string;
          p_quantity: number;
          p_supplier_name?: string | null;
          p_storage_location?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      record_stock_out: {
        Args: {
          p_medication_id: string;
          p_quantity: number;
          p_batch_id?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Medication = Database["public"]["Tables"]["medications"]["Row"];
export type Batch = Database["public"]["Tables"]["batches"]["Row"];
export type InventoryTransaction =
  Database["public"]["Tables"]["inventory_transactions"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
