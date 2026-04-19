import { supabase } from '@/lib/supabase';

export type NotificationType =
  | 'team_invite'          // 被邀請加入隊伍
  | 'team_invite_accepted' // 你邀請的人接受了
  | 'team_invite_declined' // 你邀請的人拒絕了
  | 'team_member_left'     // 隊員離開
  | 'booking_created'      // 場地方收到新預約
  | 'booking_confirmed'    // 預約被確認
  | 'booking_rejected'     // 預約被拒絕
  | 'tournament_registered'// 主辦方收到賽事報名
  | 'event_comment'        // 活動有新留言
  | 'event_starting_soon'  // 活動即將開始
  | 'official_approved'    // 官方帳號申請通過
  | 'achievement_unlocked'; // 成就解鎖

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, any>;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
}

export async function createNotification(params: {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, any>;
  actor_id?: string | null;
}) {
  const { error } = await supabase.from('notifications').insert({
    user_id: params.user_id,
    type: params.type,
    title: params.title,
    body: params.body || null,
    data: params.data || {},
    actor_id: params.actor_id ?? null,
  });
  if (error) {
    // Don't block UI on notification failure
    console.warn('Failed to create notification:', error.message);
  }
}

export async function getMyNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as AppNotification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return count || 0;
}

export async function markAsRead(id: string) {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
}

export async function markAllAsRead(userId: string) {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}

export async function deleteNotification(id: string) {
  await supabase.from('notifications').delete().eq('id', id);
}

/** Route this notification should navigate to when tapped */
export function getNotificationRoute(n: AppNotification): { pathname: string; params?: any } | null {
  const data = n.data || {};
  switch (n.type) {
    case 'team_invite':
    case 'team_invite_accepted':
    case 'team_invite_declined':
    case 'team_member_left':
      return data.team_id ? { pathname: '/tournament/team/[id]', params: { id: data.team_id } } : null;
    case 'booking_created':
    case 'booking_confirmed':
    case 'booking_rejected':
      if (data.is_operator && data.venue_id) {
        return { pathname: '/venue/bookings/[id]', params: { id: data.venue_id } };
      }
      return { pathname: '/my-bookings' };
    case 'tournament_registered':
      return data.tournament_id ? { pathname: '/tournament/[id]', params: { id: data.tournament_id } } : null;
    case 'event_comment':
    case 'event_starting_soon':
      return data.event_id ? { pathname: '/event/detail', params: { eventId: data.event_id } } : null;
    case 'official_approved':
      return { pathname: '/(tabs)/profile' };
    case 'achievement_unlocked':
      return { pathname: '/event/achievements' };
    default:
      return null;
  }
}
