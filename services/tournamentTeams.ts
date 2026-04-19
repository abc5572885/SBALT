import { supabase } from '@/lib/supabase';
import { createNotification } from './appNotifications';

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

  // Notify invited user
  const team = await getTeamById(teamId);
  if (team) {
    const { data: t } = await supabase.from('tournaments').select('title').eq('id', team.tournament_id).maybeSingle();
    await createNotification({
      user_id: userId,
      type: 'team_invite',
      title: `您被邀請加入「${team.name}」`,
      body: t?.title ? `賽事：${t.title}` : undefined,
      data: { team_id: teamId, tournament_id: team.tournament_id },
      actor_id: team.captain_id,
    });
  }
}

export async function respondToInvite(memberId: string, status: 'accepted' | 'declined') {
  const { data: member } = await supabase
    .from('tournament_team_members')
    .select('team_id, user_id')
    .eq('id', memberId)
    .maybeSingle();

  const { error } = await supabase
    .from('tournament_team_members')
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq('id', memberId);
  if (error) throw error;

  // Notify captain
  if (member) {
    const team = await getTeamById(member.team_id);
    if (team && team.captain_id !== member.user_id) {
      const { data: profile } = await supabase
        .from('profiles').select('display_name, username').eq('id', member.user_id).maybeSingle();
      const name = profile?.display_name || profile?.username || '一位用戶';
      await createNotification({
        user_id: team.captain_id,
        type: status === 'accepted' ? 'team_invite_accepted' : 'team_invite_declined',
        title: status === 'accepted' ? `${name} 加入了「${team.name}」` : `${name} 婉拒了「${team.name}」的邀請`,
        data: { team_id: team.id },
        actor_id: member.user_id,
      });
    }
  }
}

export async function removeTeamMember(memberId: string) {
  const { error } = await supabase
    .from('tournament_team_members')
    .delete()
    .eq('id', memberId);
  if (error) throw error;
}

export async function getMyTeams(userId: string) {
  const { data, error } = await supabase
    .from('tournament_team_members')
    .select('*, tournament_teams(*, tournaments(id, title, sport_type, start_date, team_size))')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .order('invited_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getPendingInviteCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('tournament_team_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending');
  return count || 0;
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
  const escaped = query.replace(/[%_]/g, (c) => `\\${c}`);
  let q = supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url')
    .or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`)
    .limit(10);
  if (excludeIds.length > 0) {
    q = q.not('id', 'in', `(${excludeIds.join(',')})`);
  }
  const { data } = await q;
  return (data || []) as any;
}
