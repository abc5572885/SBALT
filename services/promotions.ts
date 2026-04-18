/**
 * Promotions Service
 * 官方帳號發布的推廣資訊：賽事、場地、品牌合作
 */

import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type PromotionInsert = Database['public']['Tables']['promotions']['Insert'];
type PromotionUpdate = Database['public']['Tables']['promotions']['Update'];
type PromotionType = 'event' | 'venue' | 'brand';

export async function getActivePromotions(type?: PromotionType) {
  let query = supabase
    .from('promotions')
    .select('*')
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getFeaturedPromotions() {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('status', 'active')
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data || [];
}

export async function getMyPromotions(userId: string) {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createPromotion(data: PromotionInsert) {
  const { data: promotion, error } = await supabase
    .from('promotions')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return promotion;
}

export async function updatePromotion(id: string, data: PromotionUpdate) {
  const { data: promotion, error } = await supabase
    .from('promotions')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return promotion;
}

export async function deletePromotion(id: string) {
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) throw error;
}
