import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GROUP_TYPES, GroupType } from '@/constants/groupTypes';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMyGroups } from '@/services/groups';
import { Group } from '@/types/database';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getGroupByInviteCode, joinGroup } from '@/services/groups';
import { toast } from '@/store/useToast';

export default function GroupsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeType, setActiveType] = useState<GroupType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) loadGroups();
    }, [user])
  );

  const loadGroups = async () => {
    if (!user) return;
    try {
      const data = await getMyGroups(user.id);
      setGroups(data);
    } catch (error) {
      console.error('載入群組失敗:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleJoinByCode = () => {
    Alert.prompt(
      '加入群組',
      '輸入邀請碼',
      async (code) => {
        if (!code || !user) return;
        try {
          const group = await getGroupByInviteCode(code.trim());
          await joinGroup(group.id, user.id);
          toast.success(`已加入「${group.name}」`);
          loadGroups();
        } catch (error: any) {
          if (error?.code === '23505') {
            toast.info('您已經是此群組的成員');
          } else {
            toast.error('邀請碼無效或加入失敗');
          }
        }
      },
      'plain-text'
    );
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="我的群組" />
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </ThemedView>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <PageHeader title="我的群組" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGroups(); }} />}
      >
        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }, Shadows.sm]}
            onPress={() => router.push('/group/create')}
            activeOpacity={0.7}
          >
            <IconSymbol name="plus" size={16} color={colors.primaryText} />
            <Text style={[styles.actionBtnText, { color: colors.primaryText }]}>建立群組</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.border, borderWidth: 1 }]}
            onPress={handleJoinByCode}
            activeOpacity={0.7}
          >
            <IconSymbol name="magnifyingglass" size={16} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>輸入邀請碼</Text>
          </TouchableOpacity>
        </View>

        {/* Type filter tabs */}
        {groups.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            {([{ key: 'all' as const, label: '全部' }, ...GROUP_TYPES]).map((opt) => {
              const selected = activeType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border },
                    selected && { backgroundColor: colors.text, borderColor: colors.text },
                  ]}
                  onPress={() => setActiveType(opt.key as GroupType | 'all')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.filterText,
                    { color: colors.textSecondary },
                    selected && { color: colors.background },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Groups list */}
        {groups.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={{ color: colors.textSecondary }}>
              您尚未加入任何群組
            </ThemedText>
            <ThemedText type="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
              建立一個群組邀請球友，或輸入邀請碼加入
            </ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {groups
              .filter((g) => activeType === 'all' || g.type === activeType)
              .map((group) => {
                const sportLabel = SPORT_OPTIONS.find((s) => s.key === group.sport_type)?.label || '';
                const typeConfig = GROUP_TYPES.find((t) => t.key === group.type);
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                    onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.groupAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.groupAvatarText}>
                        {group.name[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.groupInfo}>
                      <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                      {group.description && (
                        <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
                          {group.description}
                        </ThemedText>
                      )}
                      <View style={styles.tagRow}>
                        {typeConfig && (
                          <View style={[styles.typeTag, { borderColor: colors.border }]}>
                            <ThemedText type="label" style={{ color: colors.textSecondary }}>{typeConfig.label}</ThemedText>
                          </View>
                        )}
                        {sportLabel && (
                          <View style={[styles.sportTag, { backgroundColor: colors.primary + '12' }]}>
                            <ThemedText type="label" style={{ color: colors.primary }}>{sportLabel}</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
                  </TouchableOpacity>
                );
              })}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  list: {
    gap: Spacing.sm,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  groupInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sportTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  typeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  filterScroll: {
    marginBottom: Spacing.lg,
  },
  filterRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
