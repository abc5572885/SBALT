import { supabase } from '@/lib/supabase';
import { BasketballStat } from './sportStats';

// Action types & metadata
export type BasketballAction =
  | 'point_1'
  | 'point_2'
  | 'point_3'
  | 'miss_1'
  | 'miss_2'
  | 'miss_3'
  | 'off_rebound'
  | 'def_rebound'
  | 'assist'
  | 'steal'
  | 'block'
  | 'turnover'
  | 'foul';

export interface ActionMeta {
  key: BasketballAction;
  label: string;
  field: keyof Pick<
    BasketballStat,
    | 'points_1pt' | 'points_2pt' | 'points_3pt'
    | 'misses_1pt' | 'misses_2pt' | 'misses_3pt'
    | 'offensive_rebounds' | 'defensive_rebounds'
    | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'fouls'
  >;
  pointsDelta: number;
  category: 'primary' | 'secondary';
  tone: 'score' | 'miss' | 'positive' | 'negative';
}

export const BASKETBALL_ACTIONS: ActionMeta[] = [
  { key: 'point_1',     label: '罰球進',     field: 'points_1pt',         pointsDelta: 1, category: 'primary',   tone: 'score' },
  { key: 'point_2',     label: '2 分進',     field: 'points_2pt',         pointsDelta: 2, category: 'primary',   tone: 'score' },
  { key: 'point_3',     label: '3 分進',     field: 'points_3pt',         pointsDelta: 3, category: 'primary',   tone: 'score' },
  { key: 'miss_1',      label: '罰球未進',   field: 'misses_1pt',         pointsDelta: 0, category: 'primary',   tone: 'miss' },
  { key: 'miss_2',      label: '2 分未進',   field: 'misses_2pt',         pointsDelta: 0, category: 'primary',   tone: 'miss' },
  { key: 'miss_3',      label: '3 分未進',   field: 'misses_3pt',         pointsDelta: 0, category: 'primary',   tone: 'miss' },
  { key: 'off_rebound', label: '進攻籃板',   field: 'offensive_rebounds', pointsDelta: 0, category: 'primary',   tone: 'positive' },
  { key: 'def_rebound', label: '防守籃板',   field: 'defensive_rebounds', pointsDelta: 0, category: 'primary',   tone: 'positive' },
  { key: 'assist',      label: '助攻',       field: 'assists',            pointsDelta: 0, category: 'primary',   tone: 'positive' },
  { key: 'steal',       label: '抄截',       field: 'steals',             pointsDelta: 0, category: 'primary',   tone: 'positive' },
  { key: 'block',       label: '阻攻',       field: 'blocks',             pointsDelta: 0, category: 'primary',   tone: 'positive' },
  { key: 'turnover',    label: '失誤',       field: 'turnovers',          pointsDelta: 0, category: 'secondary', tone: 'negative' },
  { key: 'foul',        label: '犯規',       field: 'fouls',              pointsDelta: 0, category: 'secondary', tone: 'negative' },
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
  is_starter?: boolean;
}

export async function createLineup(
  eventId: string,
  players: LineupPlayer[],
  matchId?: string,
): Promise<BasketballStat[]> {
  if (players.length === 0) return [];
  const rows = players.map((p) => ({
    event_id: eventId,
    match_id: matchId || null,
    user_id: p.user_id || null,
    display_name: p.display_name || null,
    jersey_number: p.jersey_number || null,
    team_label: p.team_label,
    is_starter: p.is_starter || false,
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
