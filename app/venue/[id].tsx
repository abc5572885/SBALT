import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { DAY_KEYS, DAY_LABELS, getAmenityLabel } from '@/constants/venues';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getGroupById } from '@/services/groups';
import {
  getVenueBookings,
  getVenueById,
  Venue,
  VenueBooking,
} from '@/services/venues';
import { Group } from '@/types/database';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [venue, setVenue] = useState<Venue | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const v = await getVenueById(id);
      if (!v) {
        setLoading(false);
        return;
      }
      setVenue(v);
      const [g, b] = await Promise.all([
        getGroupById(v.operator_group_id),
        getVenueBookings(v.id, new Date()),
      ]);
      setGroup(g);
      setBookings(b);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const isOperator = group?.creator_id === user?.id;

  const handleOpenMap = () => {
    if (!venue) return;
    const query = encodeURIComponent(venue.address);
    const url = Platform.select({
      ios: `maps:?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://maps.google.com/?q=${query}`,
    });
    Linking.openURL(url);
  };

  const handleCall = () => {
    if (venue?.contact_phone) {
      Linking.openURL(`tel:${venue.contact_phone}`);
    }
  };

  const handleShare = async () => {
    if (!venue) return;
    await Share.share({
      message: `${venue.name}\n${venue.address}${venue.hourly_rate ? `\n收費 NT$ ${venue.hourly_rate}/小時` : ''}\n\nSBALT 場地：sbalt://open?venue=${venue.id}`,
    });
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="場地" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!venue) {
    return (
      <ScreenLayout>
        <PageHeader title="場地" />
        <View style={styles.center}>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>找不到場地</ThemedText>
        </View>
      </ScreenLayout>
    );
  }

  const sportLabels = venue.sport_types.map((k) => SPORT_OPTIONS.find((s) => s.key === k)?.label || k);

  return (
    <ScreenLayout scrollable>
      <PageHeader
        title="場地"
        rightContent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
            {isOperator && (
              <TouchableOpacity
                onPress={() => router.push(`/venue/edit/${venue.id}`)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
              >
                <IconSymbol name="pencil" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleShare}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}
            >
              <IconSymbol name="paperplane.fill" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Cover */}
      {venue.cover_image_url && (
        <Image source={{ uri: venue.cover_image_url }} style={styles.cover} contentFit="cover" />
      )}

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={[styles.title, { color: colors.text }]}>{venue.name}</Text>
        {sportLabels.length > 0 && (
          <View style={styles.chipRow}>
            {sportLabels.map((label) => (
              <View key={label} style={[styles.sportChip, { backgroundColor: colors.primary + '12' }]}>
                <ThemedText type="label" style={{ color: colors.primary }}>{label}</ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Operator */}
      {group && (
        <TouchableOpacity
          style={[styles.operatorRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>場地方</ThemedText>
            <Text style={[styles.operatorName, { color: colors.text }]}>{group.name}</Text>
          </View>
          <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
        </TouchableOpacity>
      )}

      {/* Info Card */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
        <TouchableOpacity style={styles.infoRow} onPress={handleOpenMap} activeOpacity={0.6}>
          <IconSymbol name="location.fill" size={16} color={colors.primary} />
          <Text style={[styles.infoValue, { color: colors.primary }]} numberOfLines={2}>
            {venue.address}
          </Text>
          <IconSymbol name="chevron.right" size={14} color={colors.disabled} />
        </TouchableOpacity>

        {venue.open_hours && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <IconSymbol name="calendar" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoValue, { color: colors.text }]}>{venue.open_hours}</Text>
            </View>
          </>
        )}

        {venue.weekly_schedule && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
              <IconSymbol name="calendar" size={16} color={colors.textSecondary} />
              <View style={{ flex: 1, gap: 4 }}>
                {DAY_KEYS.map((day) => {
                  const s = venue.weekly_schedule[day];
                  return (
                    <View key={day} style={{ flexDirection: 'row' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 13, width: 40 }}>
                        {DAY_LABELS[day]}
                      </Text>
                      <Text style={{ color: s ? colors.text : colors.disabled, fontSize: 13 }}>
                        {s ? `${pad(s.start)}:00 – ${pad(s.end)}:00` : '公休'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {venue.hourly_rate !== null && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <IconSymbol name="star.fill" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoValue, { color: colors.text }]}>NT$ {venue.hourly_rate} / 小時</Text>
            </View>
          </>
        )}

        {venue.capacity && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <IconSymbol name="person.fill" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoValue, { color: colors.text }]}>可容納 {venue.capacity} 人</Text>
            </View>
          </>
        )}

        {venue.contact_phone && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.infoRow} onPress={handleCall} activeOpacity={0.6}>
              <IconSymbol name="paperplane.fill" size={16} color={colors.primary} />
              <Text style={[styles.infoValue, { color: colors.primary }]}>{venue.contact_phone}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Description */}
      {venue.description && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            介紹
          </ThemedText>
          <Text style={[styles.body, { color: colors.text }]}>{venue.description}</Text>
        </View>
      )}

      {/* Amenities */}
      {venue.amenities.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            設施
          </ThemedText>
          <View style={styles.chipRow}>
            {venue.amenities.map((a) => (
              <View key={a} style={[styles.amenityChip, { borderColor: colors.border }]}>
                <Text style={[styles.amenityText, { color: colors.textSecondary }]}>
                  {getAmenityLabel(a)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Upcoming bookings */}
      <View style={styles.section}>
        <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          近期已預約時段 ({bookings.length})
        </ThemedText>
        {bookings.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: colors.border }]}>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>目前沒有預約，任何時段都可預約</ThemedText>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {bookings.slice(0, 10).map((b) => {
              const startDate = new Date(b.start_time);
              const endDate = new Date(b.end_time);
              const dateStr = startDate.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });
              const timeStr = `${startDate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })} – ${endDate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
              return (
                <View key={b.id} style={[styles.bookingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.bookingDate, { color: colors.text }]}>{dateStr}</Text>
                  <Text style={[styles.bookingTime, { color: colors.textSecondary }]}>{timeStr}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: Spacing.xxl }} />

      {/* Bottom CTA */}
      <View style={styles.bottomAction}>
        {isOperator ? (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }, Shadows.sm]}
            onPress={() => router.push({ pathname: '/venue/bookings/[id]', params: { id: venue.id } })}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>管理預約</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }, Shadows.sm]}
            onPress={() => router.push({ pathname: '/venue/book/[id]', params: { id: venue.id } })}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>預約時段</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScreenLayout>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  cover: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  titleSection: { marginBottom: Spacing.lg, gap: Spacing.sm },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  chipRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  sportChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.lg,
  },
  operatorName: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  infoCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  section: { marginBottom: Spacing.xl },
  sectionLabel: { marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  body: { fontSize: 15, lineHeight: 22 },
  amenityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  amenityText: { fontSize: 13, fontWeight: '500' },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bookingDate: { fontSize: 14, fontWeight: '600' },
  bookingTime: { fontSize: 13 },
  bottomAction: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  btn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
});
