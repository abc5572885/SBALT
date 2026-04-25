import { supabase } from '@/lib/supabase';
import {
  isHealthDataAvailable,
  queryWorkoutSamples,
  requestAuthorization,
  WorkoutActivityType,
  WorkoutTypeIdentifier,
} from '@kingstinct/react-native-healthkit';
import { Platform } from 'react-native';

interface SyncResult {
  inserted: number;
  skipped: number;
  total: number;
}

export function isHealthKitAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return isHealthDataAvailable();
  } catch {
    return false;
  }
}

export async function requestHealthKitAuthorization(): Promise<boolean> {
  if (!isHealthKitAvailable()) return false;
  try {
    const ok = await requestAuthorization({
      toRead: [
        WorkoutTypeIdentifier,
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
      ],
    });
    return !!ok;
  } catch (e) {
    console.error('[HealthKit] requestAuthorization failed:', e);
    return false;
  }
}

/**
 * Sync HealthKit running workouts into Supabase `runs` table.
 * Dedup via (user_id, source, external_id) unique index.
 */
export async function syncRunningWorkouts(userId: string, daysBack = 30): Promise<SyncResult> {
  if (!isHealthKitAvailable()) return { inserted: 0, skipped: 0, total: 0 };

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - daysBack);

  const samples = await queryWorkoutSamples({
    filter: {
      workoutActivityType: WorkoutActivityType.running,
      date: { startDate: start, endDate: end },
    },
    limit: 100,
    ascending: false,
  });

  if (!samples || samples.length === 0) {
    return { inserted: 0, skipped: 0, total: 0 };
  }

  // Existing external IDs for this user (dedup)
  const externalIds = samples.map((s) => s.uuid).filter(Boolean);
  const { data: existing } = await supabase
    .from('runs')
    .select('external_id')
    .eq('user_id', userId)
    .eq('source', 'healthkit')
    .in('external_id', externalIds);
  const existingIds = new Set((existing || []).map((r: any) => r.external_id));

  let inserted = 0;
  let skipped = 0;

  for (const w of samples) {
    if (!w.uuid) {
      skipped++;
      continue;
    }
    if (existingIds.has(w.uuid)) {
      skipped++;
      continue;
    }

    const startedAt = w.startDate instanceof Date ? w.startDate.toISOString() : new Date(w.startDate as any).toISOString();
    const endedAt = w.endDate instanceof Date ? w.endDate.toISOString() : new Date(w.endDate as any).toISOString();

    // Duration in seconds (Quantity has .quantity in the unit's base unit; for time it's typically seconds)
    const durationSec = w.duration?.quantity ?? 0;

    // Distance in meters → convert to km
    const distanceMeters = w.totalDistance?.quantity ?? 0;
    const distanceKm = distanceMeters / 1000;

    const calories = w.totalEnergyBurned?.quantity ?? null;
    const avgPace = distanceKm > 0 ? durationSec / 60 / distanceKm : null;

    const sourceName = (w as any).sourceRevision?.source?.name ?? null;

    const { error } = await supabase.from('runs').insert({
      user_id: userId,
      distance: distanceKm,
      duration: durationSec,
      avg_pace: avgPace,
      calories,
      route: '[]',
      started_at: startedAt,
      finished_at: endedAt,
      source: 'healthkit',
      external_id: w.uuid,
      source_metadata: {
        sourceName,
        durationUnit: w.duration?.unit,
        distanceUnit: w.totalDistance?.unit,
      },
    });
    if (error) {
      if ((error as any).code !== '23505') {
        console.error('[HealthKit] insert failed:', error);
      }
      skipped++;
      continue;
    }
    inserted++;
  }

  return { inserted, skipped, total: samples.length };
}
