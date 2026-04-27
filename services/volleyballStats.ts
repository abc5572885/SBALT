import { supabase } from '@/lib/supabase';
import { VolleyballStat } from './sportStats';

export type VolleyballAction =
  | 'spike'
  | 'spike_error'
  | 'block'
  | 'block_error'
  | 'serve_ace'
  | 'serve_error'
  | 'set_assist'
  | 'dig'
  | 'reception'
  | 'reception_error';

export interface VolleyballActionMeta {
  key: VolleyballAction;
  label: string;
  field: keyof Pick<
    VolleyballStat,
    | 'spikes' | 'spike_errors'
    | 'blocks' | 'block_errors'
    | 'serve_aces' | 'serve_errors'
    | 'reception_successes' | 'reception_errors'
    | 'set_assists' | 'digs'
  >;
  /** Whether this action also bumps the team total points. */
  scores: boolean;
  category: 'primary' | 'secondary';
  tone: 'score' | 'miss' | 'positive' | 'negative';
}

export const VOLLEYBALL_ACTIONS: VolleyballActionMeta[] = [
  { key: 'spike',           label: '扣球得分',   field: 'spikes',              scores: true,  category: 'primary',   tone: 'score' },
  { key: 'block',           label: '攔網得分',   field: 'blocks',              scores: true,  category: 'primary',   tone: 'score' },
  { key: 'serve_ace',       label: '發球得分',   field: 'serve_aces',          scores: true,  category: 'primary',   tone: 'score' },
  { key: 'spike_error',     label: '扣球失誤',   field: 'spike_errors',        scores: false, category: 'primary',   tone: 'miss' },
  { key: 'block_error',     label: '攔網失誤',   field: 'block_errors',        scores: false, category: 'primary',   tone: 'miss' },
  { key: 'serve_error',     label: '發球失誤',   field: 'serve_errors',        scores: false, category: 'primary',   tone: 'miss' },
  { key: 'set_assist',      label: '舉球助攻',   field: 'set_assists',         scores: false, category: 'primary',   tone: 'positive' },
  { key: 'dig',             label: '救球',       field: 'digs',                scores: false, category: 'primary',   tone: 'positive' },
  { key: 'reception',       label: '接發球',     field: 'reception_successes', scores: false, category: 'primary',   tone: 'positive' },
  { key: 'reception_error', label: '接發球失誤', field: 'reception_errors',    scores: false, category: 'secondary', tone: 'negative' },
];

export function getVolleyballActionMeta(action: VolleyballAction): VolleyballActionMeta {
  return VOLLEYBALL_ACTIONS.find((a) => a.key === action)!;
}

export interface VolleyballLineupPlayer {
  user_id?: string | null;
  display_name?: string | null;
  jersey_number?: string | null;
  position?: string | null;
  team_label: string;
}

export async function createVolleyballLineup(
  eventId: string,
  players: VolleyballLineupPlayer[],
): Promise<VolleyballStat[]> {
  if (players.length === 0) return [];
  const rows = players.map((p) => ({
    event_id: eventId,
    user_id: p.user_id || null,
    display_name: p.display_name || null,
    jersey_number: p.jersey_number || null,
    position: p.position || null,
    team_label: p.team_label,
  }));
  const { data, error } = await supabase.from('volleyball_stats').insert(rows).select();
  if (error) throw error;
  return (data || []) as VolleyballStat[];
}

export async function recordVolleyballAction(
  stat: VolleyballStat,
  action: VolleyballAction,
): Promise<VolleyballStat> {
  const meta = getVolleyballActionMeta(action);
  const updates: Record<string, any> = {
    [meta.field]: (stat[meta.field] as number) + 1,
    updated_at: new Date().toISOString(),
  };
  if (meta.scores) updates.points_total = (stat.points_total || 0) + 1;
  const { data, error } = await supabase
    .from('volleyball_stats')
    .update(updates)
    .eq('id', stat.id)
    .select()
    .single();
  if (error) throw error;
  return data as VolleyballStat;
}

export async function undoVolleyballAction(
  stat: VolleyballStat,
  action: VolleyballAction,
): Promise<VolleyballStat> {
  const meta = getVolleyballActionMeta(action);
  const updates: Record<string, any> = {
    [meta.field]: Math.max(0, (stat[meta.field] as number) - 1),
    updated_at: new Date().toISOString(),
  };
  if (meta.scores) updates.points_total = Math.max(0, (stat.points_total || 0) - 1);
  const { data, error } = await supabase
    .from('volleyball_stats')
    .update(updates)
    .eq('id', stat.id)
    .select()
    .single();
  if (error) throw error;
  return data as VolleyballStat;
}
