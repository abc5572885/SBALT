import { supabase } from '@/lib/supabase';

export type AccountType = 'regular' | 'verified' | 'official';
export type VerificationStatus = 'unverified' | 'phone_verified' | 'id_verified';

export interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  phone: string | null;
  account_type: AccountType;
  verification_status: VerificationStatus;
  official_title: string | null;
  bio: string | null;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .single();
  return !!data;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getProfilesByIds(userIds: string[]): Promise<Record<string, Profile>> {
  if (userIds.length === 0) return {};
  const unique = [...new Set(userIds)];
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .in('id', unique);
  const map: Record<string, Profile> = {};
  (data || []).forEach((p: any) => { map[p.id] = p; });
  return map;
}

export function getDisplayName(profile: Profile | undefined, userId: string, isMe: boolean): string {
  if (isMe) return '我';
  if (profile?.display_name) return profile.display_name;
  if (profile?.username) return `@${profile.username}`;
  return `用戶 ${userId.slice(0, 8)}`;
}

export function getBadgeInfo(accountType: AccountType): { label: string; color: string } | null {
  switch (accountType) {
    case 'verified':
      return { label: '已驗證', color: '#2563EB' };
    case 'official':
      return { label: '官方', color: '#F59E0B' };
    default:
      return null;
  }
}
