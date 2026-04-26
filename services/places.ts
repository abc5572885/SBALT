/**
 * Google Places Autocomplete Service (New API)
 *
 * API key shared with services/placesSearch.ts (nearby search).
 * Both endpoints belong to Places API (New) v1.
 *
 * Future: move to app.json extra.googlePlacesKey or behind a Supabase Edge Function
 * for production hardening (limit by Bundle ID + daily quota in Google Cloud Console).
 */

export const GOOGLE_PLACES_KEY = 'AIzaSyB3aidrEtiPumHpO_ntXwBnzhM99CUFr6w';
const API_KEY = GOOGLE_PLACES_KEY;

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
}

export async function searchPlaces(query: string): Promise<PlacePrediction[]> {
  if (!query || query.length < 2) return [];

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        input: query,
        languageCode: 'zh-TW',
        regionCode: 'TW',
        locationBias: {
          circle: {
            center: { latitude: 24.8368, longitude: 121.0018 },
            radius: 50000,
          },
        },
      }),
    });

    const data = await response.json();
    console.log('Places API:', query, '→', data.suggestions?.length || 0, 'results');

    if (!data.suggestions) return [];

    return data.suggestions
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        placeId: s.placePrediction.placeId,
        description: s.placePrediction.text?.text || '',
        mainText: s.placePrediction.structuredFormat?.mainText?.text || s.placePrediction.text?.text || '',
      }));
  } catch (error) {
    console.error('Places API error:', error);
    return [];
  }
}
