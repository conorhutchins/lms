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
      competitions: {
        Row: {
          created_at: string
          entry_fee: number
          id: string
          prize_pot: number
          rolled_over: boolean
          start_date: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          entry_fee?: number
          id?: string
          prize_pot?: number
          rolled_over?: boolean
          start_date: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          entry_fee?: number
          id?: string
          prize_pot?: number
          rolled_over?: boolean
          start_date?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          away_score: number | null
          away_team: string | null
          away_team_id: number | null
          created_at: string | null
          external_id: number
          gameweek: number | null
          home_score: number | null
          home_team: string | null
          home_team_id: number | null
          id: string
          kickoff_time: string | null
          league_id: number
          round: string | null
          season: number
          status: string | null
          results_processed: boolean | null
        }
        Insert: {
          away_score?: number | null
          away_team?: string | null
          away_team_id?: number | null
          created_at?: string | null
          external_id: number
          gameweek?: number | null
          home_score?: number | null
          home_team?: string | null
          home_team_id?: number | null
          id?: string
          kickoff_time?: string | null
          league_id: number
          round?: string | null
          season: number
          status?: string | null
          results_processed?: boolean | null
        }
        Update: {
          away_score?: number | null
          away_team?: string | null
          away_team_id?: number | null
          created_at?: string | null
          external_id?: number
          gameweek?: number | null
          home_score?: number | null
          home_team?: string | null
          home_team_id?: number | null
          id?: string
          kickoff_time?: string | null
          league_id?: number
          round?: string | null
          season?: number
          status?: string | null
          results_processed?: boolean | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          competition_id: string
          created_at: string
          free_hit_round_id: string | null
          free_hit_used: boolean | null
          id: string
          payment_provider: string | null
          payment_status: string
          payment_type: string
          provider_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          competition_id: string
          created_at?: string
          free_hit_round_id?: string | null
          free_hit_used?: boolean | null
          id?: string
          payment_provider?: string | null
          payment_status: string
          payment_type: string
          provider_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          competition_id?: string
          created_at?: string
          free_hit_round_id?: string | null
          free_hit_used?: boolean | null
          id?: string
          payment_provider?: string | null
          payment_status?: string
          payment_type?: string
          provider_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_free_hit_round_id_fkey"
            columns: ["free_hit_round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      picks: {
        Row: {
          id: string
          pick_timestamp: string
          round_id: string
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          pick_timestamp?: string
          round_id: string
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          pick_timestamp?: string
          round_id?: string
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "picks_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      rounds: {
        Row: {
          competition_id: string
          created_at: string
          deadline_date: string
          id: string
          round_number: number
        }
        Insert: {
          competition_id: string
          created_at?: string
          deadline_date: string
          id?: string
          round_number: number
        }
        Update: {
          competition_id?: string
          created_at?: string
          deadline_date?: string
          id?: string
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          external_api_id: string | null
          id: string
          league: string | null
          name: string
        }
        Insert: {
          created_at?: string
          external_api_id?: string | null
          id?: string
          league?: string | null
          name: string
        }
        Update: {
          created_at?: string
          external_api_id?: string | null
          id?: string
          league?: string | null
          name?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
