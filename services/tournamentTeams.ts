import { supabase } from '@/lib/supabase';

export interface TournamentTeam {
  id: string;
  tournament_id: string;
  name: string;
  captain_id: string;
  status: 'forming' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface TournamentTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'captain' | 'member';
  status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  responded_at: string | null;
}

export async function createTeam(params: {
  tournament_id: string;
  name: string;
  captain_id: string;
}): Promise<TournamentTeam> {
  const { data: team, error } = await supabase
    .from('tournament_teams')
    .insert({
      tournament_id: params.tournament_id,
      name: params.name,
      captain_id: params.captain_id,
    })
    .select()
    .single();
  if (error) throw error;

  // Auto add captain as accepted member
  await supabase.from('tournament_team_members').insert({
    team_id: team.id,
    user_id: params.captain_id,
    role: 'captain',
    status: 'accepted',
    responded_at: new Date().toISOString(),
  });

  return team as TournamentTeam;
}

export async function getTeamsForTournament(tournamentId: string): Promise<TournamentTeam[]> {
  const { data, error } = await supabase
    .from('tournament_teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as TournamentTeam[];
}

export async function getTeamById(id: string): Promise<TournamentTeam | null> {
  const { data } = await supabase
    .from('tournament_teams')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as TournamentTeam) || null;
}

export async function deleteTeam(id: string) {
  const { error } = await supabase.from('tournament_teams').delete().eq('id', id);
  if (error) throw error;
}

export async function getTeamMembers(teamId: string): Promise<TournamentTeamMember[]> {
  const { data, error } = await supabase
    .from('tournament_team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('invited_at', { ascending: true });
  if (error) throw error;
  return (data || []) as TournamentTeamMember[];
}

export async function inviteToTeam(teamId: string, userId: string) {
  const { error } = await supabase
    .from('tournament_team_members')
    .insert({
      team_id: teamId,
      user_id: userId,
      role: 'member',
      status: 'pending',
    });
  if (error) throw error;
}

export async function respondToInvite(memberId: string, status: 'accepted' | 'declined') {
  const { error } = await supabase
    .from('tournament_team_members')
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq('id', memberId);
  if (error) throw error;
}

export async function removeTeamMember(memberId: string) {
  const { error } = await supabase
    .from('tournament_team_members')
    .delete()
    .eq('id', memberId);
  if (error) throw error;
}

export async function getMyPendingInvites(userId: string) {
  const { data, error } = await supabase
    .from('tournament_team_members')
    .select('*, tournament_teams(*, tournaments(*))')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('invited_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getTeamMemberCount(teamId: string): Promise<number> {
  const { count } = await supabase
    .from('tournament_team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('status', 'accepted');
  return count || 0;
}

export async function searchUsersByUsername(query: string, excludeIds: string[] = []): Promise<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null }[]> {
  let q = supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url')
    .ilike('username', `%${query}%`)
    .limit(10);
  if (excludeIds.length > 0) {
    q = q.not('id', 'in', `(${excludeIds.join(',')})`);
  }
  const { data } = await q;
  return (data || []) as any;
}
