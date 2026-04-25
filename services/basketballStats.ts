import { supabase } from '@/lib/supabase';
import { BasketballStat } from './sportStats';

// Action types & metadata
export type BasketballAction =
  | 'point_1'
  | 'point_2'
  | 'point_3'
  | 'rebound'
  | 'assist'
  | 'steal'
  | 'block'
  | 'turnover'
  | 'foul';

export interface ActionMeta {
  key: BasketballAction;
  label: string;
  field: keyof Pick<BasketballStat, 'points_1pt' | 'points_2pt' | 'points_3pt' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'fouls'>;
  pointsDelta: number;  // 加到 event_scores 隊伍總分的點數
  category: 'primary' | 'secondary';
}

export const BASKETBALL_ACTIONS: ActionMeta[] = [
  { key: 'point_1', label: '得分 +1', field: 'points_1pt', pointsDelta: 1, category: 'primary' },
  { key: 'point_2', label: '得分 +2', field: 'points_2pt', pointsDelta: 2, category: 'primary' },
  { key: 'point_3', label: '得分 +3', field: 'points_3pt', pointsDelta: 3, category: 'primary' },
  { key: 'rebound', label: '籃板',    field: 'rebounds',  pointsDelta: 0, category: 'primary' },
  { key: 'assist',  label: '助攻',    field: 'assists',   pointsDelta: 0, category: 'primary' },
  { key: 'steal',   label: '抄截',    field: 'steals',    pointsDelta: 0, category: 'secondary' },
  { key: 'block',   label: '阻攻',    field: 'blocks',    pointsDelta: 0, category: 'secondary' },
  { key: 'turnover',label: '失誤',    field: 'turnovers', pointsDelta: 0, category: 'secondary' },
  { key: 'foul',    label: '犯規',    field: 'fouls',     pointsDelta: 0, category: 'secondary' },
];

export function getActionMeta(action: BasketballAction): ActionMeta {
  return BASKETBALL_ACTIONS.find((a) => a.key === action)!;
}

// ==================================================================
// Lineup management
// ==================================================================

export interface LineupPlayer {
  user_id?: string | null;
  display_name?: string | null;
  jersey_number?: string | null;
  team_label: string;
}

export async function createLineup(eventId: string, players: LineupPlayer[]): Promise<BasketballStat[]> {
  if (players.length === 0) return [];
  const rows = players.map((p) => ({
    event_id: eventId,
    user_id: p.user_id || null,
    display_name: p.display_name || null,
    jersey_number: p.jersey_number || null,
    team_label: p.team_label,
  }));
  const { data, error } = await supabase
    .from('basketball_stats')
    .insert(rows)
    .select();
  if (error) throw error;
  return (data || []) as BasketballStat[];
}

export async function addPlayerToLineup(eventId: string, player: LineupPlayer): Promise<BasketballStat> {
  const { data, error } = await supabase
    .from('basketball_stats')
    .insert({
      event_id: eventId,
      user_id: player.user_id || null,
      display_name: player.display_name || null,
      jersey_number: player.jersey_number || null,
      team_label: player.team_label,
    })
    .select()
    .single();
  if (error) throw error;
  return data as BasketballStat;
}

export async function removeFromLineup(statId: string) {
  const { error } = await supabase.from('basketball_stats').delete().eq('id', statId);
  if (error) throw error;
}

// ==================================================================
// Action recording (read-modify-write — single recorder assumption)
// ==================================================================

export async function recordAction(stat: BasketballStat, action: BasketballAction): Promise<BasketballStat> {
  const meta = getActionMeta(action);
  const newValue = (stat[meta.field] as number) + 1;
  const { data, error } = await supabase
    .from('basketball_stats')
    .update({ [meta.field]: newValue, updated_at: new Date().toISOString() })
    .eq('id', stat.id)
    .select()
    .single();
  if (error) throw error;
  return data as BasketballStat;
}

export async function undoAction(stat: BasketballStat, action: BasketballAction): Promise<BasketballStat> {
  const meta = getActionMeta(action);
  const newValue = Math.max(0, (stat[meta.field] as number) - 1);
  const { data, error } = await supabase
    .from('basketball_stats')
    .update({ [meta.field]: newValue, updated_at: new Date().toISOString() })
    .eq('id', stat.id)
    .select()
    .single();
  if (error) throw error;
  return data as BasketballStat;
}
