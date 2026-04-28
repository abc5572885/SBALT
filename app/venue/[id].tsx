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
  getVenueActivity,
  getVenueBookings,
  getVenueById,
  Venue,
  VenueActivity,
  VenueBooking,
  VenueEvent,
  venueGradientFromId,
} from '@/services/venues';
import { Buddy, getBuddiesAtVenue } from '@/services/buddies';
import { Group } from '@/types/database';
import { formatDateChinese } from '@/utils/dateFormat';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const HCARD_W = 240;

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [venue, setVenue] = useState<Venue | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [activity, setActivity] = useState<VenueActivity | null>(null);
  const [buddiesHere, setBuddiesHere] = useState<Buddy[]>([]);
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
      const [g, b, act, buds] = await Promise.all([
        v.operator_group_id ? getGroupById(v.operator_group_id) : Promise.resolve(null),
        getVenueBookings(v.id, new Date()),
        getVenueActivity(v.id, v.name),
        user ? getBuddiesAtVenue(user.id, v.id, v.name) : Promise.resolve([]),
      ]);
      setGroup(g);
      setBookings(b);
      setActivity(act);
      setBuddiesHere(buds);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

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

  const handleHostHere = () => {
    if (!venue) return;
    router.push({
      pathname: '/event/new',
      params: { venueId: venue.id, venueName: venue.name },
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

  const gradient = venueGradientFromId(venue.id);
  const sportLabels = venue.sport_types.map((k) => SPORT_OPTIONS.find((s) => s.key === k)?.label || k);
  const totalEvents = activity?.totalCount || 0;
  const uniqueParticipants = activity?.uniqueParticipantCount || 0;
  const upcomingEvents = activity?.upcoming || [];
  const pastEvents = activity?.past || [];
  const sportDist = activity?.sportDistribution || [];
  const isOperatorVenue = !!venue.operator_group_id;
  const showBookingButton = isOperatorVenue && venue.hourly_rate !== null;

  return (
    <ScreenLayout scrollable>
      <PageHeader
        title="場地"
        rightContent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
            {isOperator && (
              <TouchableOpacity
                onPress={() => router.push(`/venue/edit/${venue.id}`)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.6}
              >
                <IconSymbol name="pencil" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleShare}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.6}
            >
              <IconSymbol name="paperplane.fill" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Cover */}
      {venue.cover_image_url ? (
        <Image source={{ uri: venue.cover_image_url }} style={styles.cover} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cover}
        >
          <View style={styles.coverOverlay}>
            <IconSymbol name="location.fill" size={36} color="rgba(255,255,255,0.4)" />
          </View>
        </LinearGradient>
      )}

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={[styles.title, { color: colors.text }]}>{venue.name}</Text>
        {sportLabels.length > 0 && (
          <View style={styles.chipRow}>
            {sportLabels.map((label) => (
              <View key={label} style={[styles.sportChip, { backgroundColor: colors.secondary }]}>
                <ThemedText type="label" style={{ color: colors.textSecondary }}>{label}</ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Activity stats — only show if there's activity */}
      {totalEvents > 0 && (
        <View style={[styles.statsCard, { backgroundColor: colors.text }, Shadows.md]}>
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={[styles.statNumber, { color: colors.background }]}>{totalEvents}</Text>
              <Text style={[styles.statLabel, { color: colors.background, opacity: 0.6 }]}>累計場次</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.background, opacity: 0.15 }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statNumber, { color: colors.background }]}>{uniqueParticipants}</Text>
              <Text style={[styles.statLabel, { color: colors.background, opacity: 0.6 }]}>球友參與</Text>
            </View>
            {sportDist.length > 0 && (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.background, opacity: 0.15 }]} />
                <View style={styles.statCell}>
                  <Text style={[styles.statNumber, { color: colors.background }]}>
                    {SPORT_OPTIONS.find((s) => s.key === sportDist[0].sport)?.label || sportDist[0].sport}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.background, opacity: 0.6 }]}>主要運動</Text>
                </View>
              </>
            )}
          </View>
        </View>
      )}

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

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              即將活動 · {upcomingEvents.length}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScrollContent}
          >
            {upcomingEvents.slice(0, 8).map((e) => (
              <UpcomingEventCard key={e.id} event={e} colors={colors} router={router} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Buddies who play here */}
      {buddiesHere.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.md }]}>
            你的球友也來這 · {buddiesHere.length}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScrollContent}
          >
            {buddiesHere.slice(0, 8).map((b) => (
              <TouchableOpacity
                key={b.user_id}
                style={styles.buddyCell}
                onPress={() => router.push({ pathname: '/user/[id]', params: { id: b.user_id } })}
                activeOpacity={0.7}
              >
                {b.avatar_url ? (
                  <Image source={{ uri: b.avatar_url }} style={[styles.buddyAvatar, { borderColor: colors.border }]} />
                ) : (
                  <View style={[styles.buddyAvatar, { backgroundColor: colors.text, borderColor: colors.border }]}>
                    <Text style={{ color: colors.background, fontSize: 22, fontWeight: '800' }}>
                      {(b.display_name || b.username || '?')[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={[styles.buddyName, { color: colors.text }]} numberOfLines={1}>
                  {b.display_name || b.username || '球友'}
                </Text>
                <Text style={[styles.buddyCount, { color: colors.textSecondary }]}>
                  {b.sharedCount} 場同框
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Cold start CTA — no events yet */}
      {totalEvents === 0 && (
        <View style={styles.section}>
          <View style={[styles.coldStartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="bolt.fill" size={28} color={colors.text} />
            <Text style={[styles.coldStartTitle, { color: colors.text }]}>
              還沒人在這辦過活動
            </Text>
            <Text style={[styles.coldStartHint, { color: colors.textSecondary }]}>
              你可以是第一個。揪一場後{'\n'}這裡就會出現活動紀錄、球友、場地王
            </Text>
          </View>
        </View>
      )}

      {/* Address & map */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
        <TouchableOpacity style={styles.infoRow} onPress={handleOpenMap} activeOpacity={0.6}>
          <IconSymbol name="location.fill" size={16} color={colors.text} />
          <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>
            {venue.address}
          </Text>
          <IconSymbol name="chevron.right" size={14} color={colors.disabled} />
        </TouchableOpacity>

        {venue.open_hours && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <IconSymbol name="clock.fill" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoValue, { color: colors.text }]}>{venue.open_hours}</Text>
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
              <IconSymbol name="message.fill" size={16} color={colors.text} />
              <Text style={[styles.infoValue, { color: colors.text }]}>{venue.contact_phone}</Text>
              <IconSymbol name="chevron.right" size={14} color={colors.disabled} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Weekly schedule (operator venues with hours set) */}
      {venue.weekly_schedule && Object.keys(venue.weekly_schedule).length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.md }]}>每週時段</Text>
          <View style={[styles.scheduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {DAY_KEYS.map((day, idx) => {
              const s = venue.weekly_schedule[day];
              return (
                <View
                  key={day}
                  style={[
                    styles.scheduleRow,
                    idx > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <Text style={[styles.scheduleDay, { color: colors.textSecondary }]}>
                    {DAY_LABELS[day]}
                  </Text>
                  <Text style={{ color: s ? colors.text : colors.disabled, fontSize: 14, fontWeight: '500' }}>
                    {s ? `${pad(s.start)}:00 – ${pad(s.end)}:00` : '公休'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Description */}
      {venue.description && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.sm }]}>介紹</Text>
          <Text style={[styles.body, { color: colors.text }]}>{venue.description}</Text>
        </View>
      )}

      {/* Amenities */}
      {venue.amenities.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.sm }]}>設施</Text>
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

      {/* Past events */}
      {pastEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.md }]}>
            過往活動 · {pastEvents.length}
          </Text>
          <View style={{ gap: Spacing.sm }}>
            {pastEvents.slice(0, 5).map((e) => (
              <PastEventRow key={e.id} event={e} colors={colors} router={router} />
            ))}
          </View>
        </View>
      )}

      {/* Bookings (operator venues with hourly_rate) */}
      {showBookingButton && bookings.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.md }]}>
            近期已預約 · {bookings.length}
          </Text>
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
        </View>
      )}

      <View style={{ height: Spacing.xxl }} />

      {/* Bottom CTA */}
      <View style={styles.bottomAction}>
        {isOperator && showBookingButton ? (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.text }, Shadows.md]}
            onPress={() => router.push({ pathname: '/venue/bookings/[id]', params: { id: venue.id } })}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnText, { color: colors.background }]}>管理預約</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ctaCol}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.text }, Shadows.md]}
              onPress={handleHostHere}
              activeOpacity={0.85}
            >
              <IconSymbol name="plus" size={16} color={colors.background} />
              <Text style={[styles.btnText, { color: colors.background }]}>在這裡辦活動</Text>
            </TouchableOpacity>
            {showBookingButton && (
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor: colors.border }]}
                onPress={() => router.push({ pathname: '/venue/book/[id]', params: { id: venue.id } })}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnText, { color: colors.text }]}>預約時段</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}

