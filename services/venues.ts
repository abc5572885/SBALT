import { supabase } from '@/lib/supabase';
import { WeeklySchedule } from '@/constants/venues';
import { createNotification } from './appNotifications';
import type { GooglePlace } from './placesSearch';

export interface Venue {
  id: string;
  operator_group_id: string | null;
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
  // Phase 1: GPS + Google integration
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  is_public_landmark: boolean;
}

/** Distance from user GPS, computed client-side. Not stored in DB. */
export interface VenueWithDistance extends Venue {
  distanceMeters: number;
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

type CreateVenueInput = Omit<
  Venue,
  'id' | 'created_at' | 'updated_at' | 'status' | 'latitude' | 'longitude' | 'google_place_id' | 'is_public_landmark'
> & {
  status?: Venue['status'];
  latitude?: number | null;
  longitude?: number | null;
  google_place_id?: string | null;
  is_public_landmark?: boolean;
};

export async function createVenue(params: CreateVenueInput): Promise<Venue> {
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

/**
 * 搜尋公開 venues（給打卡 / 戰績 venue picker 用）
 * 空字串時回傳最近建立的 N 筆，作為「最近場地」清單
 */
export async function searchPublicVenues(query: string, limit = 20): Promise<Venue[]> {
  let q = supabase
    .from('venues')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);
  const term = query.trim();
  if (term) {
    q = q.or(`name.ilike.%${term}%,address.ilike.%${term}%,region.ilike.%${term}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Venue[];
}

// ─── GPS / Discovery helpers ────────────────────────────────────────────

/** Haversine distance between two lat/lng points, in meters. */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Get SBALT venues near a GPS coord, sorted by distance.
 * Filters by radius (default 30km) and active status.
 */
export async function getNearbyVenues(
  lat: number,
  lng: number,
  radiusMeters = 30000,
): Promise<VenueWithDistance[]> {
  // Crude bounding-box prefilter (faster than scanning all venues; refined client-side)
  const degLat = radiusMeters / 111000;
  const degLng = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));

  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('status', 'active')
    .not('latitude', 'is', null)
    .gte('latitude', lat - degLat)
    .lte('latitude', lat + degLat)
    .gte('longitude', lng - degLng)
    .lte('longitude', lng + degLng);
  if (error) throw error;

  const withDistance: VenueWithDistance[] = (data || [])
    .map((v: any) => {
      const distanceMeters = haversineDistance(lat, lng, v.latitude, v.longitude);
      return { ...(v as Venue), distanceMeters };
    })
    .filter((v) => v.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  return withDistance;
}

/**
 * Upsert a Google place as a SBALT public-landmark venue.
 * Called when a user creates an event/check-in at a Google POI for the first time.
 */
export async function upsertVenueFromGooglePlace(place: GooglePlace): Promise<Venue> {
  // Check if already exists
  const { data: existing } = await supabase
    .from('venues')
    .select('*')
    .eq('google_place_id', place.id)
    .maybeSingle();
  if (existing) return existing as Venue;

  // Derive region from address (rough — first 2 segments before street name)
  const region = deriveRegionFromAddress(place.address);

  const { data, error } = await supabase
    .from('venues')
    .insert({
      name: place.name,
      address: place.address,
      region,
      latitude: place.latitude,
      longitude: place.longitude,
      google_place_id: place.id,
      sport_types: place.inferredSports,
      is_public_landmark: true,
      operator_group_id: null,
      amenities: [],
      weekly_schedule: {},
      status: 'active',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Venue;
}

function deriveRegionFromAddress(address: string): string | null {
  // Taiwan address pattern: "{city}{district}..."
  // e.g. "新竹縣竹北市光明六路10號" → "新竹縣竹北市"
  const match = address.match(/^(\D+?(?:市|縣)\D+?(?:區|市|鄉|鎮))/);
  return match ? match[1] : null;
}

/**
 * Get nearby venues with event activity counts.
 *
 * Strategy: 場地的存在感由 events 定義，不是 venue.sport_types。
 * 籃球模式 → 顯示有籃球活動的場地
 * 跑步模式 → 顯示有跑團活動的場地
 * 全部 → 任何活動
 *
 * Match logic:
 * - venue_id linked events（新活動）
 * - 模糊匹配舊活動：events.location 字串包含 venue.name
 */
export interface ActiveVenue extends VenueWithDistance {
  totalEventCount: number;
  upcomingEventCount: number;
  /** Sport types derived from actual events at this venue (not venue.sport_types). */
  eventSportTypes: string[];
}

export async function getNearbyActiveVenues(
  lat: number,
  lng: number,
  radiusMeters = 5000,
  sportFilter: string = 'all', // 'all' | 'basketball' | 'volleyball' | 'badminton' | 'running'
): Promise<ActiveVenue[]> {
  const venues = await getNearbyVenues(lat, lng, radiusMeters);
  if (!venues.length) return [];

  const venueIds = venues.map((v) => v.id);

  // Build event query with optional sport filter
  let linkedQuery = supabase
    .from('events')
    .select('venue_id, scheduled_at, location, sport_type')
    .in('venue_id', venueIds)
    .neq('status', 'cancelled');
  if (sportFilter !== 'all') {
    linkedQuery = linkedQuery.eq('sport_type', sportFilter);
  }

  let stringQuery = supabase
    .from('events')
    .select('venue_id, scheduled_at, location, sport_type')
    .is('venue_id', null)
    .neq('status', 'cancelled');
  if (sportFilter !== 'all') {
    stringQuery = stringQuery.eq('sport_type', sportFilter);
  }

  const [{ data: linkedEvents }, { data: stringMatchEvents }] = await Promise.all([
    linkedQuery,
    stringQuery,
  ]);

  const totalCount = new Map<string, number>();
  const upcomingCount = new Map<string, number>();
  const sportTypesByVenue = new Map<string, Set<string>>();
  const now = Date.now();

  const tally = (venueId: string, scheduledAt: string, sportType: string | null) => {
    totalCount.set(venueId, (totalCount.get(venueId) || 0) + 1);
    if (new Date(scheduledAt).getTime() > now) {
      upcomingCount.set(venueId, (upcomingCount.get(venueId) || 0) + 1);
    }
    if (sportType) {
      const set = sportTypesByVenue.get(venueId) || new Set<string>();
      set.add(sportType);
      sportTypesByVenue.set(venueId, set);
    }
  };

  for (const e of linkedEvents || []) {
    if (!e.venue_id) continue;
    tally(e.venue_id, e.scheduled_at, e.sport_type);
  }

  // Fuzzy match legacy events by location string
  for (const e of stringMatchEvents || []) {
    if (!e.location) continue;
    const matched = venues.find((v) => e.location.includes(v.name));
    if (!matched) continue;
    tally(matched.id, e.scheduled_at, e.sport_type);
  }

  return venues
    .map((v) => ({
      ...v,
      totalEventCount: totalCount.get(v.id) || 0,
      upcomingEventCount: upcomingCount.get(v.id) || 0,
      eventSportTypes: [...(sportTypesByVenue.get(v.id) || [])],
    }))
    .filter((v) => v.totalEventCount > 0)
    .sort((a, b) => {
      if (a.upcomingEventCount !== b.upcomingEventCount) {
        return b.upcomingEventCount - a.upcomingEventCount;
      }
      return a.distanceMeters - b.distanceMeters;
    });
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

  // Notify venue operator
  const { data: venue } = await supabase
    .from('venues')
    .select('name, operator_group_id')
    .eq('id', params.venue_id)
    .maybeSingle();
  if (venue) {
    const { data: group } = await supabase
      .from('groups').select('creator_id').eq('id', venue.operator_group_id).maybeSingle();
    if (group?.creator_id && group.creator_id !== params.user_id) {
      const startStr = new Date(params.start_time).toLocaleString('zh-TW', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      await createNotification({
        user_id: group.creator_id,
        type: 'booking_created',
        title: `「${venue.name}」有新預約`,
        body: `${startStr} 待確認`,
        data: { venue_id: params.venue_id, booking_id: data.id, is_operator: true },
        actor_id: params.user_id,
      });
    }
  }

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

export interface BookingWithVenue extends VenueBooking {
  venue: Venue | null;
}

export async function getMyBookingsWithVenue(userId: string): Promise<BookingWithVenue[]> {
  const { data, error } = await supabase
    .from('venue_bookings')
    .select('*, venue:venues(*)')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });
  if (error) throw error;
  return (data || []) as BookingWithVenue[];
}

export async function getAllVenueBookings(venueId: string): Promise<VenueBooking[]> {
  const { data, error } = await supabase
    .from('venue_bookings')
    .select('*')
    .eq('venue_id', venueId)
    .order('start_time', { ascending: false });
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
  const { data: booking } = await supabase
    .from('venue_bookings')
    .select('user_id, venue_id, start_time')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase
    .from('venue_bookings')
    .update({ status })
    .eq('id', id);
  if (error) throw error;

  // Notify booker of status change
  if (booking && (status === 'confirmed' || status === 'cancelled')) {
    const { data: venue } = await supabase
      .from('venues').select('name').eq('id', booking.venue_id).maybeSingle();
    const startStr = new Date(booking.start_time).toLocaleString('zh-TW', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    await createNotification({
      user_id: booking.user_id,
      type: status === 'confirmed' ? 'booking_confirmed' : 'booking_rejected',
      title: status === 'confirmed'
        ? `「${venue?.name || '場地'}」預約已確認`
        : `「${venue?.name || '場地'}」預約被取消`,
      body: startStr,
      data: { venue_id: booking.venue_id, booking_id: id },
    });
  }
}
