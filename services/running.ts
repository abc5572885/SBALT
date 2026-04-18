import { supabase } from '@/lib/supabase';

interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface RunInsert {
  user_id: string;
  distance: number;
  duration: number;
  avg_pace: number | null;
  calories: number | null;
  route: Coordinate[];
  started_at: string;
  finished_at: string;
}

export async function saveRun(data: RunInsert) {
  const { data: run, error } = await supabase
    .from('runs')
    .insert({
      ...data,
      route: JSON.stringify(data.route),
    })
    .select()
    .single();
  if (error) throw error;
  return run;
}

export async function getUserRuns(userId: string) {
  const { data, error } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r,
    route: typeof r.route === 'string' ? JSON.parse(r.route) : r.route || [],
  }));
}

export async function deleteRun(runId: string) {
  const { error } = await supabase.from('runs').delete().eq('id', runId);
  if (error) throw error;
}

export async function getUserRunStats(userId: string) {
  const { data, error } = await supabase
    .from('runs')
    .select('distance, duration')
    .eq('user_id', userId);
  if (error) throw error;

  const runs = data || [];
  const totalDistance = runs.reduce((sum: number, r: any) => sum + (parseFloat(r.distance) || 0), 0);
  const totalDuration = runs.reduce((sum: number, r: any) => sum + (r.duration || 0), 0);
  const totalRuns = runs.length;

  return { totalDistance, totalDuration, totalRuns };
}

// Calculate pace (min/km)
export function calculatePace(distanceKm: number, durationSeconds: number): number {
  if (distanceKm <= 0) return 0;
  return durationSeconds / 60 / distanceKm;
}

// Format pace to mm:ss
export function formatPace(pace: number): string {
  if (pace <= 0 || !isFinite(pace)) return '--:--';
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Format duration to hh:mm:ss
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Format distance
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

// Estimate calories (rough: 1 cal per kg per km)
export function estimateCalories(distanceKm: number, weightKg: number = 65): number {
  return Math.round(distanceKm * weightKg);
}
