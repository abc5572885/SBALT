import { supabase } from '@/lib/supabase';

// ==================================================================
// Basketball
// ==================================================================
export interface BasketballStat {
  id: string;
  event_id: string;
  user_id: string | null;
  team_label: string;
  display_name: string | null;
  jersey_number: string | null;
  points_1pt: number;
  points_2pt: number;
  points_3pt: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export function basketballTotalPoints(s: Pick<BasketballStat, 'points_1pt' | 'points_2pt' | 'points_3pt'>): number {
  return s.points_1pt * 1 + s.points_2pt * 2 + s.points_3pt * 3;
}

export async function getEventBasketballStats(eventId: string): Promise<BasketballStat[]> {
  const { data, error } = await supabase
    .from('basketball_stats')
    .select('*')
    .eq('event_id', eventId);
  if (error) throw error;
  return (data || []) as BasketballStat[];
}

export async function getUserBasketballStats(userId: string): Promise<BasketballStat[]> {
  const { data, error } = await supabase
    .from('basketball_stats')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []) as BasketballStat[];
}

// ==================================================================
// Volleyball
// ==================================================================
export interface VolleyballStat {
  id: string;
  event_id: string;
  user_id: string | null;
  team_label: string;
  display_name: string | null;
  jersey_number: string | null;
  position: string | null;
  spikes: number;
  blocks: number;
  serve_aces: number;
  set_assists: number;
  digs: number;
  errors: number;
  points_total: number;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getEventVolleyballStats(eventId: string): Promise<VolleyballStat[]> {
  const { data, error } = await supabase
    .from('volleyball_stats')
    .select('*')
    .eq('event_id', eventId);
  if (error) throw error;
  return (data || []) as VolleyballStat[];
}

export async function getUserVolleyballStats(userId: string): Promise<VolleyballStat[]> {
  const { data, error } = await supabase
    .from('volleyball_stats')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []) as VolleyballStat[];
}

// ==================================================================
// Badminton
// ==================================================================
export interface BadmintonStat {
  id: string;
  event_id: string;
  user_id: string | null;
  team_label: string;
  display_name: string | null;
  jersey_number: string | null;
  match_format: 'singles' | 'doubles';
  partner_id: string | null;
  sets_won: number;
  sets_lost: number;
  smashes: number;
  drops: number;
  net_kills: number;
  errors: number;
  points_won: number;
  points_lost: number;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getEventBadmintonStats(eventId: string): Promise<BadmintonStat[]> {
  const { data, error } = await supabase
    .from('badminton_stats')
    .select('*')
    .eq('event_id', eventId);
  if (error) throw error;
  return (data || []) as BadmintonStat[];
}

export async function getUserBadmintonStats(userId: string): Promise<BadmintonStat[]> {
  const { data, error } = await supabase
    .from('badminton_stats')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []) as BadmintonStat[];
}

// ==================================================================
// Aggregated career stats (取代舊 getUserCareerStats)
// ==================================================================
export interface CareerStats {
  totalEvents: number;
  totalPoints: number;
  averagePoints: number;
  bySport: Record<string, { events: number; points: number; average: number }>;
  recentEvents: Array<{ event_id: string; points: number; sport_type: string; last_date: string }>;
}

export async function getUserCareerStats(userId: string): Promise<CareerStats> {
  const [bball, vball, bmin] = await Promise.all([
    getUserBasketballStats(userId),
    getUserVolleyballStats(userId),
    getUserBadmintonStats(userId),
  ]);

  type EventEntry = { points: number; sport_type: string; last_date: string };
  const perEvent = new Map<string, EventEntry>();

  for (const s of bball) {
    const pts = basketballTotalPoints(s);
    const e = perEvent.get(s.event_id) || { points: 0, sport_type: 'basketball', last_date: s.created_at };
    e.points += pts;
    if (s.created_at > e.last_date) e.last_date = s.created_at;
    perEvent.set(s.event_id, e);
  }
  for (const s of vball) {
    const pts = s.points_total;
    const e = perEvent.get(s.event_id) || { points: 0, sport_type: 'volleyball', last_date: s.created_at };
    e.points += pts;
    if (s.created_at > e.last_date) e.last_date = s.created_at;
    perEvent.set(s.event_id, e);
  }
  for (const s of bmin) {
    const pts = s.points_won;
    const e = perEvent.get(s.event_id) || { points: 0, sport_type: 'badminton', last_date: s.created_at };
    e.points += pts;
    if (s.created_at > e.last_date) e.last_date = s.created_at;
    perEvent.set(s.event_id, e);
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

/** 計算 user 的全部得分（成就用） */
export async function getUserTotalPoints(userId: string): Promise<number> {
  const stats = await getUserCareerStats(userId);
  return stats.totalPoints;
}

// ==================================================================
// Basketball career stats (詳細版，給 profile 頁顯示)
// ==================================================================
export interface BasketballCareerStats {
  games: number;
  totalPoints: number;
  totalRebounds: number;
  totalAssists: number;
  totalSteals: number;
  totalBlocks: number;
  totalTurnovers: number;
  totalFouls: number;
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  // 場上時間 / 命中率 暫不算（schema 未追蹤投籃次數）
}

export async function getBasketballCareerStats(userId: string): Promise<BasketballCareerStats> {
  const stats = await getUserBasketballStats(userId);

  // 一場可能多筆 row（例如 2 隊都記）— 但我們設計是「一場一個球員一筆」
  // 用 event_id 去重以防萬一
  const perEvent = new Map<string, BasketballStat>();
  for (const s of stats) {
    const existing = perEvent.get(s.event_id);
    if (!existing) perEvent.set(s.event_id, s);
    // else 累加（理論上不該發生）
  }

  const list = Array.from(perEvent.values());
  const games = list.length;
  if (games === 0) {
    return {
      games: 0,
      totalPoints: 0, totalRebounds: 0, totalAssists: 0, totalSteals: 0, totalBlocks: 0, totalTurnovers: 0, totalFouls: 0,
      avgPoints: 0, avgRebounds: 0, avgAssists: 0, avgSteals: 0, avgBlocks: 0,
    };
  }

  const totalPoints = list.reduce((sum, s) => sum + basketballTotalPoints(s), 0);
  const totalRebounds = list.reduce((sum, s) => sum + s.rebounds, 0);
  const totalAssists = list.reduce((sum, s) => sum + s.assists, 0);
  const totalSteals = list.reduce((sum, s) => sum + s.steals, 0);
  const totalBlocks = list.reduce((sum, s) => sum + s.blocks, 0);
  const totalTurnovers = list.reduce((sum, s) => sum + s.turnovers, 0);
  const totalFouls = list.reduce((sum, s) => sum + s.fouls, 0);

  return {
    games,
    totalPoints, totalRebounds, totalAssists, totalSteals, totalBlocks, totalTurnovers, totalFouls,
    avgPoints: totalPoints / games,
    avgRebounds: totalRebounds / games,
    avgAssists: totalAssists / games,
    avgSteals: totalSteals / games,
    avgBlocks: totalBlocks / games,
  };
}
