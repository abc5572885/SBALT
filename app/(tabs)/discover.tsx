import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getActivePromotions } from '@/services/promotions';
import { getProfile, getProfilesByIds, AccountType } from '@/services/profile';
import { getPublicTournaments, Tournament } from '@/services/tournaments';
import { getPublicVenues, Venue } from '@/services/venues';
import { getStatusLabel } from '@/constants/tournaments';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Promotion } from '@/types/database';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { deletePromotion } from '@/services/promotions';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPE_CONFIG = {
  venue: { label: '場地', icon: 'location.fill' as const },
  brand: { label: '品牌', icon: 'star.fill' as const },
} as const;

export default function DiscoverScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [publishers, setPublishers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'tournament' | 'venue' | 'brand'>('all');
  const [accountType, setAccountType] = useState<AccountType>('regular');

  useFocusEffect(
    useCallback(() => {
      loadPromotions();
      if (user) {
        getProfile(user.id).then((p) => {
          if (p) setAccountType(p.account_type);
        }).catch(() => {});
      }
    }, [user])
  );

  const loadPromotions = async () => {
    try {
      const [promoData, tournamentData, venueData] = await Promise.all([
        getActivePromotions(),
        getPublicTournaments({ limit: 20 }),
        getPublicVenues({ limit: 20 }),
      ]);
      setPromotions(promoData);
      setTournaments(tournamentData);
      setVenues(venueData);

      // Load publisher names
      const userIds = [...new Set(promoData.map((p) => p.user_id))];
      if (userIds.length > 0) {
        const profiles = await getProfilesByIds(userIds);
        const names: Record<string, string> = {};
        Object.values(profiles).forEach((p) => {
          names[p.id] = p.display_name || p.username || '官方';
        });
        setPublishers(names);
      }
    } catch (error) {
      console.error('載入推廣資訊失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 篩掉舊的 event 類型（已合併到 tournaments）；venue 促銷類也改用真實 venues 資料
  const visiblePromotions = promotions.filter((p) => p.type !== 'event' && p.type !== 'venue');
  const filtered = activeTab === 'all'
    ? visiblePromotions
    : activeTab === 'tournament' || activeTab === 'venue'
      ? []
      : visiblePromotions.filter((p) => p.type === activeTab);

  const featured = filtered.filter((p) => p.is_featured);
  const regular = filtered.filter((p) => !p.is_featured);
  const showTournaments = activeTab === 'all' || activeTab === 'tournament';
  const showVenues = activeTab === 'all' || activeTab === 'venue';
  const hasAnyContent =
    (showTournaments && tournaments.length > 0) ||
    (showVenues && venues.length > 0) ||
    filtered.length > 0;

  const handlePress = async (item: Promotion) => {
    if (item.link_url && /^https?:\/\//.test(item.link_url)) {
      const supported = await Linking.canOpenURL(item.link_url);
      if (supported) {
        Linking.openURL(item.link_url);
      }
    }
  };

  const handleEdit = (item: Promotion) => {
    router.push({
      pathname: '/promotion/new',
      params: {
        editId: item.id,
        editType: item.type,
        editTitle: item.title,
        editDescription: item.description || '',
        editLocation: item.location || '',
        editLinkUrl: item.link_url || '',
        editSportType: item.sport_type || '',
        editImageUrl: item.image_url || '',
      },
    });
  };

  const handleDelete = (item: Promotion) => {
    Alert.alert('確認刪除', `確定要刪除「${item.title}」嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePromotion(item.id);
            setPromotions((prev) => prev.filter((p) => p.id !== item.id));
          } catch {
            Alert.alert('錯誤', '刪除失敗');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>發現</Text>
          {accountType === 'official' && (
            <TouchableOpacity
              style={[styles.publishBtn, { backgroundColor: colors.text }, Shadows.sm]}
              onPress={() => router.push('/promotion/new')}
              activeOpacity={0.8}
            >
              <IconSymbol name="plus" size={14} color={colors.background} />
              <Text style={[styles.publishBtnText, { color: colors.background }]}>發布</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabRow}
        >
          {(['all', 'tournament', 'venue', 'brand'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { backgroundColor: colors.text }]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? colors.background : colors.textSecondary },
              ]}>
                {tab === 'all' ? '全部' : tab === 'tournament' ? '比賽' : TYPE_CONFIG[tab].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : !hasAnyContent ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="magnifyingglass" size={40} color={colors.disabled} />
            <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.md }}>
              {activeTab === 'tournament' ? '目前沒有進行中的比賽' : '目前沒有推廣資訊'}
            </ThemedText>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Tournaments */}
            {showTournaments && tournaments.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>進行中的比賽</ThemedText>
                {tournaments.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    colors={colors}
                    onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: t.id } })}
                  />
                ))}
              </View>
            )}

            {/* Venues */}
            {showVenues && venues.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>可預約場地</ThemedText>
                {venues.map((v) => (
                  <VenueCard
                    key={v.id}
                    venue={v}
                    colors={colors}
                    onPress={() => router.push({ pathname: '/venue/[id]', params: { id: v.id } })}
                  />
                ))}
              </View>
            )}

            {/* Featured */}
            {featured.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>精選推薦</ThemedText>
                {featured.map((item) => (
                  <PromotionCard
                    key={item.id}
                    item={item}
                    publisher={publishers[item.user_id]}
                    colors={colors}
                    onPress={() => handlePress(item)}
                    isOwner={user?.id === item.user_id}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDelete(item)}
                    featured
                  />
                ))}
              </View>
            )}

            {/* Regular */}
            {regular.length > 0 && (
              <View style={styles.section}>
                {featured.length > 0 && (
                  <ThemedText type="subtitle" style={styles.sectionTitle}>最新資訊</ThemedText>
                )}
                {regular.map((item) => (
                  <PromotionCard
                    key={item.id}
                    item={item}
                    publisher={publishers[item.user_id]}
                    colors={colors}
                    onPress={() => handlePress(item)}
                    isOwner={user?.id === item.user_id}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
              </View>
            )}

            {/* Brand partnership CTA */}
            <View style={[styles.ctaSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ThemedText type="label" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                想在這裡展示您的賽事或場地？
              </ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                申請成為官方帳號即可發布推廣資訊
              </ThemedText>
            </View>

            <View style={{ height: Spacing.xxl }} />
          </ScrollView>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

function TournamentCard({
  tournament,
  colors,
  onPress,
}: {
  tournament: Tournament;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  const sportLabel = SPORT_OPTIONS.find((s) => s.key === tournament.sport_type)?.label || '';
  const startStr = new Date(tournament.start_date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
  const deadlineStr = tournament.registration_deadline
    ? new Date(tournament.registration_deadline).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {tournament.cover_image_url && (
        <Image source={{ uri: tournament.cover_image_url }} style={styles.cardImage} contentFit="cover" />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, { backgroundColor: colors.statusSuccess + '15' }]}>
            <IconSymbol name="star.fill" size={11} color={colors.statusSuccess} />
            <ThemedText type="label" style={{ color: colors.statusSuccess }}>
              {getStatusLabel(tournament.status)}
            </ThemedText>
          </View>
          {tournament.entry_fee > 0 ? (
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
              NT$ {tournament.entry_fee}
            </Text>
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>免費</Text>
          )}
        </View>

        <Text style={[styles.cardTitle, { color: colors.text }]}>{tournament.title}</Text>

        {tournament.prize_pool && (
          <ThemedText type="caption" style={{ color: colors.primary }} numberOfLines={1}>
            獎金：{tournament.prize_pool}
          </ThemedText>
        )}

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <IconSymbol name="calendar" size={12} color={colors.textSecondary} />
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>
              {startStr}
              {deadlineStr && ` · 截止 ${deadlineStr}`}
            </ThemedText>
          </View>
          <View style={styles.metaItem}>
            <IconSymbol name="location.fill" size={12} color={colors.textSecondary} />
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>
              {tournament.location}
            </ThemedText>
          </View>
          {sportLabel && (
            <View style={styles.metaItem}>
              <IconSymbol name="sportscourt.fill" size={12} color={colors.textSecondary} />
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>{sportLabel}</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.linkHint}>
          <ThemedText type="caption" style={{ color: colors.primary }}>查看賽事</ThemedText>
          <IconSymbol name="chevron.right" size={12} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function VenueCard({
  venue,
  colors,
  onPress,
}: {
  venue: Venue;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  const sportLabels = venue.sport_types.map((k) => SPORT_OPTIONS.find((s) => s.key === k)?.label || k).join('、');

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {venue.cover_image_url && (
        <Image source={{ uri: venue.cover_image_url }} style={styles.cardImage} contentFit="cover" />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
            <IconSymbol name="location.fill" size={11} color={colors.primary} />
            <ThemedText type="label" style={{ color: colors.primary }}>場地</ThemedText>
          </View>
          {venue.hourly_rate !== null && (
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
              NT$ {venue.hourly_rate}/hr
            </Text>
          )}
        </View>

        <Text style={[styles.cardTitle, { color: colors.text }]}>{venue.name}</Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <IconSymbol name="location.fill" size={12} color={colors.textSecondary} />
            <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {venue.address}
            </ThemedText>
          </View>
          {sportLabels && (
            <View style={styles.metaItem}>
              <IconSymbol name="sportscourt.fill" size={12} color={colors.textSecondary} />
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>{sportLabels}</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.linkHint}>
          <ThemedText type="caption" style={{ color: colors.primary }}>查看場地</ThemedText>
          <IconSymbol name="chevron.right" size={12} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PromotionCard({
  item,
  publisher,
  colors,
  onPress,
  isOwner,
  onEdit,
  onDelete,
  featured,
}: {
  item: Promotion;
  publisher?: string;
  colors: typeof Colors.light;
  onPress: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  featured?: boolean;
}) {
  const typeConfig = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.brand;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        Shadows.sm,
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
              <IconSymbol name={typeConfig.icon} size={11} color={colors.primary} />
              <ThemedText type="label" style={{ color: colors.primary }}>{typeConfig.label}</ThemedText>
            </View>
            {featured && (
              <View style={[styles.featuredBadge, { backgroundColor: colors.text }]}>
                <Text style={[styles.featuredText, { color: colors.background }]}>精選</Text>
              </View>
            )}
          </View>

          <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>

          {item.description && (
            <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={2}>
              {item.description}
            </ThemedText>
          )}

          <View style={styles.cardMeta}>
            {item.location && (
              <View style={styles.metaItem}>
                <IconSymbol name="location.fill" size={12} color={colors.textSecondary} />
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>{item.location}</ThemedText>
              </View>
            )}
            {publisher && (
              <View style={styles.metaItem}>
                <IconSymbol name="person.fill" size={12} color={colors.textSecondary} />
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>{publisher}</ThemedText>
              </View>
            )}
          </View>

          {item.link_url && /^https?:\/\//.test(item.link_url) && (
            <View style={styles.linkHint}>
              <ThemedText type="caption" style={{ color: colors.primary }}>查看詳情</ThemedText>
              <IconSymbol name="chevron.right" size={12} color={colors.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {isOwner && (
        <View style={[styles.ownerActions, { borderTopColor: colors.border }]}>
          {onEdit && (
            <TouchableOpacity style={styles.ownerBtn} onPress={onEdit} activeOpacity={0.7}>
              <IconSymbol name="pencil" size={14} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>編輯</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={styles.ownerBtn} onPress={onDelete} activeOpacity={0.7}>
              <IconSymbol name="trash" size={14} color={colors.error} />
              <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600' }}>刪除</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  publishBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabScroll: {
    flexGrow: 0,
    marginBottom: Spacing.lg,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardBody: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  featuredBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  linkHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.xs,
  },
  ownerActions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ownerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  ctaSection: {
    padding: Spacing.xxl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
});
