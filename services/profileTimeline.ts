import { supabase } from '@/lib/supabase';
import {
  basketballTotalPoints,
  getUserBadmintonStats,
  getUserBasketballStats,
  getUserVolleyballStats,
} from './sportStats';
import { getMyCheckIns } from './checkIns';

export type TimelineKind = 'event' | 'check_in';

export interface TimelineItem {
  id: string;                 // unique key (e.g. `event:${eventId}` or `check_in:${id}`)
  kind: TimelineKind;
  date: string;               // ISO timestamp used for sorting
  sport: string;              // 'basketball' | 'volleyball' | 'badminton' | ...
  title: string;              // event title or check-in location
  summary: string;            // e.g. "22 分 6 板 4 助" or "5 場 18 分"
  routeId: string;            // event id or check-in id (for navigation)
}

interface EventMeta {
  id: string;
  title: string;
  scheduled_at: string;
  location: string | null;
  sport_type: string | null;
}

async function fetchEventsByIds(ids: string[]): Promise<Record<string, EventMeta>> {
  if (ids.length === 0) return {};
  const unique = [...new Set(ids)];
  const { data } = await supabase
    .from('events')
    .select('id, title, scheduled_at, location, sport_type')
    .in('id', unique);
  const map: Record<string, EventMeta> = {};
  (data || []).forEach((e: any) => { map[e.id] = e; });
  return map;
}

export async function getProfileTimeline(userId: string, limit = 10): Promise<TimelineItem[]> {
  const [bball, vball, bmin, checkIns] = await Promise.all([
    getUserBasketballStats(userId),
    getUserVolleyballStats(userId),
    getUserBadmintonStats(userId),
    getMyCheckIns(userId, 30),
  ]);

  const eventIds = [
    ...bball.map((s) => s.event_id),
    ...vball.map((s) => s.event_id),
    ...bmin.map((s) => s.event_id),
  ];
  const events = await fetchEventsByIds(eventIds);

  const items: TimelineItem[] = [];

  // Aggregate basketball by event (one player can have one row per event)
  for (const s of bball) {
    const evt = events[s.event_id];
    if (!evt) continue;
    const pts = basketballTotalPoints(s);
    items.push({
      id: `event:${s.event_id}:basketball`,
      kind: 'event',
      date: evt.scheduled_at,
      sport: 'basketball',
      title: evt.title,
      summary: `${pts} 分 · ${s.rebounds} 板 · ${s.assists} 助`,
      routeId: s.event_id,
    });
  }

  for (const s of vball) {
    const evt = events[s.event_id];
    if (!evt) continue;
    const parts: string[] = [];
    if (s.points_total) parts.push(`${s.points_total} 分`);
    if (s.spikes) parts.push(`${s.spikes} 扣`);
    if (s.blocks) parts.push(`${s.blocks} 攔`);
    items.push({
      id: `event:${s.event_id}:volleyball`,
      kind: 'event',
      date: evt.scheduled_at,
      sport: 'volleyball',
      title: evt.title,
      summary: parts.join(' · ') || '參與紀錄',
      routeId: s.event_id,
    });
  }

  for (const s of bmin) {
    const evt = events[s.event_id];
    if (!evt) continue;
    items.push({
      id: `event:${s.event_id}:badminton`,
      kind: 'event',
      date: evt.scheduled_at,
      sport: 'badminton',
      title: evt.title,
      summary: `${s.sets_won}-${s.sets_lost} 局 · ${s.points_won} 分`,
      routeId: s.event_id,
    });
  }

  for (const c of checkIns) {
    const stats = c.stats || {};
    const parts: string[] = [];
    if (stats.games) parts.push(`${stats.games} 場`);
    if (stats.points) parts.push(`${stats.points} 分`);
    if (stats.threes) parts.push(`${stats.threes} 三分`);
    if (stats.rebounds) parts.push(`${stats.rebounds} 板`);
    if (stats.assists) parts.push(`${stats.assists} 助`);
    if (stats.kills) parts.push(`${stats.kills} 扣`);
    if (stats.aces) parts.push(`${stats.aces} 發球得分`);
    if (stats.games_won !== undefined || stats.games_lost !== undefined) {
      parts.push(`勝 ${stats.games_won || 0} · 敗 ${stats.games_lost || 0}`);
    }
    items.push({
      id: `check_in:${c.id}`,
      kind: 'check_in',
      date: c.played_at,
      sport: c.sport_type,
      title: c.location || '個人打卡',
      summary: parts.join(' · ') || '無數據',
      routeId: c.id,
    });
  }

  return items
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
