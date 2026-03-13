export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string | null
          email: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          cpf_cnpj: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          profile_completed: boolean | null
          specialty: string | null
          updated_at: string | null
          user_id: string
          avatar_url: string | null
        }
        Insert: {
          bio?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_completed?: boolean | null
          specialty?: string | null
          updated_at?: string | null
          user_id: string
          avatar_url?: string | null
        }
        Update: {
          bio?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_completed?: boolean | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string
          avatar_url?: string | null
        }
        Relationships: []
      }
      salon_settings: {
        Row: {
          id: string
          owner_commission_percent: number
          salon_name: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_commission_percent?: number
          salon_name?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_commission_percent?: number
          salon_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_records: {
        Row: {
          client_name: string
          comanda_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          owner_cut: number
          professional_commission: number
          service_date: string
          service_type: string
          service_value: number
          user_id: string
        }
        Insert: {
          client_name: string
          comanda_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          owner_cut: number
          professional_commission: number
          service_date?: string
          service_type: string
          service_value: number
          user_id: string
        }
        Update: {
          client_name?: string
          comanda_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          owner_cut?: number
          professional_commission?: number
          service_date?: string
          service_type?: string
          service_value?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: "admin" | "user"
          user_id: string
        }
        Insert: {
          id?: string
          role?: "admin" | "user"
          user_id: string
        }
        Update: {
          id?: string
          role?: "admin" | "user"
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: "admin" | "user"
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
