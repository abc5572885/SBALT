import { PageHeader } from '@/components/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/lib/mapbox';
import {
  deleteRun,
  formatDistance,
  formatDuration,
  formatPace,
  getUserRuns,
  getUserRunStats,
} from '@/services/running';
import Mapbox from '@rnmapbox/maps';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function RunRoutePreview({ route, colorScheme }: { route: any[]; colorScheme: string }) {
  if (!route || route.length < 2) return null;

  const geoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: route.map((c: any) => [c.longitude, c.latitude]),
      },
    }],
  };

  // Calculate bounds
  const lats = route.map((c: any) => c.latitude);
  const lngs = route.map((c: any) => c.longitude);
  const bounds = {
    ne: [Math.max(...lngs) + 0.002, Math.max(...lats) + 0.002] as [number, number],
    sw: [Math.min(...lngs) - 0.002, Math.min(...lats) - 0.002] as [number, number],
  };

  return (
    <View style={styles.mapPreview}>
      <Mapbox.MapView
        style={styles.mapPreviewInner}
        styleURL={colorScheme === 'dark' ? 'mapbox://styles/abc5572885/cmo4dgsy200ba01st1sxsg3ci' : 'mapbox://styles/mapbox/outdoors-v12'}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Mapbox.Camera
          defaultSettings={{
            centerCoordinate: [(bounds.ne[0] + bounds.sw[0]) / 2, (bounds.ne[1] + bounds.sw[1]) / 2],
            zoomLevel: 14,
          }}
          bounds={{ ne: bounds.ne, sw: bounds.sw, paddingTop: 20, paddingBottom: 20, paddingLeft: 20, paddingRight: 20 }}
        />
        <Mapbox.ShapeSource id="preview-route" shape={geoJSON}>
          <Mapbox.LineLayer
            id="preview-line" slot="top"
            style={{
              lineColor: colorScheme === 'dark' ? '#FF9224' : '#2563EB',
              lineWidth: 5,
              lineCap: 'round',
              lineJoin: 'round',
              lineEmissiveStrength: 1,
            }}
          />
        </Mapbox.ShapeSource>
        <Mapbox.PointAnnotation id="p-start" coordinate={[route[0].longitude, route[0].latitude]}>
          <View style={styles.startDot} />
        </Mapbox.PointAnnotation>
        <Mapbox.PointAnnotation id="p-end" coordinate={[route[route.length - 1].longitude, route[route.length - 1].latitude]}>
          <View style={styles.endDot} />
        </Mapbox.PointAnnotation>
      </Mapbox.MapView>
    </View>
  );
}

export default function RunHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [runs, setRuns] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalDistance: 0, totalDuration: 0, totalRuns: 0 });

  useFocusEffect(
    useCallback(() => {
      if (user) loadData();
    }, [user])
  );

  const loadData = async () => {
    if (!user) return;
    const [runsData, statsData] = await Promise.all([
      getUserRuns(user.id),
      getUserRunStats(user.id),
    ]);
    setRuns(runsData);
    setStats(statsData);
  };

  const handleDelete = (runId: string) => {
    Alert.alert('刪除紀錄', '確定要刪除這筆跑步紀錄嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: async () => { await deleteRun(runId); loadData(); } },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <PageHeader title="跑步紀錄" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg }}>
        {/* Stats summary */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {(stats.totalDistance / 1000).toFixed(1)}
            </Text>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>總公里</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {stats.totalRuns}
            </Text>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>總次數</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {formatDuration(stats.totalDuration)}
            </Text>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>總時間</ThemedText>
          </View>
        </View>

        {/* Run list */}
        {runs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={{ color: colors.textSecondary }}>尚無跑步紀錄</ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {runs.map((run) => {
              const dist = parseFloat(run.distance) || 0;
              const distKm = dist / 1000;
              return (
                <TouchableOpacity
                  key={run.id}
                  style={[styles.runCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                  onPress={() => router.push({ pathname: '/sport/run-detail', params: { runId: run.id } })}
                  onLongPress={() => handleDelete(run.id)}
                  activeOpacity={0.8}
                >
                  {/* Header: date + user */}
                  <View style={styles.runHeader}>
                    <View>
                      <ThemedText style={styles.runDate}>
                        {new Date(run.started_at).toLocaleDateString('zh-TW', {
                          year: 'numeric', month: 'short', day: 'numeric', weekday: 'short',
                        })}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                        {new Date(run.started_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                      </ThemedText>
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
                  </View>

                  {/* Stats row */}
                  <View style={styles.runStatsRow}>
                    <View style={styles.runStatMain}>
                      <Text style={[styles.runDistance, { color: colors.primary }]}>
                        {distKm.toFixed(2)}
                      </Text>
                      <ThemedText type="caption" style={{ color: colors.textSecondary }}>公里</ThemedText>
                    </View>
                    <View style={styles.runStatSide}>
                      <View style={styles.runStatItem}>
                        <ThemedText type="caption" style={{ color: colors.textSecondary }}>配速</ThemedText>
                        <Text style={[styles.runStatValue, { color: colors.text }]}>
                          {formatPace(parseFloat(run.avg_pace || '0'))}
                        </Text>
                      </View>
                      <View style={styles.runStatItem}>
                        <ThemedText type="caption" style={{ color: colors.textSecondary }}>時間</ThemedText>
                        <Text style={[styles.runStatValue, { color: colors.text }]}>
                          {formatDuration(run.duration)}
                        </Text>
                      </View>
                      {run.calories && (
                        <View style={styles.runStatItem}>
                          <ThemedText type="caption" style={{ color: colors.textSecondary }}>大卡</ThemedText>
                          <Text style={[styles.runStatValue, { color: colors.text }]}>
                            {Math.round(parseFloat(run.calories))}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Route map preview */}
                  <RunRoutePreview route={run.route} colorScheme={colorScheme} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  statNumber: { fontSize: 20, fontWeight: '700' },
  list: { gap: Spacing.lg },
  runCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  runDate: { fontSize: 15, fontWeight: '600' },
  runStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xl,
  },
  runStatMain: {
    gap: Spacing.xs,
  },
  runDistance: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  runStatSide: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  runStatItem: {
    gap: 2,
  },
  runStatValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  mapPreview: {
    height: 180,
    width: '100%',
  },
  mapPreviewInner: {
    flex: 1,
  },
  startDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  endDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  emptyCard: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
