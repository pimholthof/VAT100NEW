/**
 * Auto-generated Supabase types stub.
 * Run `npx supabase gen types typescript` to regenerate from your live schema.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      system_events: {
        Row: {
          id: string
          event_type: string
          payload: Record<string, unknown>
          processed_at: string | null
          created_at: string
          type?: string
          user_id?: string
        }
        Insert: {
          id?: string
          event_type: string
          payload?: Json
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          payload?: Json
          processed_at?: string | null
          created_at?: string
        }
      }
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, unknown>
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      [key: string]: string
    }
  }
}
