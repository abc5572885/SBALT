/**
 * Tournament Matchdays — 賽事的比賽日（每週日打一場那種）。
 * 一個 matchday 包多場 matches。
 */

import { supabase } from '@/lib/supabase';

export interface TournamentMatchday {
  id: string;
  tournament_id: string;
  matchday_number: number;
  scheduled_date: string | null;
  location: string | null;
  notes: string | null;
  status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled';
  created_at: string;
}

export async function getMatchdays(tournamentId: string): Promise<TournamentMatchday[]> {
  const { data, error } = await supabase
    .from('tournament_matchdays')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('matchday_number', { ascending: true });
  if (error) throw error;
  return (data || []) as TournamentMatchday[];
}

export async function getMatchdayById(id: string): Promise<TournamentMatchday | null> {
  const { data, error } = await supabase
    .from('tournament_matchdays')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as TournamentMatchday) || null;
}

export async function createMatchday(params: {
  tournamentId: string;
  scheduledDate?: string | null;
  location?: string | null;
  notes?: string | null;
}): Promise<TournamentMatchday> {
  const existing = await getMatchdays(params.tournamentId);
  const nextNumber = existing.length === 0 ? 1 : existing[existing.length - 1].matchday_number + 1;
  const { data, error } = await supabase
    .from('tournament_matchdays')
    .insert({
      tournament_id: params.tournamentId,
      matchday_number: nextNumber,
      scheduled_date: params.scheduledDate ?? null,
      location: params.location ?? null,
      notes: params.notes ?? null,
      status: 'scheduled',
    })
    .select()
    .single();
  if (error) throw error;
  return data as TournamentMatchday;
}

export async function updateMatchday(
  id: string,
  patch: Partial<Pick<TournamentMatchday, 'scheduled_date' | 'location' | 'notes' | 'status'>>,
): Promise<void> {
  const { error } = await supabase.from('tournament_matchdays').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteMatchday(id: string): Promise<void> {
  const { error } = await supabase.from('tournament_matchdays').delete().eq('id', id);
  if (error) throw error;
}
