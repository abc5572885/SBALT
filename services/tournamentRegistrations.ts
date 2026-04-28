/**
 * Tournament Registrations — 隊伍 (group) 報名 tournament。
 *
 * 取代舊的 user-based registration（個人報名）。在新模型下：
 *   - 報名單位是「群組」(group)，因為一個 group 同時是社交群組與隊伍
 *   - organizer 把每個 registration 分到某個 division（A/B/C 級）
 *   - 報名狀態：pending → confirmed (organizer 確認) → paid (繳費)；可 withdrawn
 */

import { supabase } from '@/lib/supabase';
import { createNotification } from './appNotifications';

export type RegistrationStatus = 'pending' | 'confirmed' | 'paid' | 'withdrawn';

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  group_id: string;
  division_id: string | null;
  team_label: string;
  status: RegistrationStatus;
  paid: boolean;
  notes: string | null;
  registered_by: string | null;
  registered_at: string;
}

export async function getRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('registered_at', { ascending: true });
  if (error) throw error;
  return (data || []) as TournamentRegistration[];
}

export async function isGroupRegistered(
  tournamentId: string,
  groupId: string,
): Promise<TournamentRegistration | null> {
  const { data } = await supabase
    .from('tournament_registrations')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('group_id', groupId)
    .maybeSingle();
  return (data as TournamentRegistration) || null;
}

export async function registerGroup(params: {
  tournamentId: string;
  groupId: string;
  teamLabel: string;
  registeredBy: string;
  divisionId?: string | null;
  notes?: string;
}): Promise<TournamentRegistration> {
  const { data, error } = await supabase
    .from('tournament_registrations')
    .insert({
      tournament_id: params.tournamentId,
      group_id: params.groupId,
      division_id: params.divisionId ?? null,
      team_label: params.teamLabel,
      registered_by: params.registeredBy,
      notes: params.notes ?? null,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;

  // Notify tournament organizer
  const { data: t } = await supabase
    .from('tournaments')
    .select('title, organizer_group_id')
    .eq('id', params.tournamentId)
    .maybeSingle();
  if (t?.organizer_group_id) {
    const { data: org } = await supabase
      .from('groups')
      .select('creator_id')
      .eq('id', t.organizer_group_id)
      .maybeSingle();
    if (org?.creator_id && org.creator_id !== params.registeredBy) {
      await createNotification({
        user_id: org.creator_id,
        type: 'tournament_registered',
        title: `「${t.title}」有新隊伍報名`,
        body: params.teamLabel,
        data: { tournament_id: params.tournamentId, registration_id: data.id },
        actor_id: params.registeredBy,
      });
    }
  }

  return data as TournamentRegistration;
}

export async function updateRegistration(
  id: string,
  patch: Partial<Pick<TournamentRegistration, 'division_id' | 'status' | 'paid' | 'notes' | 'team_label'>>,
): Promise<void> {
  const { error } = await supabase.from('tournament_registrations').update(patch).eq('id', id);
  if (error) throw error;
}

export async function withdrawRegistration(id: string): Promise<void> {
  const { error } = await supabase
    .from('tournament_registrations')
    .update({ status: 'withdrawn' })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteRegistration(id: string): Promise<void> {
  const { error } = await supabase.from('tournament_registrations').delete().eq('id', id);
  if (error) throw error;
}
