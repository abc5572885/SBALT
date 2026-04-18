/**
 * Mapbox Directions API for route planning
 */

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  coordinates: [number, number][]; // [lng, lat]
}

export async function getRoute(waypoints: [number, number][]): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;

  const coords = waypoints.map((w) => `${w[0]},${w[1]}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    return {
      distance: route.distance,
      duration: route.duration,
      coordinates: route.geometry.coordinates,
    };
  } catch (error) {
    console.error('Directions API error:', error);
    return null;
  }
}
