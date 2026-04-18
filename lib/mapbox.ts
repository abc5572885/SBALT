import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';

const MAPBOX_TOKEN = Constants.expoConfig?.extra?.mapboxToken || process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

Mapbox.setAccessToken(MAPBOX_TOKEN);

export default Mapbox;
