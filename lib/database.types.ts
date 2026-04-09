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
          processing_started_at: string | null
          processing_token: string | null
          attempts: number
          last_error: string | null
          failed_at: string | null
          type?: string
          user_id?: string
        }
        Insert: {
          id?: string
          event_type: string
          payload?: Json
          processed_at?: string | null
          created_at?: string
          processing_started_at?: string | null
          processing_token?: string | null
          attempts?: number
          last_error?: string | null
          failed_at?: string | null
        }
        Update: {
          id?: string
          event_type?: string
          payload?: Json
          processed_at?: string | null
          created_at?: string
          processing_started_at?: string | null
          processing_token?: string | null
          attempts?: number
          last_error?: string | null
          failed_at?: string | null
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
