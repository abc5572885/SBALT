/**
 * Buddies (球友網) — 推導用戶的球友關係。
 *
 * 資料源（按可信度權重）：
 * 1. 打卡互相 tag（accepted）— 主動關係，weight 2.0
 * 2. 同活動報名 — 共同出席，weight 1.0
 * 3. （未來）跑步揪團、賽事隊友
 *
 * 不算進球友：
 * - 拒絕 tag 的 partner
 * - 同群組成員（太鬆，路人都算）
 */

import { supabase } from '@/lib/supabase';
import { getProfilesByIds } from './profile';

export interface Buddy {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  /** Count of shared events / accepted check-in tags (weighted, rounded to int). */
  sharedCount: number;
  /** ISO date of most recent shared activity */
  lastSeen: string | null;
  sources: ('event' | 'checkin')[];
}

interface AggEntry {
  eventCount: number;
  partnerCount: number;
  lastSeen: string;
}

/**
 * Get this user's buddies — people they've shared events / check-ins with.
 * Sorted by weighted shared count desc.
 */
export async function getMyBuddies(userId: string, limit = 50): Promise<Buddy[]> {
  const agg = new Map<string, AggEntry>();

  const ensure = (uid: string): AggEntry => {
    let e = agg.get(uid);
    if (!e) {
      e = { eventCount: 0, partnerCount: 0, lastSeen: '' };
      agg.set(uid, e);
    }
    return e;
  };

  // 1. Find user's events (registrations they joined)
  const { data: myRegs } = await supabase
    .from('registrations')
    .select('event_id, created_at')
    .eq('user_id', userId)
    .eq('status', 'registered');

  const myEventIds = (myRegs || []).map((r) => r.event_id);

  if (myEventIds.length > 0) {
    // Other people in those events
    const { data: otherRegs } = await supabase
      .from('registrations')
      .select('user_id, event_id, created_at')
      .in('event_id', myEventIds)
      .eq('status', 'registered')
      .neq('user_id', userId);

    for (const r of otherRegs || []) {
      const e = ensure(r.user_id);
      e.eventCount++;
      if (r.created_at > e.lastSeen) e.lastSeen = r.created_at;
    }
  }

  // 2. Check-ins where user tagged others (accepted only)
  const { data: myCheckIns } = await supabase
    .from('check_ins')
    .select('partners, played_at')
    .eq('user_id', userId);

  for (const ci of myCheckIns || []) {
    const partners = (ci as any).partners;
    if (!Array.isArray(partners)) continue;
    for (const p of partners) {
      if (p.status !== 'accepted') continue;
      const e = ensure(p.user_id);
      e.partnerCount++;
      if (ci.played_at > e.lastSeen) e.lastSeen = ci.played_at;
    }
  }

  // 3. Check-ins where others tagged user (accepted)
  // Use Postgres @> jsonb containment to find rows
  const { data: taggedIn } = await supabase
    .from('check_ins')
    .select('user_id, partners, played_at')
    .neq('user_id', userId)
    .contains('partners', [{ user_id: userId, status: 'accepted' }]);

  for (const ci of taggedIn || []) {
    const e = ensure(ci.user_id);
    e.partnerCount++;
    if (ci.played_at > e.lastSeen) e.lastSeen = ci.played_at;
  }

  if (agg.size === 0) return [];

  // Fetch profiles
  const profiles = await getProfilesByIds([...agg.keys()]);

  const buddies: Buddy[] = [];
  for (const [uid, e] of agg.entries()) {
    const p = profiles[uid];
    if (!p) continue; // user may have deleted account
    const sharedCount = Math.round(e.eventCount + e.partnerCount * 2);
    if (sharedCount === 0) continue;
    const sources: Buddy['sources'] = [];
    if (e.eventCount > 0) sources.push('event');
    if (e.partnerCount > 0) sources.push('checkin');
    buddies.push({
      user_id: uid,
      display_name: p.display_name,
      username: p.username,
      avatar_url: p.avatar_url,
      sharedCount,
      lastSeen: e.lastSeen || null,
      sources,
    });
  }

  buddies.sort((a, b) => {
    if (b.sharedCount !== a.sharedCount) return b.sharedCount - a.sharedCount;
    // Tiebreak by recency
    return (b.lastSeen || '').localeCompare(a.lastSeen || '');
  });

  return buddies.slice(0, limit);
}

