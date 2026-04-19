import { supabase } from '@/lib/supabase';
import { TournamentFormat, TournamentStatus } from '@/constants/tournaments';
import { createNotification } from './appNotifications';

export interface Tournament {
  id: string;
  organizer_group_id: string;
  title: string;
  description: string | null;
  sport_type: string;
  format: TournamentFormat;
  start_date: string;
  end_date: string | null;
  registration_deadline: string | null;
  location: string;
  venue: string | null;
  rules: string | null;
  entry_fee: number;
  payment_info: string | null;
  prize_pool: string | null;
  max_participants: number | null;
  cover_image_url: string | null;
  status: TournamentStatus;
  registration_type: 'individual' | 'team';
  team_size: number | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'waitlisted';
  payment_status: 'pending' | 'paid' | 'waived' | 'refunded';
  notes: string | null;
  created_at: string;
}

export async function createTournament(params: Omit<Tournament, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: TournamentStatus }): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .insert(params)
    .select()
    .single();
  if (error) throw error;
  return data as Tournament;
}

export async function getPublicTournaments(options?: { sportType?: string; limit?: number }): Promise<Tournament[]> {
  let query = supabase
    .from('tournaments')
    .select('*')
    .in('status', ['open', 'ongoing'])
    .order('start_date', { ascending: true });
  if (options?.sportType && options.sportType !== 'all') {
    query = query.eq('sport_type', options.sportType);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Tournament[];
}

export async function getTournamentsByGroup(groupId: string): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('organizer_group_id', groupId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data || []) as Tournament[];
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Tournament;
}

export async function updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Tournament;
}

export async function deleteTournament(id: string) {
  const { error } = await supabase.from('tournaments').delete().eq('id', id);
  if (error) throw error;
}

export async function registerForTournament(tournamentId: string, userId: string, notes?: string) {
  const { error } = await supabase.from('tournament_registrations').insert({
    tournament_id: tournamentId,
    user_id: userId,
    notes: notes || null,
  });
  if (error) throw error;

  // Notify tournament organizer
  const { data: t } = await supabase
    .from('tournaments').select('title, organizer_group_id').eq('id', tournamentId).maybeSingle();
  if (t) {
    const { data: group } = await supabase
      .from('groups').select('creator_id').eq('id', t.organizer_group_id).maybeSingle();
    if (group?.creator_id && group.creator_id !== userId) {
      const { data: profile } = await supabase
        .from('profiles').select('display_name, username').eq('id', userId).maybeSingle();
      const name = profile?.display_name || profile?.username || '一位用戶';
      await createNotification({
        user_id: group.creator_id,
        type: 'tournament_registered',
        title: `「${t.title}」有新報名`,
        body: name,
        data: { tournament_id: tournamentId },
        actor_id: userId,
      });
    }
  }
}

export async function cancelTournamentRegistration(tournamentId: string, userId: string) {
  const { error } = await supabase
    .from('tournament_registrations')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getTournamentRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as TournamentRegistration[];
}

export async function isUserRegistered(tournamentId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('tournament_registrations')
    .select('id, status')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data && data.status !== 'cancelled';
}
