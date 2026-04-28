/**
 * Matches — polymorphic table covering both event sub-matches (揪打) and
 * tournament matches.
 *
 * Context types:
 *   - 'event': an event-internal match (matchday_id null, event_id set).
 *              Used for casual multi-team rotations within one 揪打 activity.
 *   - 'tournament': belongs to a tournament_matchday + division, with
 *                   home_group_id / away_group_id pointing at the participating
 *                   groups (which double as teams).
 *
 * Each match owns its own:
 *   - per-player stats (basketball_stats / volleyball_stats / badminton_stats)
 *   - action log (event_actions)
 *   - per-set scores (volleyball_sets / badminton_games)
 *   - clock state (started_at / ended_at)
 */

import { supabase } from '@/lib/supabase';

export type MatchContext = 'event' | 'tournament';

export interface Match {
  id: string;
  context_type: MatchContext;
  // Event context
  event_id: string | null;
  // Tournament context
  matchday_id: string | null;
  division_id: string | null;
  home_group_id: string | null;
  away_group_id: string | null;
  // Common
  match_number: number;
  sport: string;
  home_label: string;
  away_label: string;
  status: 'open' | 'finished' | 'cancelled';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

/** Backwards-compat alias for code still importing `EventMatch`. */
export type EventMatch = Match;

export async function getMatchById(matchId: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();
  if (error) throw error;
  return (data as Match) || null;
}

// ── Event-context helpers ──────────────────────────────────────────────

export async function getEventMatches(eventId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('context_type', 'event')
    .eq('event_id', eventId)
    .order('match_number', { ascending: true });
  if (error) throw error;
  return (data || []) as Match[];
}

export async function createEventMatch(params: {
  eventId: string;
  sport: string;
  homeLabel: string;
  awayLabel: string;
}): Promise<Match> {
  const existing = await getEventMatches(params.eventId);
  const nextNumber = existing.length === 0 ? 1 : existing[existing.length - 1].match_number + 1;
  const { data, error } = await supabase
    .from('matches')
    .insert({
      context_type: 'event',
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
  return data as Match;
}

/** Backwards-compat: the old name used by app/event/matches.tsx. */
export const createMatch = createEventMatch;

// ── Tournament-context helpers ─────────────────────────────────────────

export async function getMatchdayMatches(matchdayId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('context_type', 'tournament')
    .eq('matchday_id', matchdayId)
    .order('match_number', { ascending: true });
  if (error) throw error;
  return (data || []) as Match[];
}

export async function getTournamentMatches(tournamentId: string): Promise<Match[]> {
  // Match → matchday → tournament. Use embedded select.
  const { data, error } = await supabase
    .from('matches')
    .select('*, tournament_matchdays!inner(tournament_id)')
    .eq('context_type', 'tournament')
    .eq('tournament_matchdays.tournament_id', tournamentId);
  if (error) throw error;
  return (data || []) as Match[];
}

export async function createTournamentMatch(params: {
  matchdayId: string;
  divisionId?: string | null;
  homeGroupId: string;
  awayGroupId: string;
  homeLabel: string;
  awayLabel: string;
  sport: string;
}): Promise<Match> {
  const existing = await getMatchdayMatches(params.matchdayId);
  const nextNumber = existing.length === 0 ? 1 : existing[existing.length - 1].match_number + 1;
  const { data, error } = await supabase
    .from('matches')
    .insert({
      context_type: 'tournament',
      matchday_id: params.matchdayId,
      division_id: params.divisionId ?? null,
      home_group_id: params.homeGroupId,
      away_group_id: params.awayGroupId,
      home_label: params.homeLabel,
      away_label: params.awayLabel,
      sport: params.sport,
      match_number: nextNumber,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Match;
}

// ── Common lifecycle ───────────────────────────────────────────────────

export async function markMatchStarted(matchId: string) {
  const { data: m } = await supabase
    .from('matches')
    .select('started_at')
    .eq('id', matchId)
    .maybeSingle();
  if (m?.started_at) return;
  await supabase
    .from('matches')
    .update({ started_at: new Date().toISOString() })
    .eq('id', matchId);
}

export async function finishMatch(matchId: string) {
  await supabase
    .from('matches')
    .update({
      status: 'finished',
      ended_at: new Date().toISOString(),
    })
    .eq('id', matchId);
}

export async function reopenMatch(matchId: string) {
  await supabase
    .from('matches')
    .update({ status: 'open', ended_at: null })
    .eq('id', matchId);
}

export async function deleteMatch(matchId: string) {
  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  if (error) throw error;
}

export async function updateMatchLabels(
  matchId: string,
  homeLabel: string,
  awayLabel: string,
) {
  const { error } = await supabase
    .from('matches')
    .update({ home_label: homeLabel, away_label: awayLabel })
    .eq('id', matchId);
  if (error) throw error;
}
