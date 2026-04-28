import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MapUnavailable } from '@/components/MapUnavailable';
import Mapbox, { isMapboxAvailable } from '@/lib/mapbox';
import {
  calculatePace,
  estimateCalories,
  formatDistance,
  formatDuration,
  formatPace,
  saveRun,
} from '@/services/running';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
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
  const params = useLocalSearchParams<{
    targetType?: string;
    targetKm?: string;
    targetHour?: string;
    targetMin?: string;
  }>();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [coords, setCoords] = useState<Coord[]>([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  // Target settings (pre-fill from params if coming from "再跑一次")
  const [targetType, setTargetType] = useState<'none' | 'distance' | 'time'>(
    (params.targetType as any) || 'none'
  );
  const [targetKm, setTargetKm] = useState(params.targetKm || '5');
  const [targetHour, setTargetHour] = useState(params.targetHour || '0');
  const [targetMin, setTargetMin] = useState(params.targetMin || '30');

  const cameraRef = useRef<any>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string>('');
  const lastKmRef = useRef(0); // Track last announced km
  const lastMinRef = useRef(0); // Track last announced minute

  useEffect(() => {
    return () => {
      locationSub.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Voice announcements
  const announce = (text: string) => {
    Speech.speak(text, { language: 'zh-TW', rate: 0.9 });
  };

  // Check milestones for voice
  const checkMilestones = (dist: number, dur: number) => {
    const currentKm = Math.floor(dist / 1000);
    if (currentKm > lastKmRef.current && currentKm > 0) {
      lastKmRef.current = currentKm;
      const pace = calculatePace(dist / 1000, dur);
      const paceMin = Math.floor(pace);
      const paceSec = Math.round((pace - paceMin) * 60);
      announce(`${currentKm}公里，配速${paceMin}分${paceSec}秒`);
    }

    // Every 5 minutes
    const currentMin = Math.floor(dur / 300) * 5;
    if (currentMin > lastMinRef.current && currentMin > 0) {
      lastMinRef.current = currentMin;
      const km = (dist / 1000).toFixed(1);
      announce(`已跑${currentMin}分鐘，距離${km}公里`);
    }

    // Target reached
    const distTarget = parseFloat(targetKm) || 0;
    const timeTarget = (parseInt(targetHour) || 0) * 3600 + (parseInt(targetMin) || 0) * 60;
    if (targetType === 'distance' && distTarget > 0 && dist / 1000 >= distTarget && (dist - 5) / 1000 < distTarget) {
      announce(`恭喜！已達成${distTarget}公里目標`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (targetType === 'time' && timeTarget > 0 && dur >= timeTarget && dur - 1 < timeTarget) {
      const h = Math.floor(timeTarget / 3600);
      const m = Math.floor((timeTarget % 3600) / 60);
      announce(`恭喜！已達成${h > 0 ? h + '小時' : ''}${m}分鐘目標`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

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
    announce('開始跑步');
    setStatus('running');
    setCoords([]);
    setDistance(0);
    setDuration(0);
    lastKmRef.current = 0;
    lastMinRef.current = 0;
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
            setDistance((prevDist) => {
              const newDist = prevDist + d;
              setDuration((dur) => {
                checkMilestones(newDist, dur);
                return dur;
              });
              return newDist;
            });
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
    ? 'mapbox://styles/abc5572885/cmo4dgsy200ba01st1sxsg3ci'
    : 'mapbox://styles/mapbox/outdoors-v12';

  if (!isMapboxAvailable()) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <MapUnavailable />
      </SafeAreaView>
    );
  }

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
                  lineColor: colorScheme === 'dark' ? '#FF9224' : '#2563EB', lineEmissiveStrength: 1,
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
            <>
              {/* Quick links */}
              <View style={styles.quickLinks}>
                <TouchableOpacity
                  style={[styles.quickLink, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push('/sport/plan-route')}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="location.fill" size={16} color={colors.primary} />
                  <Text style={[styles.quickLinkText, { color: colors.text }]}>路線規劃</Text>
                </TouchableOpacity>
              </View>

              {/* Target selector */}
              <View style={styles.targetRow}>
                {(['none', 'distance', 'time'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.targetBtn, targetType === t && { backgroundColor: colors.text }]}
                    onPress={() => setTargetType(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.targetBtnText, { color: targetType === t ? colors.background : colors.textSecondary }]}>
                      {t === 'none' ? '自由跑' : t === 'distance' ? '距離' : '時間'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {targetType === 'distance' && (
                <View style={styles.targetInputRow}>
                  <TextInput
                    style={[styles.targetInput, { color: colors.text, borderColor: colors.border }]}
                    value={targetKm}
                    onChangeText={setTargetKm}
                    keyboardType="decimal-pad"
                    placeholder="5"
                    placeholderTextColor={colors.placeholder}
                  />
                  <Text style={[styles.targetUnit, { color: colors.textSecondary }]}>km</Text>
                </View>
              )}

              {targetType === 'time' && (
                <View style={styles.targetInputRow}>
                  <TextInput
                    style={[styles.targetInput, { color: colors.text, borderColor: colors.border }]}
                    value={targetHour}
                    onChangeText={setTargetHour}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                  />
                  <Text style={[styles.targetUnit, { color: colors.textSecondary }]}>時</Text>
                  <TextInput
                    style={[styles.targetInput, { color: colors.text, borderColor: colors.border }]}
                    value={targetMin}
                    onChangeText={setTargetMin}
                    keyboardType="number-pad"
                    placeholder="30"
                    placeholderTextColor={colors.placeholder}
                  />
                  <Text style={[styles.targetUnit, { color: colors.textSecondary }]}>分</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: colors.statusSuccess }]}
                onPress={startRun}
                activeOpacity={0.8}
              >
                <Text style={styles.startBtnText}>開始跑步</Text>
              </TouchableOpacity>
            </>
          )}

          {status === 'running' && (
            <View style={styles.runningControls}>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.statusWarning }]}
                onPress={pauseRun}
                activeOpacity={0.8}
              >
                <Text style={styles.controlBtnText}>暫停</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.error }]}
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
                style={[styles.controlBtn, { backgroundColor: colors.statusSuccess }]}
                onPress={resumeRun}
                activeOpacity={0.8}
              >
                <Text style={styles.controlBtnText}>繼續</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.error }]}
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
  controls: { alignItems: 'center', gap: Spacing.md },
  quickLinks: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  targetRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  targetBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  targetBtnText: { fontSize: 14, fontWeight: '600' },
  targetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  targetInput: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    width: 80,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
  },
  targetUnit: {
    fontSize: 16,
    fontWeight: '500',
  },
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
