import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/lib/mapbox';
import { formatDistance } from '@/services/running';
import { getRoute } from '@/services/directions';
import Mapbox from '@rnmapbox/maps';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlanRouteScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState(0);
  const [loading, setLoading] = useState(false);

  const mapStyle = colorScheme === 'dark'
    ? 'mapbox://styles/abc5572885/cmo4dgsy200ba01st1sxsg3ci'
    : 'mapbox://styles/mapbox/outdoors-v12';

  const handleMapPress = async (event: any) => {
    const coord = event.geometry.coordinates as [number, number];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newWaypoints = [...waypoints, coord];
    setWaypoints(newWaypoints);

    if (newWaypoints.length >= 2) {
      setLoading(true);
      const result = await getRoute(newWaypoints);
      if (result) {
        setRouteCoords(result.coordinates);
        setDistance(result.distance);
      }
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    if (waypoints.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

    const newWaypoints = waypoints.slice(0, -1);
    setWaypoints(newWaypoints);

    if (newWaypoints.length >= 2) {
      const result = await getRoute(newWaypoints);
      if (result) {
        setRouteCoords(result.coordinates);
        setDistance(result.distance);
      }
    } else {
      setRouteCoords([]);
      setDistance(0);
    }
  };

  const handleClear = () => {
    setWaypoints([]);
    setRouteCoords([]);
    setDistance(0);
  };

  const handleStartRun = () => {
    // Could pass planned route to run screen
    router.replace('/sport/run');
  };

  const routeGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: routeCoords.length > 1 ? [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: routeCoords,
      },
    }] : [],
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <IconSymbol name="chevron.left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>路線規劃</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={mapStyle}
          logoEnabled={false}
          attributionEnabled={false}
          scaleBarEnabled={false}
          onPress={handleMapPress}
        >
          <Mapbox.Camera
            defaultSettings={{
              centerCoordinate: [121.0018, 24.8368],
              zoomLevel: 14,
            }}
          />
          <Mapbox.LocationPuck puckBearingEnabled puckBearing="heading" />

          {/* Route line */}
          {routeCoords.length > 1 && (
            <Mapbox.ShapeSource id="plan-route" shape={routeGeoJSON}>
              <Mapbox.LineLayer
                id="plan-line"
                slot="top"
                style={{
                  lineColor: colorScheme === 'dark' ? '#FF9224' : '#2563EB',
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineEmissiveStrength: 1,
                  lineDasharray: [2, 1],
                }}
              />
            </Mapbox.ShapeSource>
          )}

          {/* Waypoint markers */}
          {waypoints.map((wp, i) => {
            const bg = i === 0 ? '#22C55E' : (i === waypoints.length - 1 && i > 0 ? '#DC2626' : '#2563EB');
            return (
              <Mapbox.MarkerView
                key={`wp-${i}-${wp[0]}-${wp[1]}`}
                coordinate={wp}
              >
                <View style={[styles.waypointMarker, { backgroundColor: bg }]}>
                  <Text style={styles.waypointText}>{i + 1}</Text>
                </View>
              </Mapbox.MarkerView>
            );
          })}
        </Mapbox.MapView>

        {/* Distance overlay */}
        {distance > 0 && (
          <View style={[styles.distanceOverlay, { backgroundColor: colors.background + 'E6' }]}>
            <Text style={[styles.distanceValue, { color: colors.primary }]}>
              {formatDistance(distance)}
            </Text>
            <Text style={[styles.distanceLabel, { color: colors.textSecondary }]}>
              預估距離
            </Text>
          </View>
        )}

        {loading && (
          <View style={[styles.distanceOverlay, { backgroundColor: colors.background + 'E6' }]}>
            <Text style={[styles.distanceLabel, { color: colors.textSecondary }]}>計算中...</Text>
          </View>
        )}
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomPanel, { backgroundColor: colors.background }]}>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {waypoints.length === 0 ? '點擊地圖設定起點' : `已設 ${waypoints.length} 個路徑點`}
        </Text>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, { borderColor: colors.border }]}
            onPress={handleUndo}
            activeOpacity={0.6}
            disabled={waypoints.length === 0}
          >
            <IconSymbol name="chevron.left" size={16} color={waypoints.length > 0 ? colors.text : colors.disabled} />
            <Text style={[styles.controlText, { color: waypoints.length > 0 ? colors.text : colors.disabled }]}>上一步</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { borderColor: colors.border }]}
            onPress={handleClear}
            activeOpacity={0.6}
            disabled={waypoints.length === 0}
          >
            <Text style={[styles.controlText, { color: waypoints.length > 0 ? colors.error : colors.disabled }]}>清除</Text>
          </TouchableOpacity>

          {distance > 0 && (
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: '#22C55E' }]}
              onPress={handleStartRun}
              activeOpacity={0.8}
            >
              <Text style={styles.startBtnText}>開始跑步</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  waypointMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  waypointText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  distanceOverlay: {
    position: 'absolute',
    top: Spacing.lg,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  distanceValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  distanceLabel: {
    fontSize: 13,
  },
  bottomPanel: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '600',
  },
  startBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
