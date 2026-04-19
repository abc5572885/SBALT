import { supabase } from '@/lib/supabase';
import { checkAndUnlockAchievements } from './achievements';

export interface PlayerStat {
  id: string;
  event_id: string;
  user_id: string;
  sport_type: string;
  team_label: string | null;
  stat_type: string;
  points: number;
  created_at: string;
}

export async function recordPlayerScore(params: {
  event_id: string;
  user_id: string;
  sport_type: string;
  team_label?: string | null;
  points: number;
}): Promise<PlayerStat> {
  const { data, error } = await supabase
    .from('player_stats')
    .insert({
      event_id: params.event_id,
      user_id: params.user_id,
      sport_type: params.sport_type,
      team_label: params.team_label ?? null,
      stat_type: 'point',
      points: params.points,
    })
    .select()
    .single();
  if (error) throw error;
  // Trigger achievement check (fire and forget)
  checkAndUnlockAchievements(params.user_id).catch(() => {});
  return data as PlayerStat;
}

export async function removeLastPlayerScore(eventId: string, userId: string) {
  const { data } = await supabase
    .from('player_stats')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) {
    await supabase.from('player_stats').delete().eq('id', data.id);
  }
}

export async function getEventPlayerStats(eventId: string): Promise<PlayerStat[]> {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as PlayerStat[];
}

export interface PlayerEventSummary {
  user_id: string;
  points: number;
  team_label: string | null;
}

export async function getEventPlayerSummaries(eventId: string): Promise<PlayerEventSummary[]> {
  const stats = await getEventPlayerStats(eventId);
  const map = new Map<string, PlayerEventSummary>();
  for (const s of stats) {
    const existing = map.get(s.user_id);
    if (existing) {
      existing.points += s.points;
    } else {
      map.set(s.user_id, { user_id: s.user_id, points: s.points, team_label: s.team_label });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.points - a.points);
}

export interface CareerStats {
  totalEvents: number;
  totalPoints: number;
  averagePoints: number;
  bySport: Record<string, { events: number; points: number; average: number }>;
  recentEvents: Array<{ event_id: string; points: number; sport_type: string; last_date: string }>;
}

export async function getUserCareerStats(userId: string): Promise<CareerStats> {
  const { data, error } = await supabase
    .from('player_stats')
    .select('event_id, sport_type, points, created_at')
    .eq('user_id', userId);
  if (error) throw error;
  const rows = data || [];

  const perEvent = new Map<string, { points: number; sport_type: string; last_date: string }>();
  for (const row of rows) {
    const e = perEvent.get(row.event_id) || { points: 0, sport_type: row.sport_type, last_date: row.created_at };
    e.points += row.points;
    if (row.created_at > e.last_date) e.last_date = row.created_at;
    perEvent.set(row.event_id, e);
  }

  const totalEvents = perEvent.size;
  const totalPoints = Array.from(perEvent.values()).reduce((sum, e) => sum + e.points, 0);

  const bySport: Record<string, { events: number; points: number; average: number }> = {};
  for (const [, e] of perEvent) {
    const entry = bySport[e.sport_type] || { events: 0, points: 0, average: 0 };
    entry.events += 1;
    entry.points += e.points;
    bySport[e.sport_type] = entry;
  }
  for (const k of Object.keys(bySport)) {
    bySport[k].average = bySport[k].events > 0 ? bySport[k].points / bySport[k].events : 0;
  }

  const recentEvents = Array.from(perEvent.entries())
    .map(([event_id, v]) => ({ event_id, points: v.points, sport_type: v.sport_type, last_date: v.last_date }))
    .sort((a, b) => b.last_date.localeCompare(a.last_date))
    .slice(0, 10);

  return {
    totalEvents,
    totalPoints,
    averagePoints: totalEvents > 0 ? totalPoints / totalEvents : 0,
    bySport,
    recentEvents,
  };
}
