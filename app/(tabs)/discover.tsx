import { EmptyState } from '@/components/EmptyState';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getActivePromotions } from '@/services/promotions';
import { getMyOwnedGroupIds } from '@/services/groups';
import { AccountType, getProfile, getProfilesByIds, OfficialKind } from '@/services/profile';
import { deleteTournament, getPublicTournaments, Tournament } from '@/services/tournaments';
import { deleteVenue, getPublicVenues, Venue } from '@/services/venues';
import { getStatusLabel } from '@/constants/tournaments';
import { SPORT_OPTIONS } from '@/constants/sports';
import { parseRegion, REGION_GROUPS } from '@/constants/regions';
import { Promotion } from '@/types/database';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { deletePromotion } from '@/services/promotions';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HCARD_W = 260;

const TYPE_CONFIG = {
  venue: { label: '場地', icon: 'location.fill' as const },
  brand: { label: '品牌', icon: 'star.fill' as const },
} as const;

type Tab = 'all' | 'tournament' | 'venue' | 'brand';

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
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [accountType, setAccountType] = useState<AccountType>('regular');
  const [officialKinds, setOfficialKinds] = useState<OfficialKind[]>([]);
  const [ownedGroupIds, setOwnedGroupIds] = useState<Set<string>>(new Set());
  const [myRegion, setMyRegion] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPromotions();
      if (user) {
        getProfile(user.id).then((p) => {
          if (p) {
            setAccountType(p.account_type);
            setOfficialKinds(p.official_kinds || []);
            if (p.region) setMyRegion(p.region);
          }
        }).catch(() => {});
        getMyOwnedGroupIds(user.id).then((ids) => setOwnedGroupIds(new Set(ids))).catch(() => {});
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

  const myCity = parseRegion(myRegion)?.city || null;
  const matchesCity = (regionStr: string | null | undefined, locationStr?: string | null): boolean => {
    if (!cityFilter) return true;
    if (regionStr && regionStr.startsWith(cityFilter)) return true;
    if (locationStr && locationStr.includes(cityFilter)) return true;
    return false;
  };
  const filteredTournaments = tournaments.filter((t) => matchesCity(null, t.location));
  const filteredVenues = venues.filter((v) => matchesCity(v.region, v.address));
  const visiblePromotions = promotions.filter((p) => p.type !== 'event' && p.type !== 'venue');
  const allBrandPromotions = activeTab === 'brand' || activeTab === 'all'
    ? visiblePromotions
    : [];

  const showTournaments = activeTab === 'all' || activeTab === 'tournament';
  const showVenues = activeTab === 'all' || activeTab === 'venue';
  const showBrand = activeTab === 'all' || activeTab === 'brand';
  const hasAnyContent =
    (showTournaments && filteredTournaments.length > 0) ||
    (showVenues && filteredVenues.length > 0) ||
    (showBrand && allBrandPromotions.length > 0);

  const handlePress = async (item: Promotion) => {
    if (item.link_url && /^https?:\/\//.test(item.link_url)) {
      const supported = await Linking.canOpenURL(item.link_url);
      if (supported) Linking.openURL(item.link_url);
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

  const handleDeleteTournament = (t: Tournament) => {
    Alert.alert('確認刪除', `確定要刪除「${t.title}」嗎？所有報名資料會一併刪除。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTournament(t.id);
            setTournaments((prev) => prev.filter((x) => x.id !== t.id));
          } catch {
            Alert.alert('錯誤', '刪除失敗');
          }
        },
      },
    ]);
  };

  const handleDeleteVenue = (v: Venue) => {
    Alert.alert('確認刪除', `確定要刪除「${v.name}」嗎？所有預約資料會一併刪除。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVenue(v.id);
            setVenues((prev) => prev.filter((x) => x.id !== v.id));
          } catch {
            Alert.alert('錯誤', '刪除失敗');
          }
        },
      },
    ]);
  };

  const isAllTab = activeTab === 'all';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>發現</Text>
          {accountType === 'official' && officialKinds.includes('brand') && (
            <TouchableOpacity
              style={[styles.publishBtn, { backgroundColor: colors.text }, Shadows.sm]}
              onPress={() => router.push('/promotion/new')}
              activeOpacity={0.8}
            >
              <IconSymbol name="plus" size={14} color={colors.background} />
              <Text style={[styles.publishBtnText, { color: colors.background }]}>發布品牌</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab filter */}
        <View style={styles.tabRow}>
          {(['all', 'tournament', 'venue', 'brand'] as const).map((tab) => {
            const selected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  { borderColor: colors.border },
                  selected && { backgroundColor: colors.text, borderColor: colors.text },
                ]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabText,
                  { color: selected ? colors.background : colors.textSecondary },
                ]}>
                  {tab === 'all' ? '全部' : tab === 'tournament' ? '比賽' : TYPE_CONFIG[tab].label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Region filter */}
        <TouchableOpacity
          style={[styles.regionToggle, { borderColor: colors.border }]}
          onPress={() => setCityPickerOpen(true)}
          activeOpacity={0.7}
        >
          <IconSymbol name="location.fill" size={12} color={cityFilter ? colors.primary : colors.textSecondary} />
          <Text style={[
            styles.regionToggleText,
            { color: cityFilter ? colors.primary : colors.textSecondary },
          ]}>
            {cityFilter ? cityFilter : '全區域'}
          </Text>
          {cityFilter && (
            <TouchableOpacity
              onPress={() => setCityFilter(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginLeft: 4 }}>×</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : !hasAnyContent ? (
          <EmptyState
            icon="magnifyingglass"
            title={activeTab === 'tournament' ? '目前沒有進行中的比賽' : '目前沒有推廣資訊'}
            body="切換上方分類或選不同地區看看"
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: Spacing.xs }}
          >
            {isAllTab ? (
              <>
                {filteredTournaments.length > 0 && (
                  <CuratedSection
                    title="進行中的比賽"
                    subtitle={`${filteredTournaments.length} 場`}
                    onMore={() => setActiveTab('tournament')}
                    moreLabel="查看全部"
                  >
                    {filteredTournaments.slice(0, 8).map((t) => (
                      <View key={t.id} style={styles.hCardWrap}>
                        <TournamentCard
                          tournament={t}
                          colors={colors}
                          onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: t.id } })}
                        />
                      </View>
                    ))}
                  </CuratedSection>
                )}

                {filteredVenues.length > 0 && (
                  <CuratedSection
                    title="可預約場地"
                    subtitle={`${filteredVenues.length} 個`}
                    onMore={() => setActiveTab('venue')}
                    moreLabel="查看全部"
                  >
                    {filteredVenues.slice(0, 8).map((v) => (
                      <View key={v.id} style={styles.hCardWrap}>
                        <VenueCard
                          venue={v}
                          colors={colors}
                          onPress={() => router.push({ pathname: '/venue/[id]', params: { id: v.id } })}
                        />
                      </View>
                    ))}
                  </CuratedSection>
                )}

                {allBrandPromotions.length > 0 && (
                  <CuratedSection
                    title="品牌合作"
                    sponsored
                    onMore={allBrandPromotions.length > 4 ? () => setActiveTab('brand') : undefined}
                    moreLabel="查看全部"
                  >
                    {allBrandPromotions.slice(0, 8).map((item) => (
                      <View key={item.id} style={styles.hCardWrap}>
                        <PromotionCard
                          item={item}
                          publisher={publishers[item.user_id]}
                          colors={colors}
                          onPress={() => handlePress(item)}
                          featured={item.is_featured}
                        />
                      </View>
                    ))}
                  </CuratedSection>
                )}
              </>
            ) : (
              <View style={{ paddingHorizontal: Spacing.lg }}>
                {showTournaments && filteredTournaments.map((t) => {
                  const isOwner = ownedGroupIds.has(t.organizer_group_id);
                  return (
                    <View key={t.id} style={styles.vCardWrap}>
                      <TournamentCard
                        tournament={t}
                        colors={colors}
                        onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: t.id } })}
                        isOwner={isOwner}
                        onEdit={() => router.push(`/tournament/edit/${t.id}`)}
                        onDelete={() => handleDeleteTournament(t)}
                      />
                    </View>
                  );
                })}
                {showVenues && filteredVenues.map((v) => {
                  const isOwner = !!v.operator_group_id && ownedGroupIds.has(v.operator_group_id);
                  return (
                    <View key={v.id} style={styles.vCardWrap}>
                      <VenueCard
                        venue={v}
                        colors={colors}
                        onPress={() => router.push({ pathname: '/venue/[id]', params: { id: v.id } })}
                        isOwner={isOwner}
                        onEdit={() => router.push(`/venue/edit/${v.id}`)}
                        onDelete={() => handleDeleteVenue(v)}
                      />
                    </View>
                  );
                })}
                {showBrand && allBrandPromotions.map((item) => (
                  <View key={item.id} style={styles.vCardWrap}>
                    <PromotionCard
                      item={item}
                      publisher={publishers[item.user_id]}
                      colors={colors}
                      onPress={() => handlePress(item)}
                      isOwner={user?.id === item.user_id}
                      onEdit={() => handleEdit(item)}
                      onDelete={() => handleDelete(item)}
                      featured={item.is_featured}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Brand partnership CTA */}
            <View style={{ paddingHorizontal: Spacing.lg }}>
              <View style={[styles.ctaSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ThemedText type="label" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  想在這裡展示您的賽事或場地？
                </ThemedText>
                <ThemedText type="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  申請成為官方帳號即可發布推廣資訊
                </ThemedText>
              </View>
            </View>

            <View style={{ height: Spacing.xxl }} />
          </ScrollView>
        )}

        {/* City picker modal */}
        <Modal
          visible={cityPickerOpen}
          animationType="slide"
          transparent
          presentationStyle="overFullScreen"
          onRequestClose={() => setCityPickerOpen(false)}
        >
          <View style={styles.cityBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setCityPickerOpen(false)}
            />
            <View style={[styles.citySheet, { backgroundColor: colors.background }]}>
              <View style={[styles.cityHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.cityTitle, { color: colors.text }]}>選擇城市</Text>
                <TouchableOpacity onPress={() => setCityPickerOpen(false)} activeOpacity={0.6}>
                  <Text style={{ color: colors.textSecondary, fontSize: 15 }}>關閉</Text>
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.cityList}>
                <TouchableOpacity
                  style={[styles.cityItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setCityFilter(null); setCityPickerOpen(false); }}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.cityItemText, { color: !cityFilter ? colors.primary : colors.text }]}>
                    全區域
                  </Text>
                </TouchableOpacity>
                {myCity && (
                  <TouchableOpacity
                    style={[styles.cityItem, { borderBottomColor: colors.border }]}
                    onPress={() => { setCityFilter(myCity); setCityPickerOpen(false); }}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.cityItemText, { color: cityFilter === myCity ? colors.primary : colors.text }]}>
                      {myCity}（我的區域）
                    </Text>
                  </TouchableOpacity>
                )}
                {REGION_GROUPS.filter((g) => g.city !== myCity).map((group) => (
                  <TouchableOpacity
                    key={group.city}
                    style={[styles.cityItem, { borderBottomColor: colors.border }]}
                    onPress={() => { setCityFilter(group.city); setCityPickerOpen(false); }}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.cityItemText, { color: cityFilter === group.city ? colors.primary : colors.text }]}>
                      {group.city}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

function CuratedSection({
  title,
  subtitle,
  sponsored,
  onMore,
  moreLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  sponsored?: boolean;
  onMore?: () => void;
  moreLabel?: string;
  children: React.ReactNode;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={{ marginBottom: Spacing.xl }}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitleText, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          )}
          {sponsored && (
            <View style={[styles.sponsorBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sponsorText, { color: colors.textSecondary }]}>贊助</Text>
            </View>
          )}
        </View>
        {onMore && (
          <TouchableOpacity onPress={onMore} activeOpacity={0.6} style={styles.moreBtn}>
            <Text style={[styles.moreText, { color: colors.textSecondary }]}>{moreLabel || '更多'}</Text>
            <IconSymbol name="chevron.right" size={12} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hScrollContent}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function TournamentCard({
  tournament,
  colors,
  onPress,
  isOwner,
  onEdit,
  onDelete,
}: {
  tournament: Tournament;
  colors: typeof Colors.light;
  onPress: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const sportLabel = SPORT_OPTIONS.find((s) => s.key === tournament.sport_type)?.label || '';
  const startStr = new Date(tournament.start_date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
  const deadlineStr = tournament.registration_deadline
    ? new Date(tournament.registration_deadline).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
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

        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{tournament.title}</Text>

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
            <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
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

function VenueCard({
  venue,
  colors,
  onPress,
  isOwner,
  onEdit,
  onDelete,
}: {
  venue: Venue;
  colors: typeof Colors.light;
  onPress: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const sportLabels = venue.sport_types.map((k) => SPORT_OPTIONS.find((s) => s.key === k)?.label || k).join('、');

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {venue.cover_image_url && (
        <Image source={{ uri: venue.cover_image_url }} style={styles.cardImage} contentFit="cover" />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, { backgroundColor: colors.secondary }]}>
            <IconSymbol name="location.fill" size={11} color={colors.textSecondary} />
            <ThemedText type="label" style={{ color: colors.textSecondary }}>場地</ThemedText>
          </View>
          {venue.hourly_rate !== null && (
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
              NT$ {venue.hourly_rate}/hr
            </Text>
          )}
        </View>

        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{venue.name}</Text>

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
              <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>{sportLabels}</ThemedText>
            </View>
          )}
        </View>
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
            <View style={[styles.typeBadge, { backgroundColor: colors.secondary }]}>
              <IconSymbol name={typeConfig.icon} size={11} color={colors.textSecondary} />
              <ThemedText type="label" style={{ color: colors.textSecondary }}>{typeConfig.label}</ThemedText>
            </View>
            {featured && (
              <View style={[styles.featuredBadge, { backgroundColor: colors.text }]}>
                <Text style={[styles.featuredText, { color: colors.background }]}>精選</Text>
              </View>
            )}
          </View>

          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>

          {item.description && (
            <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={2}>
              {item.description}
            </ThemedText>
          )}

          <View style={styles.cardMeta}>
            {item.location && (
              <View style={styles.metaItem}>
                <IconSymbol name="location.fill" size={12} color={colors.textSecondary} />
                <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>{item.location}</ThemedText>
              </View>
            )}
            {publisher && (
              <View style={styles.metaItem}>
                <IconSymbol name="person.fill" size={12} color={colors.textSecondary} />
                <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>{publisher}</ThemedText>
              </View>
            )}
          </View>
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
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
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
  regionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },
  cityBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  citySheet: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  cityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cityTitle: { fontSize: 17, fontWeight: '700' },
  cityList: { paddingBottom: Spacing.xl },
  cityItem: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cityItemText: { fontSize: 15, fontWeight: '600' },
  regionToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Curated section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  hCardWrap: {
    width: HCARD_W,
  },
  vCardWrap: {
    marginBottom: Spacing.md,
  },
  sponsorBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sponsorText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardBody: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
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
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginVertical: 2,
  },
  cardMeta: {
    gap: 4,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
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
    paddingVertical: Spacing.sm,
  },
  ctaSection: {
    padding: Spacing.xxl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
});
