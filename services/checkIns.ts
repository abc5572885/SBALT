import { supabase } from '@/lib/supabase';
import { createNotification } from './appNotifications';

export interface CheckInPartner {
  user_id: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface CheckIn {
  id: string;
  user_id: string;
  sport_type: string;
  played_at: string;
  location: string | null;
  venue_id: string | null;
  stats: Record<string, any> | null;
  partners: CheckInPartner[] | null;
  notes: string | null;
  photo_url: string | null;
  event_id: string | null;
  created_at: string;
}

export async function createCheckIn(params: {
  user_id: string;
  sport_type: string;
  played_at: string;
  location?: string;
  venue_id?: string | null;
  stats?: Record<string, any>;
  partners?: CheckInPartner[];
  notes?: string;
  photo_url?: string;
  event_id?: string;
}): Promise<CheckIn> {
  const { data, error } = await supabase
    .from('check_ins')
    .insert({
      user_id: params.user_id,
      sport_type: params.sport_type,
      played_at: params.played_at,
      location: params.location || null,
      venue_id: params.venue_id || null,
      stats: params.stats || null,
      partners: params.partners || null,
      notes: params.notes || null,
      photo_url: params.photo_url || null,
      event_id: params.event_id || null,
    })
    .select()
    .single();
  if (error) throw error;

  // Notify tagged partners
  if (params.partners && params.partners.length > 0) {
    const { data: profile } = await supabase
      .from('profiles').select('display_name, username').eq('id', params.user_id).maybeSingle();
    const name = profile?.display_name || profile?.username || '一位用戶';
    for (const partner of params.partners) {
      if (partner.status === 'pending') {
        createNotification({
          user_id: partner.user_id,
          type: 'check_in_tagged',
          title: `${name} 將你標記在打卡紀錄`,
          body: '請確認是否接受標記',
          data: { check_in_id: data.id },
          actor_id: params.user_id,
        }).catch(() => {});
      } else if (partner.status === 'accepted') {
        createNotification({
          user_id: partner.user_id,
          type: 'check_in_tagged',
          title: `${name} 標記了你`,
          body: '在打卡紀錄中',
          data: { check_in_id: data.id },
          actor_id: params.user_id,
        }).catch(() => {});
      }
    }
  }

  return data as CheckIn;
}

export async function getMyCheckIns(userId: string, limit = 50): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as CheckIn[];
}

export async function getUserCheckIns(userId: string, limit = 20): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as CheckIn[];
}

export async function deleteCheckIn(id: string) {
  const { error } = await supabase.from('check_ins').delete().eq('id', id);
  if (error) throw error;
}

export async function getCheckInById(id: string): Promise<CheckIn | null> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return data as CheckIn | null;
}

/**
 * 被標記者更新自己的標記狀態（accepted / declined）
 * RLS 限制：只有 check-in 擁有者能 UPDATE，所以這個函式需要由「擁有者那邊」執行——
 * 或我們改 RLS 允許被標記者更新自己那一筆 partner status。
 * 為簡化，先讓擁有者那邊的 RLS 開放被標記者也能 UPDATE 自己出現在 partners 內的 row。
 */
export async function respondToTagging(checkInId: string, myUserId: string, status: 'accepted' | 'declined') {
  const ci = await getCheckInById(checkInId);
  if (!ci) throw new Error('找不到打卡紀錄');
  const partners = (ci.partners || []).map((p) =>
    p.user_id === myUserId ? { ...p, status } : p
  );
  const { error } = await supabase
    .from('check_ins')
    .update({ partners })
    .eq('id', checkInId);
  if (error) throw error;
}

// 各運動的打卡欄位定義
export interface CheckInField {
  key: string;
  label: string;
  required: boolean;
  category: 'main' | 'optional';
}

export const CHECK_IN_FIELDS: Record<string, CheckInField[]> = {
  basketball: [
    { key: 'games', label: '場數', required: true, category: 'main' },
    { key: 'points', label: '得分', required: false, category: 'main' },
    { key: 'threes', label: '三分球', required: false, category: 'optional' },
    { key: 'rebounds', label: '籃板', required: false, category: 'optional' },
    { key: 'assists', label: '助攻', required: false, category: 'optional' },
  ],
  volleyball: [
    { key: 'games', label: '場數', required: true, category: 'main' },
    { key: 'points', label: '得分', required: false, category: 'main' },
    { key: 'kills', label: '扣殺', required: false, category: 'optional' },
    { key: 'blocks', label: '攔網', required: false, category: 'optional' },
    { key: 'aces', label: '發球得分', required: false, category: 'optional' },
  ],
  badminton: [
    { key: 'games_won', label: '勝局', required: true, category: 'main' },
    { key: 'games_lost', label: '敗局', required: false, category: 'main' },
    { key: 'smashes', label: '殺球得分', required: false, category: 'optional' },
  ],
};

// 取目標用戶的 tagging_privacy
export async function getUserTaggingPrivacy(userId: string): Promise<'public' | 'approval_required'> {
  const { data } = await supabase
    .from('profiles')
    .select('tagging_privacy')
    .eq('id', userId)
    .maybeSingle();
  return (data?.tagging_privacy as any) || 'approval_required';
}
