export type Database = {
  public: {
    Tables: {
      teams: {
        Row: { id: number; name: string; short_name: string | null; slug: string; colors: string[] | null; badge_svg: string | null };
        Insert: { id?: number; name: string; short_name?: string | null; slug: string; colors?: string[] | null; badge_svg?: string | null };
        Update: { id?: number; name?: string; short_name?: string | null; slug?: string; colors?: string[] | null; badge_svg?: string | null };
      };
      profiles: {
        Row: { id: string; email: string; display_name: string | null; is_admin: boolean; created_at: string };
        Insert: { id: string; email: string; display_name?: string | null; is_admin?: boolean; created_at?: string };
        Update: { id?: string; email?: string; display_name?: string | null; is_admin?: boolean; created_at?: string };
      };
      matches: {
        Row: { id: number; fase: number; home_team_id: number | null; away_team_id: number | null; home_goals: number | null; away_goals: number | null; home_penalties: number | null; away_penalties: number | null; kickoff: string; status: string; round_name: string | null; leg: number | null; aggregate_tie_id: number | null };
        Insert: { id?: number; fase: number; home_team_id?: number | null; away_team_id?: number | null; home_goals?: number | null; away_goals?: number | null; home_penalties?: number | null; away_penalties?: number | null; kickoff: string; status?: string; round_name?: string | null; leg?: number | null; aggregate_tie_id?: number | null };
        Update: { id?: number; fase?: number; home_team_id?: number | null; away_team_id?: number | null; home_goals?: number | null; away_goals?: number | null; home_penalties?: number | null; away_penalties?: number | null; kickoff?: string; status?: string; round_name?: string | null; leg?: number | null; aggregate_tie_id?: number | null };
      };
      predictions: {
        Row: { id: number; profile_id: string | null; match_id: number | null; home_goals: number; away_goals: number; created_at: string };
        Insert: { id?: number; profile_id?: string | null; match_id?: number | null; home_goals: number; away_goals: number; created_at?: string };
        Update: { id?: number; profile_id?: string | null; match_id?: number | null; home_goals?: number; away_goals?: number; created_at?: string };
      };
    };
  };
};