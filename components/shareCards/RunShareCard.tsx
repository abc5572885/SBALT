import { MAPBOX_TOKEN } from '@/lib/mapbox';
import { encodePolyline, simplifyRoute } from '@/utils/polyline';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const CARD_WIDTH = 360;
const CARD_HEIGHT = 640;
const MAP_HEIGHT = 320;

interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp?: number;
}

export interface RunCardData {
  distance: number; // meters
  duration: number; // seconds
  avg_pace: number | null; // min/km
  calories: number | null;
  route: Coordinate[];
  started_at: string; // ISO
}

interface Props {
  run: RunCardData;
  displayName: string;
  onMapReady?: () => void;
}

const ACCENT = '#3B82F6';
const ACCENT_SOFT = '#60A5FA';

// ─── Helpers ────────────────────────────────────────────────

function formatDist(meters: number): string {
  return (meters / 1000).toFixed(2);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  return `${m}'${String(s).padStart(2, '0')}"`;
}

function formatPace(pace: number): string {
  if (!pace || !isFinite(pace)) return "--'--\"";
  const m = Math.floor(pace);
  const s = Math.floor((pace - m) * 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} · ${hh}:${min}`;
}

/**
 * Build Mapbox Static Images API URL with route overlay.
 * Returns null if no route or if URL would be too long.
 */
function buildMapUrl(route: Coordinate[]): string | null {
  if (!route || route.length < 2 || !MAPBOX_TOKEN) return null;

  // Simplify to keep URL within ~8KB limit
  const simplified = simplifyRoute(route, 0.00008);
  const encoded = encodePolyline(simplified);
  const polyline = encodeURIComponent(encoded);

  const path = `path-4+${ACCENT.replace('#', '')}-1(${polyline})`;
  // Use Mapbox dark style for better contrast with our bg
  const style = 'mapbox/dark-v11';
  const width = CARD_WIDTH;
  const height = MAP_HEIGHT;

  // auto = automatic fit to overlay with padding
  const url = `https://api.mapbox.com/styles/v1/${style}/static/${path}/auto/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}&padding=40`;

  if (url.length > 8000) return null;
  return url;
}

// ─── Component ──────────────────────────────────────────────

export const RunShareCard = forwardRef<View, Props>(({ run, displayName, onMapReady }, ref) => {
  const mapUrl = buildMapUrl(run.route);

  React.useEffect(() => {
    // Notify ready immediately if no map URL (no waiting needed)
    if (!mapUrl) onMapReady?.();
  }, [mapUrl, onMapReady]);

  const distanceKm = formatDist(run.distance);
  const duration = formatDuration(run.duration);
  const pace = formatPace(run.avg_pace || 0);
  const cal = run.calories ? Math.round(run.calories) : 0;

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      {/* Map area (top half) */}
      <View style={styles.mapArea}>
        {mapUrl ? (
          <Image
            source={{ uri: mapUrl }}
            style={styles.mapImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            onLoad={() => onMapReady?.()}
          />
        ) : (
          <LinearGradient
            colors={['#0A1B40', '#0F2A55', '#1A3A75']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {/* Bottom fade — blend map into card body */}
        <LinearGradient
          colors={['transparent', 'rgba(5, 12, 32, 0.5)', '#050C20']}
          locations={[0, 0.6, 1]}
          style={styles.mapFade}
        />
        {/* Top overlay row */}
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <View style={[styles.brandDot, { backgroundColor: ACCENT_SOFT }]} />
            <Text style={styles.brandText}>SBALT</Text>
          </View>
          <Text style={styles.tagText}>跑步紀錄</Text>
        </View>
      </View>

      {/* Body area (bottom half) */}
      <View style={styles.body}>
        {/* Hero distance */}
        <View style={styles.heroBlock}>
          <View style={styles.heroNumberRow}>
            <Text style={[styles.heroValue, { color: '#FFFFFF' }]} numberOfLines={1} adjustsFontSizeToFit>
              {distanceKm}
            </Text>
            <Text style={styles.heroUnit}>KM</Text>
          </View>
          <Text style={styles.heroLabel}>DISTANCE</Text>
        </View>

        {/* Secondary stats */}
        <View style={styles.secondaryRow}>
          <View style={styles.secondaryCell}>
            <Text style={styles.secondaryValue}>{duration}</Text>
            <Text style={styles.secondaryLabel}>TIME</Text>
          </View>
          <View style={[styles.secondaryDivider, { backgroundColor: '#FFFFFF20' }]} />
          <View style={styles.secondaryCell}>
            <Text style={styles.secondaryValue}>{pace}</Text>
            <Text style={styles.secondaryLabel}>PACE /KM</Text>
          </View>
          <View style={[styles.secondaryDivider, { backgroundColor: '#FFFFFF20' }]} />
          <View style={styles.secondaryCell}>
            <Text style={styles.secondaryValue}>{cal}</Text>
            <Text style={styles.secondaryLabel}>KCAL</Text>
          </View>
        </View>

        {/* Bottom info */}
        <View style={styles.bottomBlock}>
          <View style={[styles.divider, { backgroundColor: ACCENT + '60' }]} />
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.metaLine} numberOfLines={1}>
            {formatDate(run.started_at)}
          </Text>
          <View style={styles.bottomTagRow}>
            <View style={[styles.sportPill, { borderColor: ACCENT + '70', backgroundColor: ACCENT + '15' }]}>
              <Text style={[styles.sportPillText, { color: ACCENT_SOFT }]}>RUNNING</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

RunShareCard.displayName = 'RunShareCard';

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#050C20',
  },
  mapArea: {
    width: '100%',
    height: MAP_HEIGHT,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  topRow: {
    position: 'absolute',
    top: 28,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    opacity: 0.7,
  },
  body: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 8,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  heroBlock: {
    alignItems: 'flex-start',
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  heroValue: {
    fontSize: 88,
    fontWeight: '900',
    letterSpacing: -4,
    lineHeight: 92,
    includeFontPadding: false,
  },
  heroUnit: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    opacity: 0.7,
  },
  heroLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 6,
    opacity: 0.55,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  secondaryCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  secondaryValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  secondaryLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    opacity: 0.5,
  },
  secondaryDivider: {
    width: 1,
    height: 32,
  },
  bottomBlock: {
    gap: 4,
  },
  divider: {
    height: 1,
    width: 48,
    marginBottom: 12,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metaLine: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.5,
  },
  bottomTagRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  sportPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  sportPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
