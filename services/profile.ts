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
