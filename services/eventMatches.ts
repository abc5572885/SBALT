/**
 * Event Matches — 一場揪打活動 (event) 內的多場比賽 (match)。
 *
 * 一個 event 可有 N 個 matches，例如系隊邀請賽 4 隊 round-robin = 6 場 matches。
 * 每場 match 有自己的：
 *   - 兩隊名稱 (home_label / away_label)
 *   - 球員陣容 (basketball_stats / volleyball_stats / badminton_stats rows scoped by match_id)
 *   - 計分動作 (event_actions scoped by match_id)
 *   - 計時 (started_at / ended_at on event_matches)
 *   - 局數 / 節數
 */

import { supabase } from '@/lib/supabase';

export interface EventMatch {
  id: string;
  event_id: string;
  match_number: number;
  sport: string;
  home_label: string;
  away_label: string;
  status: 'open' | 'finished' | 'cancelled';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export async function getEventMatches(eventId: string): Promise<EventMatch[]> {
  const { data, error } = await supabase
    .from('event_matches')
    .select('*')
    .eq('event_id', eventId)
    .order('match_number', { ascending: true });
  if (error) throw error;
  return (data || []) as EventMatch[];
}

export async function getMatchById(matchId: string): Promise<EventMatch | null> {
  const { data, error } = await supabase
    .from('event_matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();
  if (error) throw error;
  return (data as EventMatch) || null;
}

export async function createMatch(params: {
  eventId: string;
  sport: string;
  homeLabel: string;
  awayLabel: string;
}): Promise<EventMatch> {
  const existing = await getEventMatches(params.eventId);
  const nextNumber = existing.length === 0 ? 1 : existing[existing.length - 1].match_number + 1;
  const { data, error } = await supabase
    .from('event_matches')
    .insert({
      event_id: params.eventId,
      match_number: nextNumber,
      sport: params.sport,
      home_label: params.homeLabel,
      away_label: params.awayLabel,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw error;
  return data as EventMatch;
}

export async function markMatchStarted(matchId: string) {
  const { data: m } = await supabase
    .from('event_matches')
    .select('started_at')
    .eq('id', matchId)
    .maybeSingle();
  if (m?.started_at) return;
  await supabase
    .from('event_matches')
    .update({ started_at: new Date().toISOString() })
    .eq('id', matchId);
}

export async function finishMatch(matchId: string) {
  await supabase
    .from('event_matches')
    .update({
      status: 'finished',
      ended_at: new Date().toISOString(),
    })
    .eq('id', matchId);
}

export async function reopenMatch(matchId: string) {
  await supabase
    .from('event_matches')
    .update({
      status: 'open',
      ended_at: null,
    })
    .eq('id', matchId);
}

export async function deleteMatch(matchId: string) {
  // CASCADE will clear stats / event_actions / sets / games for this match
  const { error } = await supabase.from('event_matches').delete().eq('id', matchId);
  if (error) throw error;
}

export async function updateMatchLabels(
  matchId: string,
  homeLabel: string,
  awayLabel: string,
) {
  const { error } = await supabase
    .from('event_matches')
    .update({ home_label: homeLabel, away_label: awayLabel })
    .eq('id', matchId);
  if (error) throw error;
}
