import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS, getSportConfig } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUnreadCount } from '@/services/appNotifications';
import { autoExpireEvents, getMyRegisteredEvents, getOpenEvents, getRegistrationCounts } from '@/services/database';
import { getMonthlySummary, MonthlySummary } from '@/services/monthlyStats';
import { useAppStore } from '@/store/useAppStore';
import { Event } from '@/types/database';
import { formatDateChinese } from '@/utils/dateFormat';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HORIZONTAL_CARD_WIDTH = 260;

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedSport } = useAppStore();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [events, setEvents] = React.useState<Event[]>([]);
  const [myNextEvent, setMyNextEvent] = React.useState<Event | null>(null);
  const [regCounts, setRegCounts] = React.useState<Record<string, number>>({});
  const [unread, setUnread] = React.useState(0);
  const [monthly, setMonthly] = React.useState<MonthlySummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    loadData();
  }, [selectedSport]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setError(false);
      await autoExpireEvents();
      const data = await getOpenEvents();
      setEvents(data);
      if (data.length > 0) {
        const counts = await getRegistrationCounts(data.map((e) => e.id));
        setRegCounts(counts);
      }
      if (user) {
        getMyRegisteredEvents(user.id).then((myEvents) => {
          const upcoming = myEvents.find((e) => new Date(e.scheduled_at) > new Date());
          setMyNextEvent(upcoming || null);
        }).catch(() => {});
        getUnreadCount(user.id).then(setUnread).catch(() => {});
        getMonthlySummary(user.id, selectedSport).then(setMonthly).catch(() => {});
      }
    } catch (err) {
      console.error('載入資料失敗:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredEvents = selectedSport === 'all'
    ? events
    : events.filter((e) => e.sport_type === selectedSport);

  // 推薦活動：依 selectedSport 過濾後最早的 8 筆（橫向 scroll 用）
  const recommendedEvents = filteredEvents.slice(0, 8);

  const sportLabel = selectedSport !== 'all' ? getSportConfig(selectedSport).label : null;
  const displayName = user?.displayName || user?.email?.split('@')[0] || '球友';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" />
          <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.md }}>
            載入中...
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={{ color: colors.textSecondary, marginBottom: Spacing.lg }}>
            載入失敗，請檢查網路連線
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => { setLoading(true); loadData(); }}
          >
            <ThemedText style={{ color: colors.primaryText, fontWeight: '600' }}>重試</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  // ─── Hero card (永不空) ──────────────────────────────────────
  const renderHero = () => {
    if (myNextEvent) {
      const sportName = SPORT_OPTIONS.find((s) => s.key === myNextEvent.sport_type)?.label || '';
      const count = regCounts[myNextEvent.id] || 0;
      const diffMs = new Date(myNextEvent.scheduled_at).getTime() - Date.now();
      const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const countdown = days > 0 ? `還有 ${days} 天 ${hours} 小時` : `還有 ${hours} 小時`;

      return (
        <TouchableOpacity
          style={[styles.heroCard, { backgroundColor: colors.text }, Shadows.md]}
          onPress={() => router.push({ pathname: '/event/detail', params: { eventId: myNextEvent.id } })}
          activeOpacity={0.85}
        >
          <View style={styles.heroTopRow}>
            <Text style={[styles.heroLabel, { color: colors.background, opacity: 0.55 }]}>下一場</Text>
            {sportName && (
              <View style={[styles.heroSportPill, { backgroundColor: colors.background + '25' }]}>
                <Text style={[styles.heroSportText, { color: colors.background }]}>{sportName}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.heroTitle, { color: colors.background }]} numberOfLines={1}>
            {myNextEvent.title}
          </Text>
          <Text style={[styles.heroMeta, { color: colors.background, opacity: 0.7 }]} numberOfLines={1}>
            {formatDateChinese(new Date(myNextEvent.scheduled_at))} · {myNextEvent.location}
          </Text>
          <View style={[styles.heroBottomRow, { borderTopColor: colors.background + '25' }]}>
            <View style={styles.heroBottomItem}>
              <IconSymbol name="person.fill" size={13} color={colors.background} />
              <Text style={[styles.heroBottomText, { color: colors.background }]}>
                {count}/{myNextEvent.quota} 人
              </Text>
            </View>
            <View style={styles.heroBottomItem}>
              <IconSymbol name="clock.fill" size={13} color={colors.background} />
              <Text style={[styles.heroBottomText, { color: colors.background }]}>{countdown}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // CTA fallback：沒下場活動
    const isRun = selectedSport === 'running';
    return (
      <TouchableOpacity
        style={[styles.heroCtaCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() => router.push(isRun ? '/sport/run' : '/event/new')}
        activeOpacity={0.7}
      >
        <View style={[styles.heroCtaIcon, { backgroundColor: colors.secondary }]}>
          <IconSymbol name={isRun ? 'bolt.fill' : 'plus'} size={22} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroCtaTitle, { color: colors.text }]}>
            {isRun ? '今天還沒跑' : '還沒下一場活動'}
          </Text>
          <Text style={[styles.heroCtaSub, { color: colors.textSecondary }]}>
            {isRun ? '出門五公里，回來再說' : '揪一場，朋友的時間表才能對齊'}
          </Text>
        </View>
        <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
      </TouchableOpacity>
    );
  };

  // ─── Recommended events (橫向) ────────────────────────────
  const renderRecommendedCard = (evt: Event) => {
    const sportName = SPORT_OPTIONS.find((s) => s.key === evt.sport_type)?.label || '';
    const count = regCounts[evt.id] || 0;
    return (
      <TouchableOpacity
        key={evt.id}
        style={[styles.hCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
        onPress={() => router.push({ pathname: '/event/detail', params: { eventId: evt.id } })}
        activeOpacity={0.7}
      >
        {evt.image_url ? (
          <Image source={{ uri: evt.image_url }} style={styles.hCardImage} />
        ) : (
          <View style={[styles.hCardImage, { backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }]}>
            <IconSymbol name="sportscourt.fill" size={32} color={colors.disabled} />
          </View>
        )}
        <View style={styles.hCardBody}>
          <View style={styles.hCardTopRow}>
            {sportName && (
              <View style={[styles.hSportPill, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.hSportText, { color: colors.text }]}>{sportName}</Text>
              </View>
            )}
            <Text style={[styles.hCardCount, { color: colors.textSecondary }]}>
              {count}/{evt.quota}
            </Text>
          </View>
          <Text style={[styles.hCardTitle, { color: colors.text }]} numberOfLines={1}>
            {evt.title}
          </Text>
          <Text style={[styles.hCardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {formatDateChinese(new Date(evt.scheduled_at))}
          </Text>
          <Text style={[styles.hCardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {evt.location}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── 月戰績 widget ────────────────────────────────────────
  const renderMonthlyWidget = () => {
    if (!monthly) return null;

    if (monthly.games === 0) {
      // CTA fallback：N=0
      const isRun = selectedSport === 'running';
      return (
        <TouchableOpacity
          style={[styles.statsWidget, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => router.push(isRun ? '/(tabs)/settings' : '/check-in/new')}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.statsWidgetLabel, { color: colors.textSecondary }]}>本月戰績</Text>
            <Text style={[styles.statsWidgetEmpty, { color: colors.text }]}>還沒紀錄</Text>
            <Text style={[styles.statsWidgetSub, { color: colors.textSecondary }]}>
              {isRun ? '同步 Apple Health →' : '打第一張卡 →'}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
        </TouchableOpacity>
      );
    }

    const deltaArrow = monthly.delta > 0 ? '↑' : monthly.delta < 0 ? '↓' : '→';
    const deltaColor = monthly.delta > 0 ? colors.statusSuccess : monthly.delta < 0 ? colors.error : colors.textSecondary;
    const sportName = monthly.sportLabel
      ? SPORT_OPTIONS.find((s) => s.key === monthly.sportLabel)?.label
      : null;

    return (
      <TouchableOpacity
        style={[styles.statsWidget, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() => router.push('/(tabs)/calendar')}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.statsWidgetLabel, { color: colors.textSecondary }]}>本月戰績</Text>
          <View style={styles.statsWidgetMain}>
            <Text style={[styles.statsWidgetGames, { color: colors.text }]}>
              {monthly.games}
            </Text>
            <Text style={[styles.statsWidgetGamesUnit, { color: colors.textSecondary }]}>場</Text>
            {sportName && (
              <Text style={[styles.statsWidgetSportTag, { color: colors.textSecondary }]}>
                · {sportName}
              </Text>
            )}
            {monthly.mainStat && (
              <Text style={[styles.statsWidgetSportTag, { color: colors.textSecondary }]}>
                · {monthly.mainStat.value} {monthly.mainStat.label}
              </Text>
            )}
          </View>
          {monthly.delta !== 0 && (
            <Text style={[styles.statsWidgetDelta, { color: deltaColor }]}>
              比上月 {monthly.delta > 0 ? '+' : ''}{monthly.delta} {deltaArrow}
            </Text>
          )}
        </View>
        <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
      </TouchableOpacity>
    );
  };

  // ─── Quick actions ────────────────────────────────────────
  const isRunningMode = selectedSport === 'running';
  const hasTacticalBoard = selectedSport === 'basketball' || selectedSport === 'volleyball';
  const quickActions = isRunningMode
    ? [
        { icon: 'plus' as const, label: '揪跑團', onPress: () => router.push('/event/new') },
        { icon: 'location.fill' as const, label: '附近場地', onPress: () => router.push('/event/venues') },
        { icon: 'map.fill' as const, label: '路線規劃', onPress: () => router.push('/sport/plan-route') },
        { icon: 'chart.bar.fill' as const, label: '跑步紀錄', onPress: () => router.push('/sport/run-history') },
      ]
    : [
        { icon: 'plus' as const, label: '舉辦活動', onPress: () => router.push('/event/new') },
        { icon: 'location.fill' as const, label: '附近場地', onPress: () => router.push('/event/venues') },
        { icon: 'checkmark.circle' as const, label: '打卡', onPress: () => router.push('/check-in/new') },
        hasTacticalBoard
          ? {
              icon: 'sportscourt.fill' as const,
              label: '戰術板',
              onPress: () => router.push({ pathname: '/sport/board', params: { type: selectedSport } }),
            }
          : {
              icon: 'medal.fill' as const,
              label: '歷史戰績',
              onPress: () => router.push('/event/history'),
            },
      ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.brand, { color: colors.text }]}>SBALT</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ position: 'relative' }}
            >
              <IconSymbol name="envelope.fill" size={22} color={colors.textSecondary} />
              {unread > 0 && (
                <View style={[styles.unreadDot, { backgroundColor: colors.error }]}>
                  <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.7}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatar, { backgroundColor: colors.text }]}>
                  <Text style={[styles.headerAvatarText, { color: colors.background }]}>
                    {(user?.displayName || user?.email)?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Greeting */}
          <View style={styles.greetingBlock}>
            <Text style={[styles.greetingName, { color: colors.text }]}>{displayName}</Text>
            {sportLabel && (
              <Text style={[styles.greetingSport, { color: colors.primary }]}>
                正在看 {sportLabel}
              </Text>
            )}
          </View>

          {/* Hero card (A 元素，永不空) */}
          {renderHero()}

          {/* Quick actions */}
          <View style={styles.quickActions}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.qaButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <IconSymbol name={action.icon} size={22} color={colors.text} />
                <Text style={[styles.qaLabel, { color: colors.text }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recommended events 橫向 scroll */}
          {recommendedEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>推薦給你</Text>
                {recommendedEvents.length >= 5 && (
                  <Text style={[styles.sectionMore, { color: colors.textSecondary }]}>← 滑動</Text>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: Spacing.lg, gap: Spacing.md }}
              >
                {recommendedEvents.map(renderRecommendedCard)}
              </ScrollView>
            </View>
          )}

          {/* 月戰績 widget (B 元素) */}
          <View style={{ marginTop: Spacing.lg }}>{renderMonthlyWidget()}</View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  scrollView: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  brand: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 14, fontWeight: '700' },
  unreadDot: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  // Greeting + chip
  greetingBlock: { marginBottom: Spacing.lg, gap: Spacing.sm },
  greetingName: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  greetingSport: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },

  // Hero
  heroCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
    gap: 6,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroSportPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  heroSportText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: Spacing.xs },
  heroMeta: { fontSize: 13, marginTop: 2 },
  heroBottomRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  heroBottomItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroBottomText: { fontSize: 12, fontWeight: '600' },

  // Hero CTA fallback
  heroCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    marginBottom: Spacing.xl,
  },
  heroCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCtaTitle: { fontSize: 16, fontWeight: '700' },
  heroCtaSub: { fontSize: 12, marginTop: 2 },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  qaButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: 4,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  qaLabel: { fontSize: 12, fontWeight: '600' },

  // Section
  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  sectionMore: { fontSize: 12, fontWeight: '600' },

  // Horizontal card
  hCard: {
    width: HORIZONTAL_CARD_WIDTH,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  hCardImage: { width: '100%', height: 130 },
  hCardBody: { padding: Spacing.md, gap: 4 },
  hCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hSportPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  hSportText: { fontSize: 11, fontWeight: '700' },
  hCardCount: { fontSize: 11, fontWeight: '600' },
  hCardTitle: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  hCardMeta: { fontSize: 12 },

  // Stats widget
  statsWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statsWidgetLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statsWidgetMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  statsWidgetGames: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  statsWidgetGamesUnit: { fontSize: 13, fontWeight: '600' },
  statsWidgetSportTag: { fontSize: 13, fontWeight: '500' },
  statsWidgetDelta: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  statsWidgetEmpty: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  statsWidgetSub: { fontSize: 12, marginTop: 4 },

  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
  },
});
