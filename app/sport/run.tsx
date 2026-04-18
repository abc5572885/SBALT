import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/lib/mapbox';
import {
  calculatePace,
  estimateCalories,
  formatDistance,
  formatDuration,
  formatPace,
  saveRun,
} from '@/services/running';
import Mapbox from '@rnmapbox/maps';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Coord {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export default function RunScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [coords, setCoords] = useState<Coord[]>([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);

  const cameraRef = useRef<Mapbox.Camera>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string>('');

  useEffect(() => {
    return () => {
      locationSub.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const requestPermission = async () => {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      Alert.alert('權限不足', '需要定位權限才能追蹤跑步');
      return false;
    }
    return true;
  };

  const startRun = async () => {
    const permitted = await requestPermission();
    if (!permitted) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatus('running');
    setCoords([]);
    setDistance(0);
    setDuration(0);
    startedAtRef.current = new Date().toISOString();

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 2000,
      },
      (location) => {
        const newCoord: Coord = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
        };

        setCoords((prev) => {
          const updated = [...prev, newCoord];
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const d = getDistanceBetween(last, newCoord);
            setDistance((prevDist) => prevDist + d);
          }
          cameraRef.current?.setCamera({
            centerCoordinate: [newCoord.longitude, newCoord.latitude],
            zoomLevel: 16,
            animationDuration: 500,
          });
          return updated;
        });
      }
    );
  };

  const pauseRun = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('paused');
    locationSub.current?.remove();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resumeRun = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatus('running');

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 2000,
      },
      (location) => {
        const newCoord: Coord = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
        };
        setCoords((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const d = getDistanceBetween(last, newCoord);
            setDistance((prevDist) => prevDist + d);
          }
          cameraRef.current?.setCamera({
            centerCoordinate: [newCoord.longitude, newCoord.latitude],
            zoomLevel: 16,
            animationDuration: 500,
          });
          return [...prev, newCoord];
        });
      }
    );
  };

  const finishRun = async () => {
    locationSub.current?.remove();
    if (timerRef.current) clearInterval(timerRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatus('finished');

    if (!user || distance < 10) return;

    const distKm = distance / 1000;
    const pace = calculatePace(distKm, duration);
    const cal = estimateCalories(distKm);

    try {
      await saveRun({
        user_id: user.id,
        distance: Math.round(distance),
        duration,
        avg_pace: pace,
        calories: cal,
        route: coords,
        started_at: startedAtRef.current,
        finished_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('儲存跑步紀錄失敗:', error);
    }
  };

  const distKm = distance / 1000;
  const pace = calculatePace(distKm, duration);

  // Build GeoJSON for route line
  const routeGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: coords.length > 1 ? [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coords.map((c) => [c.longitude, c.latitude]),
      },
    }] : [],
  };

  const mapStyle = colorScheme === 'dark'
    ? 'mapbox://styles/mapbox/navigation-night-v1'
    : 'mapbox://styles/mapbox/outdoors-v12';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (status === 'running' || status === 'paused') {
            Alert.alert('結束跑步？', '確定要結束嗎？', [
              { text: '繼續', style: 'cancel' },
              { text: '結束', style: 'destructive', onPress: () => { finishRun(); router.back(); } },
            ]);
          } else {
            router.back();
          }
        }}>
          <IconSymbol name="chevron.left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>跑步</Text>
        <TouchableOpacity onPress={() => router.push('/sport/run-history')}>
          <IconSymbol name="chart.bar.fill" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={mapStyle}
          logoEnabled={false}
          attributionEnabled={false}
          scaleBarEnabled={false}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [121.0018, 24.8368],
              zoomLevel: 15,
            }}
            followUserLocation={status === 'idle'}
            followZoomLevel={15}
          />
          <Mapbox.LocationPuck puckBearingEnabled puckBearing="heading" />

          {coords.length > 1 && (
            <Mapbox.ShapeSource id="route" shape={routeGeoJSON}>
              <Mapbox.LineLayer
                id="routeLine" slot="top"
                style={{
                  lineColor: colorScheme === 'dark' ? '#FF9224' : '#2563EB',
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </Mapbox.ShapeSource>
          )}
        </Mapbox.MapView>
      </View>

      {/* Stats */}
      <View style={[styles.statsPanel, { backgroundColor: colors.background }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {distKm < 1 ? `${Math.round(distance)}` : distKm.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {distKm < 1 ? '公尺' : '公里'}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatDuration(duration)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>時間</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatPace(pace)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>配速</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {status === 'idle' && (
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: '#22C55E' }]}
              onPress={startRun}
              activeOpacity={0.8}
            >
              <Text style={styles.startBtnText}>開始跑步</Text>
            </TouchableOpacity>
          )}

          {status === 'running' && (
            <View style={styles.runningControls}>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: '#F59E0B' }]}
                onPress={pauseRun}
                activeOpacity={0.8}
              >
                <Text style={styles.controlBtnText}>暫停</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => {
                  Alert.alert('結束跑步', '確定要結束嗎？', [
                    { text: '取消', style: 'cancel' },
                    { text: '結束', onPress: finishRun },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.controlBtnText}>結束</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'paused' && (
            <View style={styles.runningControls}>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: '#22C55E' }]}
                onPress={resumeRun}
                activeOpacity={0.8}
              >
                <Text style={styles.controlBtnText}>繼續</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: '#DC2626' }]}
                onPress={finishRun}
                activeOpacity={0.8}
              >
                <Text style={styles.controlBtnText}>結束</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'finished' && (
            <View style={styles.finishedPanel}>
              <Text style={[styles.finishedTitle, { color: colors.text }]}>跑步完成</Text>
              <View style={styles.finishedStats}>
                <Text style={[styles.finishedStat, { color: colors.textSecondary }]}>
                  {formatDistance(distance)} · {formatDuration(duration)} · {formatPace(pace)} /km
                </Text>
                <Text style={[styles.finishedStat, { color: colors.textSecondary }]}>
                  消耗約 {estimateCalories(distKm)} 大卡
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: colors.text }]}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={[styles.startBtnText, { color: colors.background }]}>返回</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function getDistanceBetween(a: Coord, b: Coord): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
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
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  statsPanel: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  statLabel: { fontSize: 12, fontWeight: '500', marginTop: Spacing.xs },
  statDivider: { width: 1, height: 40 },
  controls: { alignItems: 'center' },
  startBtn: {
    width: '100%',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  startBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  runningControls: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
  controlBtn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  controlBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  finishedPanel: { alignItems: 'center', gap: Spacing.lg, width: '100%' },
  finishedTitle: { fontSize: 24, fontWeight: '800' },
  finishedStats: { alignItems: 'center', gap: Spacing.xs },
  finishedStat: { fontSize: 14 },
});
