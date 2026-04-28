/**
 * event_actions log — 動作層級的事件流。
 *
 * 與 stats counter 表並存：counter 表是讀取快取，event_actions 是來源。
 * MIN（在場時間）/ +/-（在場分差）/ 單節分數 都從這裡推導。
 */

import { supabase } from '@/lib/supabase';

export type ActionRow = {
  id: string;
  event_id: string;
  match_id: string | null;
  sport: 'basketball' | 'volleyball' | 'badminton';
  stat_id: string | null;
  user_id: string | null;
  team_label: string;
  action_type: string;
  points_delta: number;
  quarter: number | null;
  set_number: number | null;
  ts: string;
  meta: Record<string, any> | null;
};

export interface LogActionParams {
  eventId: string;
  matchId?: string | null;
  sport: 'basketball' | 'volleyball' | 'badminton';
  statId: string | null;
  userId: string | null;
  teamLabel: string;
  actionType: string;
  pointsDelta?: number;
  quarter?: number | null;
  setNumber?: number | null;
  meta?: Record<string, any>;
}

export async function logAction(params: LogActionParams): Promise<ActionRow> {
  const { data, error } = await supabase
    .from('event_actions')
    .insert({
      event_id: params.eventId,
      match_id: params.matchId ?? null,
      sport: params.sport,
      stat_id: params.statId,
      user_id: params.userId,
      team_label: params.teamLabel,
      action_type: params.actionType,
      points_delta: params.pointsDelta ?? 0,
      quarter: params.quarter ?? null,
      set_number: params.setNumber ?? null,
      meta: params.meta ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ActionRow;
}

export async function getEventActions(eventId: string): Promise<ActionRow[]> {
  const { data, error } = await supabase
    .from('event_actions')
    .select('*')
    .eq('event_id', eventId)
    .order('ts', { ascending: true });
  if (error) throw error;
  return (data || []) as ActionRow[];
}

export async function getMatchActions(matchId: string): Promise<ActionRow[]> {
  const { data, error } = await supabase
    .from('event_actions')
    .select('*')
    .eq('match_id', matchId)
    .order('ts', { ascending: true });
  if (error) throw error;
  return (data || []) as ActionRow[];
}

export async function deleteAction(id: string) {
  const { error } = await supabase.from('event_actions').delete().eq('id', id);
  if (error) throw error;
}

// ── Substitution helpers ──────────────────────────────────────────

export interface SubEntry {
  statId: string;
  userId: string | null;
}

export interface SubstitutionInput {
  eventId: string;
  matchId?: string | null;
  sport: 'basketball' | 'volleyball' | 'badminton';
  teamLabel: string;
  /** Players coming off court (empty if no one is being subbed out). */
  outs: SubEntry[];
  /** Players coming on court (empty if no one is being subbed in). */
  ins: SubEntry[];
  quarter?: number | null;
  setNumber?: number | null;
}

/**
 * Record one or more substitutions for a team at a single instant.
 * outs[] and ins[] do NOT have to be the same length — a roster of 1
 * can put their only player on court (ins=[x], outs=[]); a benched
 * starter can come off without replacement (outs=[x], ins=[]); the
 * common case of swapping N players is supported with both arrays
 * the same length.
 */
export async function recordSubstitution(input: SubstitutionInput): Promise<void> {
  const ts = new Date().toISOString();
  const rows: any[] = [];
  const baseFields = {
    event_id: input.eventId,
    match_id: input.matchId ?? null,
    sport: input.sport,
    team_label: input.teamLabel,
    points_delta: 0,
    quarter: input.quarter ?? null,
    set_number: input.setNumber ?? null,
    ts,
  };
  for (const o of input.outs) {
    rows.push({
      ...baseFields,
      stat_id: o.statId,
      user_id: o.userId,
      action_type: 'sub_out',
    });
  }
  for (const i of input.ins) {
    rows.push({
      ...baseFields,
      stat_id: i.statId,
      user_id: i.userId,
      action_type: 'sub_in',
    });
  }
  if (rows.length === 0) return;
  const { error } = await supabase.from('event_actions').insert(rows);
  if (error) throw error;
}

// ── Derived metrics ──────────────────────────────────────────────

/**
 * Compute on-court status for each player (stat_id) at a given moment.
 * Returns set of stat_ids currently on court.
 *
 * Initial state: starters are on court at match_started_at.
 * Updated by sub_in / sub_out events in chronological order.
 */
export function computeActiveAt(
  starters: Set<string>,
  actions: ActionRow[],
  atIso: string,
): Set<string> {
  const onCourt = new Set(starters);
  const at = new Date(atIso).getTime();
  const sorted = [...actions].sort((a, b) => a.ts.localeCompare(b.ts));
  for (const a of sorted) {
    if (new Date(a.ts).getTime() > at) break;
    if (a.action_type === 'sub_in' && a.stat_id) onCourt.add(a.stat_id);
    if (a.action_type === 'sub_out' && a.stat_id) onCourt.delete(a.stat_id);
  }
  return onCourt;
}

export interface OnCourtInterval {
  start: string; // ISO
  end: string;   // ISO
}

/**
 * Compute on-court intervals for a single player (statId), ordered chronologically.
 * Used for MIN and +/- derivations.
 */
export function computePlayerIntervals(
  statId: string,
  isStarter: boolean,
  matchStartIso: string,
  matchEndIso: string,
  actions: ActionRow[],
): OnCourtInterval[] {
  const sorted = actions
    .filter((a) => a.stat_id === statId && (a.action_type === 'sub_in' || a.action_type === 'sub_out'))
    .sort((a, b) => a.ts.localeCompare(b.ts));

  const matchStartMs = new Date(matchStartIso).getTime();
  const matchEndMs = new Date(matchEndIso).getTime();

  const intervals: OnCourtInterval[] = [];
  let openStart: string | null = isStarter ? matchStartIso : null;

  for (const a of sorted) {
    if (a.action_type === 'sub_in') {
      if (openStart === null) openStart = a.ts;
    } else {
      if (openStart !== null) {
        intervals.push({ start: openStart, end: a.ts });
        openStart = null;
      }
    }
  }
  if (openStart !== null) {
    intervals.push({ start: openStart, end: matchEndIso });
  }

  // Clamp every interval to [matchStart, matchEnd] so a sub_in recorded
  // before the match was officially started can't push MIN above 比賽時長.
  return intervals
    .map((iv) => {
      const start = Math.max(new Date(iv.start).getTime(), matchStartMs);
      const end = Math.min(new Date(iv.end).getTime(), matchEndMs);
      if (end <= start) return null;
      return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
    })
    .filter((iv): iv is OnCourtInterval => iv !== null);
}

/** Sum interval durations in seconds, with a sanity cap. */
export function intervalsTotalSeconds(intervals: OnCourtInterval[]): number {
  let total = 0;
  for (const iv of intervals) {
    total += Math.max(0, (new Date(iv.end).getTime() - new Date(iv.start).getTime()) / 1000);
  }
  // Cap at 4 hours to silently absorb stale match_started_at from cross-session testing.
  // A regulation NBA game is 48 min playing time; FIBA is 40; even with breaks the wall
  // clock should never exceed this.
  return Math.min(total, 4 * 60 * 60);
}

/**
 * Plus-minus for a player: net team-points scored during their on-court intervals.
 * Counts +points_delta for own team's scoring actions, −points_delta for opponent's,
 * but only for scoring events whose timestamp falls within an interval.
 */
export function computePlusMinus(
  teamLabel: string,
  intervals: OnCourtInterval[],
  scoringActions: ActionRow[],
): number {
  let net = 0;
  for (const iv of intervals) {
    const start = new Date(iv.start).getTime();
    const end = new Date(iv.end).getTime();
    for (const a of scoringActions) {
      if (!a.points_delta) continue;
      const ts = new Date(a.ts).getTime();
      if (ts < start || ts > end) continue;
      if (a.team_label === teamLabel) net += a.points_delta;
      else net -= a.points_delta;
    }
  }
  return net;
}

/** Per-quarter / per-set team scores derived from scoring action log. */
export function aggregateQuarterScores(
  actions: ActionRow[],
): Map<number, Map<string, number>> {
  const result = new Map<number, Map<string, number>>();
  for (const a of actions) {
    if (!a.points_delta || !a.quarter) continue;
    let q = result.get(a.quarter);
    if (!q) {
      q = new Map();
      result.set(a.quarter, q);
    }
    q.set(a.team_label, (q.get(a.team_label) || 0) + a.points_delta);
  }
  return result;
}
