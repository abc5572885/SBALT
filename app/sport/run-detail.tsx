import { PageHeader } from '@/components/PageHeader';
import { RunShareModal } from '@/components/shareCards/RunShareModal';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MapUnavailable } from '@/components/MapUnavailable';
import Mapbox, { isMapboxAvailable } from '@/lib/mapbox';
import { formatDistance, formatDuration, formatPace } from '@/services/running';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function RunDetailScreen() {
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    loadRun();
  }, [runId]);

  const loadRun = async () => {
    try {
      const { data, error } = await supabase.from('runs').select('*').eq('id', runId).single();
      if (data) {
        setRun({
          ...data,
          route: typeof data.route === 'string' ? JSON.parse(data.route) : data.route || [],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!run) return;
    setShareOpen(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <PageHeader title="跑步詳情" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!run) return null;

  const dist = parseFloat(run.distance) || 0;
  const distKm = dist / 1000;
  const route = run.route || [];

  const routeGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: route.length > 1 ? [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: route.map((c: any) => [c.longitude, c.latitude]),
      },
    }] : [],
  };

  const mapStyle = colorScheme === 'dark'
    ? 'mapbox://styles/abc5572885/cmo4dgsy200ba01st1sxsg3ci'
    : 'mapbox://styles/mapbox/outdoors-v12';

  // Bounds
  let mapCenter: [number, number] = [121.0018, 24.8368];
  let bounds: any = undefined;
  if (route.length > 1) {
    const lats = route.map((c: any) => c.latitude);
    const lngs = route.map((c: any) => c.longitude);
    bounds = {
      ne: [Math.max(...lngs) + 0.003, Math.max(...lats) + 0.003] as [number, number],
      sw: [Math.min(...lngs) - 0.003, Math.min(...lats) - 0.003] as [number, number],
    };
    mapCenter = [(bounds.ne[0] + bounds.sw[0]) / 2, (bounds.ne[1] + bounds.sw[1]) / 2];
  }

  const startTime = new Date(run.started_at);

  if (!isMapboxAvailable()) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <PageHeader title="跑步詳情" />
        </View>
        <MapUnavailable />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <PageHeader title="跑步詳情" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Map */}
        <View style={styles.mapContainer}>
          <Mapbox.MapView
            style={styles.map}
            styleURL={mapStyle}
            logoEnabled={false}
            attributionEnabled={false}
            scaleBarEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Mapbox.Camera
              defaultSettings={{ centerCoordinate: mapCenter, zoomLevel: 14 }}
              bounds={bounds ? { ...bounds, paddingTop: 40, paddingBottom: 40, paddingLeft: 40, paddingRight: 40 } : undefined}
            />
            {route.length > 1 && (
              <>
                <Mapbox.ShapeSource id="detail-route" shape={routeGeoJSON}>
                  <Mapbox.LineLayer
                    id="detail-line"
                    slot="top"
                    style={{ lineColor: colorScheme === 'dark' ? '#FF9224' : '#2563EB', lineWidth: 5, lineEmissiveStrength: 1, lineCap: 'round', lineJoin: 'round' }}
                  />
                </Mapbox.ShapeSource>
                <Mapbox.PointAnnotation id="start" coordinate={[route[0].longitude, route[0].latitude]}>
                  <View style={[styles.routeMarker, { backgroundColor: colors.statusSuccess, borderColor: colors.background }]} />
                </Mapbox.PointAnnotation>
                <Mapbox.PointAnnotation id="end" coordinate={[route[route.length - 1].longitude, route[route.length - 1].latitude]}>
                  <View style={[styles.routeMarker, { backgroundColor: colors.error, borderColor: colors.background }]} />
                </Mapbox.PointAnnotation>
              </>
            )}
          </Mapbox.MapView>
        </View>

        {/* Info */}
        <View style={styles.content}>
          {/* Date */}
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.dateText}>
                {startTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              </ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                {startTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })} 開始
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.shareBtn, { backgroundColor: colors.text }]}
              activeOpacity={0.85}
            >
              <IconSymbol name="square.and.arrow.up" size={14} color={colors.background} />
              <Text style={[styles.shareBtnText, { color: colors.background }]}>分享</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginBottom: Spacing.xl }} />

          {/* Main distance */}
          <View style={styles.mainStat}>
            <Text style={[styles.mainDistance, { color: colors.primary }]}>{distKm.toFixed(2)}</Text>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>公里</ThemedText>
          </View>

          {/* Stats grid */}
          <View style={[styles.statsGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.gridItem, styles.gridItemBorderRight, styles.gridItemBorderBottom, { borderRightColor: colors.border, borderBottomColor: colors.border }]}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>時間</ThemedText>
              <Text style={[styles.gridValue, { color: colors.text }]}>{formatDuration(run.duration)}</Text>
            </View>
            <View style={[styles.gridItem, styles.gridItemBorderBottom, { borderBottomColor: colors.border }]}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>平均配速</ThemedText>
              <Text style={[styles.gridValue, { color: colors.text }]}>{formatPace(parseFloat(run.avg_pace || '0'))} /km</Text>
            </View>
            <View style={[styles.gridItem, styles.gridItemBorderRight, { borderRightColor: colors.border }]}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>消耗熱量</ThemedText>
              <Text style={[styles.gridValue, { color: colors.text }]}>{Math.round(parseFloat(run.calories || '0'))} kcal</Text>
            </View>
            <View style={styles.gridItem}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>距離</ThemedText>
              <Text style={[styles.gridValue, { color: colors.text }]}>{formatDistance(dist)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <RunShareModal
        visible={shareOpen}
        run={run ? {
          distance: parseFloat(run.distance) || 0,
          duration: run.duration || 0,
          avg_pace: run.avg_pace ? parseFloat(run.avg_pace) : null,
          calories: run.calories ? parseFloat(run.calories) : null,
          route: run.route || [],
          started_at: run.started_at,
        } : null}
        displayName={user?.displayName || user?.email?.split('@')[0] || '跑者'}
        onClose={() => setShareOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { marginHorizontal: Spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapContainer: { height: 400, width: '100%' },
  map: { flex: 1 },
  content: { padding: Spacing.lg },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: { fontSize: 16, fontWeight: '600' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mainStat: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  mainDistance: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  gridItem: {
    width: '50%',
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  gridItemBorderRight: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  gridItemBorderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  routeMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
  gridValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
