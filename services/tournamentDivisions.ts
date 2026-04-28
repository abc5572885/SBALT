/**
 * Tournament Divisions — 賽事內的分組（A 級 / B 級 / C 級...），由 organizer 自定。
 * 每個 registration 可落到某個 division；matches 也能標 division 用於排名。
 */

import { supabase } from '@/lib/supabase';

export interface TournamentDivision {
  id: string;
  tournament_id: string;
  name: string;
  level_order: number;
  description: string | null;
  created_at: string;
}

export async function getDivisions(tournamentId: string): Promise<TournamentDivision[]> {
  const { data, error } = await supabase
    .from('tournament_divisions')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('level_order', { ascending: true });
  if (error) throw error;
  return (data || []) as TournamentDivision[];
}

export async function createDivision(params: {
  tournamentId: string;
  name: string;
  levelOrder?: number;
  description?: string;
}): Promise<TournamentDivision> {
  const { data, error } = await supabase
    .from('tournament_divisions')
    .insert({
      tournament_id: params.tournamentId,
      name: params.name,
      level_order: params.levelOrder ?? 0,
      description: params.description ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TournamentDivision;
}

export async function updateDivision(
  id: string,
  patch: { name?: string; level_order?: number; description?: string | null },
): Promise<void> {
  const { error } = await supabase.from('tournament_divisions').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteDivision(id: string): Promise<void> {
  const { error } = await supabase.from('tournament_divisions').delete().eq('id', id);
  if (error) throw error;
}
