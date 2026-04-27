import { supabase } from '@/lib/supabase';
import { BadmintonStat } from './sportStats';

export type BadmintonAction =
  | 'smash'
  | 'smash_error'
  | 'drop'
  | 'drop_error'
  | 'net_kill'
  | 'net_kill_error'
  | 'error';

export interface BadmintonActionMeta {
  key: BadmintonAction;
  label: string;
  field: keyof Pick<
    BadmintonStat,
    | 'smashes' | 'smash_errors'
    | 'drops' | 'drop_errors'
    | 'net_kills' | 'net_kill_errors'
    | 'errors'
  >;
  /** Whether this action gives the player's team a point (winning shot). */
  scores: boolean;
  category: 'primary' | 'secondary';
  tone: 'score' | 'miss' | 'positive' | 'negative';
}

export const BADMINTON_ACTIONS: BadmintonActionMeta[] = [
  { key: 'smash',          label: '殺球得分', field: 'smashes',         scores: true,  category: 'primary',   tone: 'score' },
  { key: 'drop',           label: '放短得分', field: 'drops',           scores: true,  category: 'primary',   tone: 'score' },
  { key: 'net_kill',       label: '撲球得分', field: 'net_kills',       scores: true,  category: 'primary',   tone: 'score' },
  { key: 'smash_error',    label: '殺球失誤', field: 'smash_errors',    scores: false, category: 'primary',   tone: 'miss' },
  { key: 'drop_error',     label: '放短失誤', field: 'drop_errors',     scores: false, category: 'primary',   tone: 'miss' },
  { key: 'net_kill_error', label: '撲球失誤', field: 'net_kill_errors', scores: false, category: 'primary',   tone: 'miss' },
  { key: 'error',          label: '一般失誤', field: 'errors',          scores: false, category: 'secondary', tone: 'negative' },
];

export function getBadmintonActionMeta(action: BadmintonAction): BadmintonActionMeta {
  return BADMINTON_ACTIONS.find((a) => a.key === action)!;
}

export interface BadmintonLineupPlayer {
  user_id?: string | null;
  display_name?: string | null;
  jersey_number?: string | null;
  match_format?: 'singles' | 'doubles';
  partner_id?: string | null;
  team_label: string;
  is_starter?: boolean;
}

export async function createBadmintonLineup(
  eventId: string,
  players: BadmintonLineupPlayer[],
): Promise<BadmintonStat[]> {
  if (players.length === 0) return [];
  const rows = players.map((p) => ({
    event_id: eventId,
    user_id: p.user_id || null,
    display_name: p.display_name || null,
    jersey_number: p.jersey_number || null,
    match_format: p.match_format || 'singles',
    partner_id: p.partner_id || null,
    team_label: p.team_label,
    is_starter: p.is_starter || false,
  }));
  const { data, error } = await supabase.from('badminton_stats').insert(rows).select();
  if (error) throw error;
  return (data || []) as BadmintonStat[];
}

export async function recordBadmintonAction(
  stat: BadmintonStat,
  action: BadmintonAction,
): Promise<BadmintonStat> {
  const meta = getBadmintonActionMeta(action);
  const updates: Record<string, any> = {
    [meta.field]: (stat[meta.field] as number) + 1,
    updated_at: new Date().toISOString(),
  };
  if (meta.scores) updates.points_won = (stat.points_won || 0) + 1;
  else updates.points_lost = (stat.points_lost || 0) + 1;
  const { data, error } = await supabase
    .from('badminton_stats')
    .update(updates)
    .eq('id', stat.id)
    .select()
    .single();
  if (error) throw error;
  return data as BadmintonStat;
}

export async function undoBadmintonAction(
  stat: BadmintonStat,
  action: BadmintonAction,
): Promise<BadmintonStat> {
  const meta = getBadmintonActionMeta(action);
  const updates: Record<string, any> = {
    [meta.field]: Math.max(0, (stat[meta.field] as number) - 1),
    updated_at: new Date().toISOString(),
  };
  if (meta.scores) updates.points_won = Math.max(0, (stat.points_won || 0) - 1);
  else updates.points_lost = Math.max(0, (stat.points_lost || 0) - 1);
  const { data, error } = await supabase
    .from('badminton_stats')
    .update(updates)
    .eq('id', stat.id)
    .select()
    .single();
  if (error) throw error;
  return data as BadmintonStat;
}
