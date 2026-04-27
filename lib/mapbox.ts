import Constants from 'expo-constants';

const MAPBOX_TOKEN =
  Constants.expoConfig?.extra?.mapboxToken ||
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  '';

// In Expo Go the native @rnmapbox/maps module is missing; importing it throws
// at module load and crashes the JS bundle. Guard with try/require so the rest
// of the app can run; pages that need maps must check `isMapboxAvailable()`.
let Mapbox: any = null;
try {
  Mapbox = require('@rnmapbox/maps').default;
  Mapbox?.setAccessToken?.(MAPBOX_TOKEN);
} catch {
  // Mapbox unavailable in Expo Go / web
}

export function isMapboxAvailable(): boolean {
  return !!Mapbox;
}

export default Mapbox;
export { MAPBOX_TOKEN };
