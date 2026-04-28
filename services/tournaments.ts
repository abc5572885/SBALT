import { supabase } from '@/lib/supabase';
import { TournamentFormat, TournamentStatus } from '@/constants/tournaments';

export interface Tournament {
  id: string;
  organizer_group_id: string;
  title: string;
  description: string | null;
  sport_type: string;
  format: TournamentFormat;
  start_date: string;
  end_date: string | null;
  registration_deadline: string | null;
  location: string;
  venue: string | null;
  rules: string | null;
  entry_fee: number;
  payment_info: string | null;
  prize_pool: string | null;
  max_participants: number | null;
  cover_image_url: string | null;
  status: TournamentStatus;
  registration_type: 'individual' | 'team';
  team_size: number | null;
  created_at: string;
  updated_at: string;
}

// (Per-user TournamentRegistration was removed in 2026-04-28 refactor.
// Group-based registrations live in services/tournamentRegistrations.ts.)

export async function createTournament(params: Omit<Tournament, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: TournamentStatus }): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .insert(params)
    .select()
    .single();
  if (error) throw error;
  return data as Tournament;
}

export async function getPublicTournaments(options?: { sportType?: string; limit?: number }): Promise<Tournament[]> {
  let query = supabase
    .from('tournaments')
    .select('*')
    .in('status', ['open', 'ongoing'])
    .order('start_date', { ascending: true });
  if (options?.sportType && options.sportType !== 'all') {
    query = query.eq('sport_type', options.sportType);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Tournament[];
}

export async function getTournamentsByGroup(groupId: string): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('organizer_group_id', groupId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data || []) as Tournament[];
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Tournament;
}

export async function updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Tournament;
}

export async function deleteTournament(id: string) {
  const { error } = await supabase.from('tournaments').delete().eq('id', id);
  if (error) throw error;
}

// Per-user registration helpers removed; see services/tournamentRegistrations.ts
// for the new group-based API (registerGroup, getRegistrations, etc.).