function UpcomingEventCard({
  event,
  colors,
  router,
}: {
  event: VenueEvent;
  colors: typeof Colors.light;
  router: ReturnType<typeof useRouter>;
}) {
  const date = new Date(event.scheduled_at);
  const dateStr = formatDateChinese(date);
  const timeStr = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  const sportLabel = event.sport_type ? SPORT_OPTIONS.find((s) => s.key === event.sport_type)?.label : null;
  const diffMs = date.getTime() - Date.now();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const countdown = days > 0 ? `${days} 天 ${hours} 小時` : `${hours} 小時`;

  return (
    <TouchableOpacity
      style={[styles.upcomingCard, { backgroundColor: colors.text }, Shadows.md]}
      onPress={() => router.push({ pathname: '/event/detail', params: { eventId: event.id } })}
      activeOpacity={0.85}
    >
      <Text style={[styles.upcomingCountdown, { color: colors.background, opacity: 0.55 }]}>
        {countdown}後
      </Text>
      <Text style={[styles.upcomingTitle, { color: colors.background }]} numberOfLines={2}>
        {event.title}
      </Text>
      <View style={styles.upcomingMeta}>
        <Text style={[styles.upcomingMetaText, { color: colors.background, opacity: 0.7 }]}>
          {dateStr} {timeStr}
        </Text>
        {sportLabel && (
          <Text style={[styles.upcomingMetaText, { color: colors.background, opacity: 0.7 }]}>
            · {sportLabel}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function PastEventRow({
  event,
  colors,
  router,
}: {
  event: VenueEvent;
  colors: typeof Colors.light;
  router: ReturnType<typeof useRouter>;
}) {
  const date = new Date(event.scheduled_at);
  const dateStr = date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' });
  const sportLabel = event.sport_type ? SPORT_OPTIONS.find((s) => s.key === event.sport_type)?.label : null;

  return (
    <TouchableOpacity
      style={[styles.pastRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: '/event/detail', params: { eventId: event.id } })}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.pastTitle, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
        <Text style={[styles.pastMeta, { color: colors.textSecondary }]}>
          {dateStr}
          {sportLabel ? ` · ${sportLabel}` : ''}
        </Text>
      </View>
      <IconSymbol name="chevron.right" size={14} color={colors.disabled} />
    </TouchableOpacity>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  cover: {
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  coverOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: { marginBottom: Spacing.lg, gap: Spacing.sm },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  chipRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  sportChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm },
  // Stats card
  statsCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
    marginHorizontal: Spacing.sm,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Operator
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.lg,
  },
  operatorName: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  // Sections
  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  hScrollContent: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  // Upcoming event card (dark hero style)
  upcomingCard: {
    width: HCARD_W,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  upcomingCountdown: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  upcomingTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginVertical: Spacing.xs,
  },
  upcomingMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  upcomingMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Buddy cells (in venue page)
  buddyCell: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  buddyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buddyName: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginTop: 4,
    textAlign: 'center',
  },
  buddyCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Cold start
  coldStartCard: {
    padding: Spacing.xl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  coldStartTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  coldStartHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  // Info card
  infoCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.md },
  // Schedule
  scheduleCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.lg,
  },
  scheduleDay: {
    fontSize: 13,
    fontWeight: '600',
    width: 56,
  },
  // Past events
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  pastTitle: { fontSize: 14, fontWeight: '600' },
  pastMeta: { fontSize: 12 },
  body: { fontSize: 15, lineHeight: 22 },
  amenityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  amenityText: { fontSize: 13, fontWeight: '500' },
  // Bookings (existing)
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
  // Bottom CTA
  bottomAction: {
    paddingBottom: Spacing.xxl,
  },
  ctaCol: {
    gap: Spacing.sm,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
  },
  btnSecondary: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
