import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type GroupInsert = Database['public']['Tables']['groups']['Insert'];
type GroupPostInsert = Database['public']['Tables']['group_posts']['Insert'];

// ============================================================================
// GROUPS
// ============================================================================

export async function createGroup(data: GroupInsert) {
  const { data: group, error } = await supabase
    .from('groups')
    .insert(data)
    .select()
    .single();
  if (error) throw error;

  // Auto-add creator as admin
  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: data.creator_id,
    role: 'admin',
  });

  return group;
}

export async function getMyGroups(userId: string) {
  const { data: memberships, error: memError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);
  if (memError) throw memError;

  if (!memberships || memberships.length === 0) return [];

  const groupIds = memberships.map((m) => m.group_id);
  const { data: groups, error } = await supabase
    .from('groups')
    .select('*')
    .in('id', groupIds)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return groups || [];
}

export async function getGroupById(groupId: string) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();
  if (error) throw error;
  return data;
}

export async function getGroupByInviteCode(code: string) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', code)
    .single();
  if (error) throw error;
  return data;
}

export async function updateGroup(groupId: string, data: { name?: string; description?: string | null; sport_type?: string | null }) {
  const { data: group, error } = await supabase
    .from('groups')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .select()
    .single();
  if (error) throw error;
  return group;
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

// ============================================================================
// MEMBERS
// ============================================================================

export async function getGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getMemberCount(groupId: string): Promise<number> {
  const { count, error } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId);
  if (error) throw error;
  return count || 0;
}

export async function joinGroup(groupId: string, userId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId, role: 'member' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function leaveGroup(groupId: string, userId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

// ============================================================================
// POSTS
// ============================================================================

export async function getGroupPosts(groupId: string) {
  const { data, error } = await supabase
    .from('group_posts')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createGroupPost(data: GroupPostInsert) {
  const { data: post, error } = await supabase
    .from('group_posts')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return post;
}

export async function deleteGroupPost(postId: string) {
  const { error } = await supabase.from('group_posts').delete().eq('id', postId);
  if (error) throw error;
}

// ============================================================================
// GROUP EVENTS
// ============================================================================

export async function getGroupEvents(groupId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('group_id', groupId)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data || [];
}
