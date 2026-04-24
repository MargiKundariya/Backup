/**
 * Auto-generated Supabase database type definitions.
 * In production, run: supabase gen types typescript --local > src/types/database.ts
 * For now, manual definitions that mirror 00-schema.sql.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          updated_at?: string;
        };
      };
      designs: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          name: string;
          device_id: string;
          zone_designs: Json;
          export_options: Json;
          thumbnail: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          name: string;
          device_id: string;
          zone_designs?: Json;
          export_options?: Json;
          thumbnail?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          device_id?: string;
          zone_designs?: Json;
          export_options?: Json;
          thumbnail?: string | null;
          updated_at?: string;
        };
      };
      design_queues: {
        Row: {
          id: string;
          project_id: string | null;
          user_id: string;
          name: string;
          items: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          user_id: string;
          name?: string;
          items?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string | null;
          name?: string;
          items?: Json;
          updated_at?: string;
        };
      };
      user_preferences: {
        Row: {
          user_id: string;
          presets: Json;
          recent_devices: string[];
          updated_at: string;
        };
        Insert: {
          user_id: string;
          presets?: Json;
          recent_devices?: string[];
          updated_at?: string;
        };
        Update: {
          presets?: Json;
          recent_devices?: string[];
          updated_at?: string;
        };
      };
      device_sets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          device_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          device_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          device_ids?: string[];
          updated_at?: string;
        };
      };
      credits: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: 'purchase' | 'trial' | 'refund' | 'consume';
          reference_id: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: 'purchase' | 'trial' | 'refund' | 'consume';
          reference_id?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      stripe_events: {
        Row: {
          id: string;
          type: string;
          processed_at: string;
        };
        Insert: {
          id: string;
          type: string;
          processed_at?: string;
        };
        Update: never;
      };
    };
    Views: {
      credit_balance: {
        Row: {
          user_id: string;
          balance: number;
        };
      };
    };
    Functions: {
      deduct_credits: {
        Args: { p_user_id: string; p_amount: number; p_reference: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
}
