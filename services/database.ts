/**
 * Database Service
 * Provides functions to interact with Supabase database
 * Handles user-generated content: comments, likes, events, registrations
 */

import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { checkAndUnlockAchievements } from './achievements';

type Tables = Database['public']['Tables'];
type Comment = Tables['comments']['Insert'];
type Like = Tables['likes']['Insert'];
type Event = Tables['events']['Insert'];
type Registration = Tables['registrations']['Insert'];
type EventScoreInsert = Tables['event_scores']['Insert'];

// ============================================================================
// COMMENTS
// ============================================================================

export async function createComment(data: Comment) {
  const { data: comment, error } = await supabase.from('comments').insert(data).select().single();
  if (error) throw error;
  return comment;
}

export async function getComments(entityType: string, entityId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateComment(id: string, content: string) {
  const { data, error } = await supabase
    .from('comments')
    .update({ content })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// LIKES
// ============================================================================

export async function createLike(data: Like) {
  const { data: like, error } = await supabase.from('likes').insert(data).select().single();
  if (error) throw error;
  return like;
}

export async function deleteLike(userId: string, entityType: string, entityId: string) {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
  if (error) throw error;
}

export async function getLikes(entityType: string, entityId: string) {
  const { data, error } = await supabase
    .from('likes')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
  if (error) throw error;
  return data || [];
}

export async function getLikeCount(entityType: string, entityId: string): Promise<number> {
  const { count, error } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
  if (error) throw error;
  return count || 0;
}

export async function hasUserLiked(
  userId: string,
  entityType: 'game' | 'team' | 'player' | 'news' | 'event' | 'comment',
  entityId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();
  // If no row found, user hasn't liked
  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

export async function toggleLike(
  userId: string,
  entityType: 'game' | 'team' | 'player' | 'news' | 'event' | 'comment',
  entityId: string
): Promise<{ liked: boolean; count: number }> {
  const hasLiked = await hasUserLiked(userId, entityType, entityId);
  
  if (hasLiked) {
    await deleteLike(userId, entityType, entityId);
  } else {
    await createLike({ user_id: userId, entity_type: entityType, entity_id: entityId });
  }
  
  const count = await getLikeCount(entityType, entityId);
  return { liked: !hasLiked, count };
}

// ============================================================================
// EVENTS
// ============================================================================

export async function createEvent(
  data: Event & { recurrence_rule?: string | null; recurrence_end_date?: string | null; recurrence_count?: number | null }
) {
  const { recurrence_rule, recurrence_end_date, recurrence_count, ...eventData } = data;

  // If no recurrence, create single event
  if (!recurrence_rule) {
    const { data: event, error } = await supabase.from('events').insert(eventData).select().single();
    if (error) throw error;
    if (eventData.organizer_id) {
      checkAndUnlockAchievements(eventData.organizer_id).catch(() => {});
    }
    return event;
  }

  // Parse RRULE to extract count if not provided
  // This ensures data consistency: RRULE is the single source of truth
  let finalRecurrenceCount = recurrence_count;
  if (!finalRecurrenceCount && !recurrence_end_date) {
    const { parseRRULE } = await import('@/utils/rrule');
    const startDate = new Date(eventData.scheduled_at);
    const parsed = parseRRULE(recurrence_rule, startDate);
    if (parsed?.count) {
      finalRecurrenceCount = parsed.count;
    }
  }

  // For recurring events, create parent event first
  const parentEventData = {
    ...eventData,
    recurrence_rule,
    recurrence_end_date: recurrence_end_date || null,
    recurrence_count: finalRecurrenceCount || null,
    parent_event_id: null,
    is_recurring_instance: false,
  };

  const { data: parentEvent, error: parentError } = await supabase
    .from('events')
    .insert(parentEventData)
    .select()
    .single();

  if (parentError) throw parentError;

  // Generate recurring instances
  const { generateOccurrences } = await import('@/utils/rrule');
  const startDate = new Date(eventData.scheduled_at);
  const endDate = recurrence_end_date ? new Date(recurrence_end_date) : undefined;

  // Limit to 100 instances to prevent performance issues
  const occurrences = generateOccurrences(recurrence_rule, startDate, endDate, 100);

  if (occurrences.length === 0) {
    throw new Error('無法生成任何活動日期，請檢查重複規則設定');
  }

  // Create event instances
  const instances = occurrences.map((occurrence) => ({
    ...eventData,
    scheduled_at: occurrence.toISOString(),
    parent_event_id: parentEvent.id,
    is_recurring_instance: true,
    recurrence_rule: null, // Instances don't need the rule
    recurrence_end_date: null,
  }));

  const { data: createdInstances, error: instancesError } = await supabase
    .from('events')
    .insert(instances)
    .select();

  if (instancesError) throw instancesError;

  console.log(`✅ 已建立 ${createdInstances.length + 1} 個活動（1 個母活動 + ${createdInstances.length} 個實例）`);

  return parentEvent;
}

export async function getEvents(filters?: { status?: string; organizerId?: string; excludeInstances?: boolean }) {
  let query = supabase.from('events').select('*').order('scheduled_at', { ascending: true });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.organizerId) query = query.eq('organizer_id', filters.organizerId);
  // Exclude recurring instances (only show parent events)
  // This is useful for "My Events" page where we want to show the main event, not all instances
  if (filters?.excludeInstances) {
    query = query.or('is_recurring_instance.is.null,is_recurring_instance.eq.false');
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getEventById(id: string) {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id: string, data: Partial<Event>) {
  const { data: event, error } = await supabase
    .from('events')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return event;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// REGISTRATIONS
// ============================================================================

export async function createRegistration(data: Registration) {
  const { data: registration, error } = await supabase
    .from('registrations')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  checkAndUnlockAchievements(data.user_id).catch(() => {});
  return registration;
}

export async function getRegistrations(eventId: string) {
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getRegistrationCounts(eventIds: string[]): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};
  const { data, error } = await supabase
    .from('registrations')
    .select('event_id')
    .in('event_id', eventIds)
    .eq('status', 'registered');
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.event_id] = (counts[row.event_id] || 0) + 1;
  }
  return counts;
}

export async function getRegistrationCount(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'registered');
  if (error) throw error;
  return count || 0;
}

export async function hasUserRegistered(userId: string, eventId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('registrations')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('status', 'registered')
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: 'registered' | 'cancelled'
) {
  const { data, error } = await supabase
    .from('registrations')
    .update({ status })
    .eq('id', registrationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserStats(userId: string, sportType?: string) {
  let organizedQuery = supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('organizer_id', userId)
    .or('is_recurring_instance.is.null,is_recurring_instance.eq.false');

  if (sportType && sportType !== 'all') {
    organizedQuery = organizedQuery.eq('sport_type', sportType);
  }

  const [organized, registered] = await Promise.all([
    organizedQuery,
    (async () => {
      // For joined count, need to join with events to filter by sport
      if (sportType && sportType !== 'all') {
        const { data: regs } = await supabase
          .from('registrations')
          .select('event_id')
          .eq('user_id', userId)
          .eq('status', 'registered');

        if (!regs || regs.length === 0) return { count: 0 };

        const { count } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .in('id', regs.map((r) => r.event_id))
          .eq('sport_type', sportType);

        return { count };
      }

      return supabase
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'registered');
    })(),
  ]);

  return {
    organized: organized.count || 0,
    joined: registered.count || 0,
  };
}

export async function getMyRegisteredEvents(userId: string) {
  const { data: registrations, error: regError } = await supabase
    .from('registrations')
    .select('event_id')
    .eq('user_id', userId)
    .eq('status', 'registered');
  if (regError) throw regError;

  if (!registrations || registrations.length === 0) return [];

  const eventIds = registrations.map((r) => r.event_id);
  const { data: events, error: evtError } = await supabase
    .from('events')
    .select('*')
    .in('id', eventIds)
    .order('scheduled_at', { ascending: true });
  if (evtError) throw evtError;
  return events || [];
}

export async function autoExpireEvents() {
  const now = new Date().toISOString();
  await supabase
    .from('events')
    .update({ status: 'finished' })
    .eq('status', 'open')
    .lt('scheduled_at', now);
}

export async function getOpenEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'open')
    .or('is_recurring_instance.is.null,is_recurring_instance.eq.false')
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createWaitlistEntry(data: Registration) {
  const { data: entry, error } = await supabase
    .from('registrations')
    .insert({ ...data, status: 'waitlisted' as any })
    .select()
    .single();
  if (error) throw error;
  return entry;
}

export async function getWaitlistPosition(userId: string, eventId: string): Promise<number> {
  const { data, error } = await supabase
    .from('registrations')
    .select('id, created_at')
    .eq('event_id', eventId)
    .eq('status', 'waitlisted')
    .order('created_at', { ascending: true });
  if (error) throw error;
  const index = (data || []).findIndex((r) => r.id === userId);
  return index >= 0 ? index + 1 : 0;
}

export async function promoteFirstWaitlisted(eventId: string): Promise<string | null> {
  // Find first waitlisted person
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'waitlisted')
    .order('created_at', { ascending: true })
    .limit(1);
  if (error || !data || data.length === 0) return null;

  // Promote to registered
  const { error: updateError } = await supabase
    .from('registrations')
    .update({ status: 'registered' })
    .eq('id', data[0].id);
  if (updateError) return null;

  return data[0].user_id;
}

