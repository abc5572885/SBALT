import { supabase } from '@/lib/supabase';
import { WeeklySchedule } from '@/constants/venues';

export interface Venue {
  id: string;
  operator_group_id: string;
  name: string;
  description: string | null;
  address: string;
  region: string | null;
  sport_types: string[];
  cover_image_url: string | null;
  hourly_rate: number | null;
  capacity: number | null;
  amenities: string[];
  open_hours: string | null;
  weekly_schedule: WeeklySchedule;
  contact_phone: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface VenueBooking {
  id: string;
  venue_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
}

export async function createVenue(params: Omit<Venue, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: Venue['status'] }): Promise<Venue> {
  const { data, error } = await supabase
    .from('venues')
    .insert(params)
    .select()
    .single();
  if (error) throw error;
  return data as Venue;
}

export async function getVenueById(id: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Venue;
}

export async function updateVenue(id: string, updates: Partial<Venue>): Promise<Venue> {
  const { data, error } = await supabase
    .from('venues')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Venue;
}

export async function deleteVenue(id: string) {
  const { error } = await supabase.from('venues').delete().eq('id', id);
  if (error) throw error;
}

export async function getVenuesByOperator(groupId: string): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('operator_group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Venue[];
}

export async function getPublicVenues(options?: { region?: string; sportType?: string; limit?: number }): Promise<Venue[]> {
  let query = supabase
    .from('venues')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (options?.region) query = query.ilike('region', `%${options.region}%`);
  if (options?.sportType) query = query.contains('sport_types', [options.sportType]);
  if (options?.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Venue[];
}

// Bookings
export async function createBooking(params: {
  venue_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  notes?: string;
}): Promise<VenueBooking> {
  const { data, error } = await supabase
    .from('venue_bookings')
    .insert({
      venue_id: params.venue_id,
      user_id: params.user_id,
      start_time: params.start_time,
      end_time: params.end_time,
      notes: params.notes || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as VenueBooking;
}

export async function getVenueBookings(venueId: string, fromDate?: Date): Promise<VenueBooking[]> {
  let query = supabase
    .from('venue_bookings')
    .select('*')
    .eq('venue_id', venueId)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true });
  if (fromDate) query = query.gte('start_time', fromDate.toISOString());
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as VenueBooking[];
}

export async function getMyBookings(userId: string): Promise<VenueBooking[]> {
  const { data, error } = await supabase
    .from('venue_bookings')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true });
  if (error) throw error;
  return (data || []) as VenueBooking[];
}

export async function cancelBooking(id: string) {
  const { error } = await supabase
    .from('venue_bookings')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) throw error;
}

export async function updateBookingStatus(id: string, status: VenueBooking['status']) {
  const { error } = await supabase
    .from('venue_bookings')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}
