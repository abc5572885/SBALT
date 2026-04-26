import { PageHeader } from '@/components/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getSportConfig, SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/lib/mapbox';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActiveVenue, getNearbyActiveVenues } from '@/services/venues';
import { useAppStore } from '@/store/useAppStore';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const RADIUS_M = 5000;

type MciIconName = 'basketball' | 'volleyball' | 'badminton' | 'run' | 'map-marker';

function getSportIcon(sport: string): MciIconName {
  if (sport === 'basketball') return 'basketball';
  if (sport === 'volleyball') return 'volleyball';
  if (sport === 'badminton') return 'badminton';
  if (sport === 'running') return 'run';
  return 'map-marker'; // 全部模式：通用地點 pin
}

export default function VenuesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { selectedSport } = useAppStore();
  const sportConfig = selectedSport !== 'all' ? getSportConfig(selectedSport) : null;

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [venues, setVenues] = useState<ActiveVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setCoords({ lat: 24.8368, lng: 121.0018 });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  // Re-fetch when coords or selectedSport changes
  useEffect(() => {
    if (!coords) return;
    setLoading(true);
    getNearbyActiveVenues(coords.lat, coords.lng, RADIUS_M, selectedSport)
      .then(setVenues)
      .catch((err) => {
        console.error('getNearbyActiveVenues failed:', err);
        Alert.alert('載入失敗', err.message || '無法取得附近場地');
      })
      .finally(() => setLoading(false));
  }, [coords, selectedSport]);

  const filtered = venues; // server-side filtered already

  const handleSelectMarker = (v: ActiveVenue) => {
    setSelectedId(v.id);
    if (v.latitude && v.longitude) {
      cameraRef.current?.flyTo([v.longitude, v.latitude], 1200);
    }
  };

  const handleVenueTap = (v: ActiveVenue) => {
    router.push({ pathname: '/venue/[id]', params: { id: v.id } });
  };

  const mapStyle = colorScheme === 'dark'
    ? 'mapbox://styles/abc5572885/cmo4dgsy200ba01st1sxsg3ci'
    : 'mapbox://styles/mapbox/outdoors-v12';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <PageHeader title="附近場地" />

      {/* Sport context (driven by global S button) */}
      {sportConfig && (
        <View style={styles.contextRow}>
          <View style={[styles.contextChip, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.contextText, { color: colors.text }]}>
              正在看 · {sportConfig.label}
            </Text>
          </View>
          <Text style={[styles.contextHint, { color: colors.textSecondary }]}>
            點 S 切換運動
          </Text>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        {coords && (
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
                centerCoordinate: [coords.lng, coords.lat],
                zoomLevel: 13,
              }}
            />
            <Mapbox.MarkerView coordinate={[coords.lng, coords.lat]} allowOverlap>
              <View style={[styles.userPin, { backgroundColor: colors.primary, borderColor: '#FFFFFF' }]} />
            </Mapbox.MarkerView>

            {filtered.map((v) => {
              if (!v.latitude || !v.longitude) return null;
              const isSelected = selectedId === v.id;
              const iconName = getSportIcon(selectedSport);
              const isHot = v.upcomingEventCount > 0;
              return (
                <Mapbox.MarkerView key={v.id} coordinate={[v.longitude, v.latitude]} allowOverlap>
                  <TouchableOpacity onPress={() => handleSelectMarker(v)} activeOpacity={0.8}>
                    <View
                      style={[
                        styles.marker,
                        {
                          backgroundColor: isHot ? colors.text : colors.surface,
                          borderColor: isHot ? colors.text : colors.border,
                          transform: [{ scale: isSelected ? 1.18 : 1 }],
                        },
                        Shadows.md,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={iconName}
                        size={18}
                        color={isHot ? '#FFFFFF' : colors.text}
                      />
                    </View>
                  </TouchableOpacity>
                </Mapbox.MarkerView>
              );
            })}
          </Mapbox.MapView>
        )}

        {!coords && (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 13 }}>
              {permissionDenied ? '使用預設位置' : '取得位置中...'}
            </Text>
          </View>
        )}
      </View>

      {/* Venue list */}
      <View style={[styles.listContainer, { borderTopColor: colors.border }]}>
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.text }]}>
            {loading ? '搜尋中...' : `${filtered.length} 個場地`}
          </Text>
          {permissionDenied && (
            <Text style={[styles.permissionHint, { color: colors.textSecondary }]}>
              · 未授權位置
            </Text>
          )}
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {filtered.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <IconSymbol name="map.fill" size={36} color={colors.disabled} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {sportConfig ? `附近還沒${sportConfig.label}活動` : '附近還沒場地'}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                {sportConfig
                  ? '揪一場，這個地點就會出現在地圖上'
                  : '只標記有 SBALT 用戶辦過活動的場地\n建一場活動，地圖上就會出現'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyCta, { backgroundColor: colors.text }, Shadows.sm]}
                onPress={() => router.push('/event/new')}
                activeOpacity={0.85}
              >
                <IconSymbol name="plus" size={14} color={colors.background} />
                <Text style={[styles.emptyCtaText, { color: colors.background }]}>
                  {sportConfig ? `揪一場${sportConfig.label}` : '辦第一場活動'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {filtered.map((v) => {
            const distM = v.distanceMeters;
            const distStr = distM < 1000 ? `${Math.round(distM)} m` : `${(distM / 1000).toFixed(1)} km`;
            const sportLabels = v.eventSportTypes
              .map((k) => SPORT_OPTIONS.find((s) => s.key === k)?.label || k)
              .join('、');
            const isSelected = selectedId === v.id;
            const isHot = v.upcomingEventCount > 0;
            return (
              <TouchableOpacity
                key={v.id}
                style={[
                  styles.venueCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSelected && { borderColor: colors.text, borderWidth: 1.5 },
                  Shadows.sm,
                ]}
                onPress={() => handleVenueTap(v)}
                activeOpacity={0.7}
              >
                <View style={styles.venueRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.venueName, { color: colors.text }]} numberOfLines={1}>
                        {v.name}
                      </Text>
                      {isHot && (
                        <View style={[styles.hotBadge, { backgroundColor: colors.text }]}>
                          <Text style={[styles.hotBadgeText, { color: colors.background }]}>
                            進行中
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={[styles.distance, { color: colors.text }]}>{distStr}</Text>
                      {sportLabels && (
                        <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
                          · {sportLabels}
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.statsRow}>
                      {v.upcomingEventCount > 0 ? (
                        <ThemedText type="caption" style={{ color: colors.text, fontWeight: '600' }}>
                          即將 {v.upcomingEventCount} 場
                        </ThemedText>
                      ) : (
                        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                          曾辦 {v.totalEventCount} 場
                        </ThemedText>
                      )}
                      <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
                        · {v.address}
                      </ThemedText>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  contextChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
  },
  contextText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  contextHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1.1,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  map: { flex: 1 },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
    gap: 4,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  permissionHint: {
    fontSize: 11,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyContainer: {
    paddingTop: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.lg,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  venueCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  venueName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    flex: 1,
  },
  hotBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hotBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  distance: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
});