/**
 * Relation summary between two users — used in /user/[id] to show
 * "我跟你打過 X 場 · 最近 YY/MM/DD".
 *
 * Returns null if no shared activity (button/section should hide).
 */
export interface BuddyRelation {
  sharedCount: number;
  lastSeen: string | null;
  eventCount: number;
  partnerCount: number;
}

export async function getBuddyRelation(
  myId: string,
  otherId: string,
): Promise<BuddyRelation | null> {
  if (myId === otherId) return null;

  let eventCount = 0;
  let partnerCount = 0;
  let lastSeen = '';

  // Shared events
  const { data: myRegs } = await supabase
    .from('registrations')
    .select('event_id')
    .eq('user_id', myId)
    .eq('status', 'registered');

  const myEventIds = (myRegs || []).map((r) => r.event_id);
  if (myEventIds.length > 0) {
    const { data: shared } = await supabase
      .from('registrations')
      .select('event_id, created_at')
      .in('event_id', myEventIds)
      .eq('user_id', otherId)
      .eq('status', 'registered');
    for (const r of shared || []) {
      eventCount++;
      if (r.created_at > lastSeen) lastSeen = r.created_at;
    }
  }

  // Tags from me to other (accepted)
  const { data: myTagsToOther } = await supabase
    .from('check_ins')
    .select('played_at, partners')
    .eq('user_id', myId)
    .contains('partners', [{ user_id: otherId, status: 'accepted' }]);
  for (const ci of myTagsToOther || []) {
    partnerCount++;
    if (ci.played_at > lastSeen) lastSeen = ci.played_at;
  }

  // Tags from other to me (accepted)
  const { data: otherTagsToMe } = await supabase
    .from('check_ins')
    .select('played_at')
    .eq('user_id', otherId)
    .contains('partners', [{ user_id: myId, status: 'accepted' }]);
  for (const ci of otherTagsToMe || []) {
    partnerCount++;
    if (ci.played_at > lastSeen) lastSeen = ci.played_at;
  }

  const sharedCount = Math.round(eventCount + partnerCount * 2);
  if (sharedCount === 0) return null;

  return {
    sharedCount,
    lastSeen: lastSeen || null,
    eventCount,
    partnerCount,
  };
}

/**
 * Of this user's buddies, return those who have played at the given venue.
 * Used in venue detail page "你常打的球友也來這" section.
 */
export async function getBuddiesAtVenue(
  userId: string,
  venueId: string,
  venueName: string,
): Promise<Buddy[]> {
  const myBuddies = await getMyBuddies(userId, 200);
  if (myBuddies.length === 0) return [];

  // Find user_ids who have any registration at events at this venue
  // (events can match by venue_id or location string)
  const { data: linkedEvents } = await supabase
    .from('events')
    .select('id')
    .eq('venue_id', venueId);

  const { data: legacyEvents } = await supabase
    .from('events')
    .select('id')
    .is('venue_id', null)
    .ilike('location', `%${venueName}%`);

  const allEventIds = [
    ...(linkedEvents || []).map((e) => e.id),
    ...(legacyEvents || []).map((e) => e.id),
  ];

  if (allEventIds.length === 0) return [];

  const { data: regs } = await supabase
    .from('registrations')
    .select('user_id')
    .in('event_id', allEventIds)
    .eq('status', 'registered');

  const venueUserIds = new Set((regs || []).map((r) => r.user_id));

  return myBuddies.filter((b) => venueUserIds.has(b.user_id));
}