export async function cancelRegistration(userId: string, eventId: string) {
  const { error } = await supabase
    .from('registrations')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .in('status', ['registered', 'waitlisted']);
  if (error) throw error;

  // Auto-promote first waitlisted person and return their user_id
  const promotedUserId = await promoteFirstWaitlisted(eventId);
  return { promotedUserId };
}

export async function checkInRegistration(userId: string, eventId: string) {
  const { data, error } = await supabase
    .from('registrations')
    .update({ form_data: { checked_in: true, checked_in_at: new Date().toISOString() } })
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('status', 'registered')
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePaymentStatus(
  registrationId: string,
  paymentStatus: 'pending' | 'paid' | 'refunded'
) {
  const { data, error } = await supabase
    .from('registrations')
    .update({ payment_status: paymentStatus })
    .eq('id', registrationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// EVENT SCORES
// ============================================================================

export async function getEventScores(eventId: string) {
  const { data, error } = await supabase
    .from('event_scores')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveEventScores(eventId: string, scores: { label: string; score: number }[]) {
  // Delete existing scores for this event
  const { error: deleteError } = await supabase
    .from('event_scores')
    .delete()
    .eq('event_id', eventId);
  if (deleteError) throw deleteError;

  if (scores.length === 0) return [];

  // Insert new scores
  const inserts: EventScoreInsert[] = scores.map((s, i) => ({
    event_id: eventId,
    label: s.label,
    score: s.score,
    sort_order: i,
  }));

  const { data, error } = await supabase
    .from('event_scores')
    .insert(inserts)
    .select();
  if (error) throw error;
  return data || [];
}

