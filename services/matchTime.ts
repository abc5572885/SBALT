/**
 * Match-time orchestration: 比賽計時 + 單局比分。
 *
 * 對齊 FIVB（排球 25/15 分制）/ BWF（羽球 21 分制 best-of-3）的 per-set 紀錄，
 * 並追蹤實際比賽起訖時間（events.match_started_at / match_ended_at）。
 */

import { supabase } from '@/lib/supabase';

// ── Match start / end ─────────────────────────────────────────────

/** 標記比賽實際開始時間（首次點動作時自動呼叫，冪等：已開始就不覆寫）。 */
export async function markMatchStarted(eventId: string) {
  // Only update if currently null
  const { data: ev } = await supabase
    .from('events')
    .select('match_started_at')
    .eq('id', eventId)
    .maybeSingle();
  if (ev?.match_started_at) return;
  await supabase
    .from('events')
    .update({ match_started_at: new Date().toISOString() })
    .eq('id', eventId);
}

/** 標記比賽結束時間（球經結束計分時呼叫）。 */
export async function markMatchEnded(eventId: string) {
  await supabase
    .from('events')
    .update({ match_ended_at: new Date().toISOString() })
    .eq('id', eventId);
}

// ── Volleyball sets ─────────────────────────────────────────────

export interface VolleyballSet {
  id: string;
  event_id: string;
  set_number: number;
  home_label: string;
  away_label: string;
  home_score: number;
  away_score: number;
  started_at: string;
  ended_at: string | null;
}

export async function getVolleyballSets(eventId: string): Promise<VolleyballSet[]> {
  const { data, error } = await supabase
    .from('volleyball_sets')
    .select('*')
    .eq('event_id', eventId)
    .order('set_number', { ascending: true });
  if (error) throw error;
  return (data || []) as VolleyballSet[];
}

/** Open the next volleyball set. If no set exists yet, opens set 1. Idempotent on existing open sets. */
export async function openVolleyballSet(
  eventId: string,
  homeLabel: string,
  awayLabel: string,
): Promise<VolleyballSet> {
  const sets = await getVolleyballSets(eventId);
  const open = sets.find((s) => !s.ended_at);
  if (open) return open;

  const nextNumber = sets.length === 0 ? 1 : sets[sets.length - 1].set_number + 1;
  const { data, error } = await supabase
    .from('volleyball_sets')
    .insert({
      event_id: eventId,
      set_number: nextNumber,
      home_label: homeLabel,
      away_label: awayLabel,
      home_score: 0,
      away_score: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as VolleyballSet;
}

export async function updateVolleyballSetScore(
  setId: string,
  patch: { home_score?: number; away_score?: number },
) {
  const { error } = await supabase.from('volleyball_sets').update(patch).eq('id', setId);
  if (error) throw error;
}

export async function closeVolleyballSet(setId: string) {
  const { error } = await supabase
    .from('volleyball_sets')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', setId);
  if (error) throw error;
}

// ── Badminton games ─────────────────────────────────────────────

export interface BadmintonGame {
  id: string;
  event_id: string;
  game_number: number;
  home_label: string;
  away_label: string;
  home_score: number;
  away_score: number;
  started_at: string;
  ended_at: string | null;
}

export async function getBadmintonGames(eventId: string): Promise<BadmintonGame[]> {
  const { data, error } = await supabase
    .from('badminton_games')
    .select('*')
    .eq('event_id', eventId)
    .order('game_number', { ascending: true });
  if (error) throw error;
  return (data || []) as BadmintonGame[];
}

export async function openBadmintonGame(
  eventId: string,
  homeLabel: string,
  awayLabel: string,
): Promise<BadmintonGame> {
  const games = await getBadmintonGames(eventId);
  const open = games.find((g) => !g.ended_at);
  if (open) return open;

  const nextNumber = games.length === 0 ? 1 : games[games.length - 1].game_number + 1;
  const { data, error } = await supabase
    .from('badminton_games')
    .insert({
      event_id: eventId,
      game_number: nextNumber,
      home_label: homeLabel,
      away_label: awayLabel,
      home_score: 0,
      away_score: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as BadmintonGame;
}

export async function updateBadmintonGameScore(
  gameId: string,
  patch: { home_score?: number; away_score?: number },
) {
  const { error } = await supabase.from('badminton_games').update(patch).eq('id', gameId);
  if (error) throw error;
}

export async function closeBadmintonGame(gameId: string) {
  const { error } = await supabase
    .from('badminton_games')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', gameId);
  if (error) throw error;
}

// ── Display helpers ─────────────────────────────────────────────

// ── Reset ──────────────────────────────────────────────────────

const BASKETBALL_RESET_FIELDS = {
  points_1pt: 0,
  points_2pt: 0,
  points_3pt: 0,
  misses_1pt: 0,
  misses_2pt: 0,
  misses_3pt: 0,
  rebounds: 0,
  offensive_rebounds: 0,
  defensive_rebounds: 0,
  assists: 0,
  steals: 0,
  blocks: 0,
  turnovers: 0,
  fouls: 0,
};

const VOLLEYBALL_RESET_FIELDS = {
  spikes: 0,
  spike_errors: 0,
  blocks: 0,
  block_errors: 0,
  serve_aces: 0,
  serve_errors: 0,
  reception_successes: 0,
  reception_errors: 0,
  set_assists: 0,
  digs: 0,
  errors: 0,
  points_total: 0,
};

const BADMINTON_RESET_FIELDS = {
  smashes: 0,
  smash_errors: 0,
  drops: 0,
  drop_errors: 0,
  net_kills: 0,
  net_kill_errors: 0,
  clears: 0,
  clear_errors: 0,
  drives: 0,
  drive_errors: 0,
  lifts: 0,
  lift_errors: 0,
  errors: 0,
  points_won: 0,
  points_lost: 0,
  sets_won: 0,
  sets_lost: 0,
};

/**
 * Wipe all recorded stats / actions / sets / games for an event, keeping the
 * lineup (rows) intact so the recorder can re-record from scratch. Match start
 * and end are also cleared so the timer restarts on next action.
 *
 * Caller MUST get explicit user confirmation — this is destructive.
 */
export async function resetMatchData(
  eventId: string,
  sport: 'basketball' | 'volleyball' | 'badminton',
): Promise<void> {
  const table =
    sport === 'basketball' ? 'basketball_stats'
      : sport === 'volleyball' ? 'volleyball_stats'
        : 'badminton_stats';
  const fields =
    sport === 'basketball' ? BASKETBALL_RESET_FIELDS
      : sport === 'volleyball' ? VOLLEYBALL_RESET_FIELDS
        : BADMINTON_RESET_FIELDS;

  await supabase.from(table).update(fields).eq('event_id', eventId);
  await supabase.from('event_actions').delete().eq('event_id', eventId);
  if (sport === 'volleyball') {
    await supabase.from('volleyball_sets').delete().eq('event_id', eventId);
  }
  if (sport === 'badminton') {
    await supabase.from('badminton_games').delete().eq('event_id', eventId);
  }
  await supabase
    .from('events')
    .update({ match_started_at: null, match_ended_at: null })
    .eq('id', eventId);
  await supabase.from('event_scores').delete().eq('event_id', eventId);
}

export function formatMatchDuration(startISO: string | null, endISO: string | null): string {
  if (!startISO) return '—';
  const start = new Date(startISO).getTime();
  const end = endISO ? new Date(endISO).getTime() : Date.now();
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
