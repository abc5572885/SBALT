import { supabase } from '@/lib/supabase';
import { VolleyballStat } from './sportStats';

export type VolleyballAction =
  | 'spike'
  | 'block'
  | 'serve_ace'
  | 'set_assist'
  | 'dig'
  | 'error';

export interface VolleyballActionMeta {
  key: VolleyballAction;
  label: string;
  field: keyof Pick<VolleyballStat, 'spikes' | 'blocks' | 'serve_aces' | 'set_assists' | 'digs' | 'errors'>;
  /** Whether this action also bumps the team total points (spike / block / serve_ace are scoring plays). */
  scores: boolean;
  category: 'primary' | 'secondary';
  tone: 'score' | 'positive' | 'negative';
}

export const VOLLEYBALL_ACTIONS: VolleyballActionMeta[] = [
  { key: 'spike',       label: '扣球得分', field: 'spikes',      scores: true,  category: 'primary',   tone: 'score' },
  { key: 'block',       label: '攔網得分', field: 'blocks',      scores: true,  category: 'primary',   tone: 'score' },
  { key: 'serve_ace',   label: '發球得分', field: 'serve_aces',  scores: true,  category: 'primary',   tone: 'score' },
  { key: 'set_assist',  label: '舉球助攻', field: 'set_assists', scores: false, category: 'primary',   tone: 'positive' },
  { key: 'dig',         label: '救球',     field: 'digs',        scores: false, category: 'primary',   tone: 'positive' },
  { key: 'error',       label: '失誤',     field: 'errors',      scores: false, category: 'secondary', tone: 'negative' },
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
