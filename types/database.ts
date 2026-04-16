/**
 * SPALT MVP 資料庫型別定義
 * 對應 Supabase 資料表結構
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          league: string;
          logo_url: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          league: string;
          logo_url?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          league?: string;
          logo_url?: string | null;
          description?: string | null;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          name: string;
          position: string | null;
          team_id: string | null;
          jersey_number: number | null;
          avatar_url: string | null;
          bio: string | null;
          stats: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          position?: string | null;
          team_id?: string | null;
          jersey_number?: number | null;
          avatar_url?: string | null;
          bio?: string | null;
          stats?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          position?: string | null;
          team_id?: string | null;
          jersey_number?: number | null;
          avatar_url?: string | null;
          bio?: string | null;
          stats?: Json | null;
          updated_at?: string;
        };
      };
      games: {
        Row: {
          id: string;
          league: string;
          home_team_id: string | null;
          away_team_id: string | null;
          scheduled_at: string;
          status: 'scheduled' | 'live' | 'finished' | 'cancelled';
          home_score: number | null;
          away_score: number | null;
          venue: string | null;
          external_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league: string;
          home_team_id?: string | null;
          away_team_id?: string | null;
          scheduled_at: string;
          status?: 'scheduled' | 'live' | 'finished' | 'cancelled';
          home_score?: number | null;
          away_score?: number | null;
          venue?: string | null;
          external_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          league?: string;
          home_team_id?: string;
          away_team_id?: string;
          scheduled_at?: string;
          status?: 'scheduled' | 'live' | 'finished' | 'cancelled';
          home_score?: number | null;
          away_score?: number | null;
          venue?: string | null;
          external_id?: string | null;
          updated_at?: string;
        };
      };
      news: {
        Row: {
          id: string;
          title: string;
          summary: string | null;
          content: string | null;
          source: string;
          url: string | null;
          image_url: string | null;
          tags: string[] | null;
          published_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          summary?: string | null;
          content?: string | null;
          source: string;
          url?: string | null;
          image_url?: string | null;
          tags?: string[] | null;
          published_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          summary?: string | null;
          content?: string | null;
          source?: string;
          url?: string | null;
          image_url?: string | null;
          tags?: string[] | null;
          published_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          organizer_id: string;
          scheduled_at: string;
          location: string;
          quota: number;
          fee: number;
          status: 'draft' | 'open' | 'closed' | 'cancelled' | 'finished';
          form_schema: Json | null;
          recurrence_rule: string | null;
          recurrence_end_date: string | null;
          recurrence_count: number | null;
          parent_event_id: string | null;
          is_recurring_instance: boolean | null;
          sport_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          organizer_id: string;
          scheduled_at: string;
          location: string;
          quota: number;
          fee?: number;
          form_schema?: Json | null;
          status?: 'draft' | 'open' | 'closed' | 'cancelled' | 'finished';
          recurrence_rule?: string | null;
          recurrence_end_date?: string | null;
          recurrence_count?: number | null;
          parent_event_id?: string | null;
          is_recurring_instance?: boolean | null;
          sport_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          scheduled_at?: string;
          location?: string;
          quota?: number;
          fee?: number;
          form_schema?: Json | null;
          status?: 'draft' | 'open' | 'closed' | 'cancelled' | 'finished';
          recurrence_rule?: string | null;
          recurrence_end_date?: string | null;
          recurrence_count?: number | null;
          parent_event_id?: string | null;
          is_recurring_instance?: boolean | null;
          sport_type?: string | null;
          updated_at?: string;
        };
      };
      registrations: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          form_data: Json | null;
          payment_status: 'pending' | 'paid' | 'refunded';
          status: 'registered' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          form_data?: Json | null;
          payment_status?: 'pending' | 'paid' | 'refunded';
          status?: 'registered' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          form_data?: Json | null;
          payment_status?: 'pending' | 'paid' | 'refunded';
          status?: 'registered' | 'cancelled';
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          entity_type: 'game' | 'team' | 'player' | 'news' | 'event';
          entity_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entity_type: 'game' | 'team' | 'player' | 'news' | 'event';
          entity_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          updated_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          entity_type: 'game' | 'team' | 'player' | 'news' | 'event' | 'comment';
          entity_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entity_type: 'game' | 'team' | 'player' | 'news' | 'event' | 'comment';
          entity_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
        };
      };
    };
      event_scores: {
        Row: {
          id: string;
          event_id: string;
          label: string;
          score: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          label: string;
          score?: number;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          score?: number;
          sort_order?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      game_status: 'scheduled' | 'live' | 'finished' | 'cancelled';
      event_status: 'draft' | 'open' | 'closed' | 'cancelled' | 'finished';
      payment_status: 'pending' | 'paid' | 'refunded';
      registration_status: 'registered' | 'cancelled';
      entity_type: 'game' | 'team' | 'player' | 'news' | 'event' | 'comment';
    };
  };
}

// 匯出常用型別
export type Team = Database['public']['Tables']['teams']['Row'];
export type Player = Database['public']['Tables']['players']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];
export type News = Database['public']['Tables']['news']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];
export type Registration = Database['public']['Tables']['registrations']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Like = Database['public']['Tables']['likes']['Row'];
export type EventScore = Database['public']['Tables']['event_scores']['Row'];

