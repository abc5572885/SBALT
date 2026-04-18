import { supabase } from '@/lib/supabase';

export type ReportReason = 'harassment' | 'inappropriate' | 'spam' | 'impersonation' | 'other';
export type ReportContentType = 'user' | 'event' | 'comment' | 'promotion';

export const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: 'harassment', label: '騷擾 / 霸凌' },
  { key: 'inappropriate', label: '不當內容' },
  { key: 'spam', label: '垃圾訊息 / 廣告' },
  { key: 'impersonation', label: '冒用身份' },
  { key: 'other', label: '其他' },
];

export async function createReport(params: {
  reporterId: string;
  reportedUserId?: string | null;
  contentType: ReportContentType;
  contentId?: string | null;
  reason: ReportReason;
  description?: string;
}) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: params.reporterId,
    reported_user_id: params.reportedUserId ?? null,
    content_type: params.contentType,
    content_id: params.contentId ?? null,
    reason: params.reason,
    description: params.description || null,
  });
  if (error) throw error;
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && error.code !== '23505') throw error; // ignore duplicate
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);
  return (data || []).map((r: { blocked_id: string }) => r.blocked_id);
}

export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const { data } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle();
  return !!data;
}

export async function getBlockedUsers(userId: string) {
  const { data } = await supabase
    .from('blocks')
    .select('blocked_id, created_at, profiles:blocked_id(id, display_name, username, avatar_url)')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}
