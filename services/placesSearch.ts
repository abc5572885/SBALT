/**
 * Google Places API (New) wrapper — Place Details lookup.
 *
 * Used by VenuePicker: after Google autocomplete suggests a place, we fetch
 * full details (lat/lng, formatted address) so we can upsert into venues table.
 *
 * API key shared from services/places.ts (autocomplete) — same Places API (New) key.
 *
 * Note: nearby-search 早期版本曾被使用，後來改成「只顯示有 SBALT 活動的場地」
 * 信號驅動模型，nearby-search 已移除。Discover 階段純粹用 autocomplete +
 * details + upsert 的動線。
 */

import { GOOGLE_PLACES_KEY } from './places';

/**
 * Conservative sport inference — only trust direct name keyword matches.
 *
 * Future enhancement: LLM classification (Gemini Flash) for ambiguous cases,
 * with user override as ground truth.
 */
export type ClassificationSource = 'user_confirmed' | 'name_match' | 'llm' | null;

function inferSportsByName(name: string): { sports: string[]; source: ClassificationSource } {
  const sports = new Set<string>();
  const lowerName = name.toLowerCase();

  if (name.includes('籃球') || lowerName.includes('basketball')) sports.add('basketball');
  if (name.includes('排球') || lowerName.includes('volleyball')) sports.add('volleyball');
  if (name.includes('羽球') || name.includes('羽毛球') || lowerName.includes('badminton')) sports.add('badminton');
  if (
    name.includes('跑步') ||
    name.includes('田徑') ||
    name.includes('自行車道') ||
    lowerName.includes('running') ||
    lowerName.includes('track')
  ) {
    sports.add('running');
  }

  return {
    sports: [...sports],
    source: sports.size > 0 ? 'name_match' : null,
  };
}

export interface GooglePlace {
  id: string; // Google place_id (we store this as venues.google_place_id)
  name: string; // displayName.text
  address: string; // formattedAddress
  latitude: number;
  longitude: number;
  types: string[];
  /** Inferred SBALT sport_types — only set if confident from name match. */
  inferredSports: string[];
  /** Source of classification (null if unclassified). */
  classificationSource: ClassificationSource;
}

/**
 * Fetch full place details by Google place_id.
 * Used after autocomplete selection to get lat/lng/address for upserting into venues.
 */
export async function getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
  if (!GOOGLE_PLACES_KEY || !placeId) return null;

  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types',
    },
  });
  if (!response.ok) {
    console.warn('getPlaceDetails failed:', response.status, await response.text());
    return null;
  }
  const p = await response.json();
  const name = p.displayName?.text || '未命名地點';
  const { sports, source } = inferSportsByName(name);
  return {
    id: p.id,
    name,
    address: p.formattedAddress || '',
    latitude: p.location?.latitude || 0,
    longitude: p.location?.longitude || 0,
    types: p.types || [],
    inferredSports: sports,
    classificationSource: source,
  };
}
