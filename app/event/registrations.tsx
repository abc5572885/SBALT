import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getEventById,
  getRegistrations,
  updatePaymentStatus,
  updateRegistrationStatus,
} from '@/services/database';
import { getDisplayName, getProfilesByIds, Profile } from '@/services/profile';
import { Event, Registration } from '@/types/database';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RegistrationsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (eventId) loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      const [eventData, regs] = await Promise.all([
        getEventById(eventId),
        getRegistrations(eventId),
      ]);
      setEvent(eventData);
      setRegistrations(regs);
      const userIds = regs.map((r) => r.user_id);
      if (userIds.length > 0) {
        getProfilesByIds(userIds).then(setProfiles).catch(() => {});
      }
    } catch (error) {
      console.error('載入報名資料失敗:', error);
      Alert.alert('錯誤', '無法載入報名資料');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTogglePayment = async (reg: Registration) => {
    const newStatus = reg.payment_status === 'paid' ? 'pending' : 'paid';
    try {
      await updatePaymentStatus(reg.id, newStatus);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, payment_status: newStatus } : r))
      );
    } catch (error: any) {
      Alert.alert('錯誤', error.message || '更新付款狀態失敗');
    }
  };

  const handleCancelRegistration = (reg: Registration) => {
    Alert.alert('取消報名', '確定要取消此人的報名嗎？', [
      { text: '返回', style: 'cancel' },
      {
        text: '取消報名',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateRegistrationStatus(reg.id, 'cancelled');
            setRegistrations((prev) =>
              prev.map((r) => (r.id === reg.id ? { ...r, status: 'cancelled' } : r))
            );
          } catch (error: any) {
            Alert.alert('錯誤', error.message || '操作失敗');
          }
        },
      },
    ]);
  };

  const activeRegistrations = registrations.filter((r) => r.status === 'registered');
  const cancelledRegistrations = registrations.filter((r) => r.status === 'cancelled');
  const paidCount = activeRegistrations.filter((r) => r.payment_status === 'paid').length;

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="報名管理" />
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </ThemedView>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <PageHeader title="報名管理" />
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        {event && (
          <View style={styles.summary}>
            <ThemedText style={styles.eventTitle}>{event.title}</ThemedText>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
                <ThemedText style={[styles.statNumber, { color: colors.primary }]}>
                  {activeRegistrations.length}
                </ThemedText>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                  已報名
                </ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
                <ThemedText style={[styles.statNumber, { color: colors.textSecondary }]}>
                  {event.quota}
                </ThemedText>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                  名額上限
                </ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
                <ThemedText style={[styles.statNumber, { color: colors.statusSuccess }]}>
                  {paidCount}
                </ThemedText>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                  已付款
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Active registrations */}
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            報名名單 ({activeRegistrations.length})
          </ThemedText>

          {activeRegistrations.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                目前尚無人報名
              </ThemedText>
            </View>
          ) : (
            <View style={styles.list}>
              {activeRegistrations.map((reg, index) => (
                <View
                  key={reg.id}
                  style={[styles.regCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                >
                  <View style={styles.regInfo}>
                    <View style={[styles.indexBadge, { backgroundColor: colors.primary }]}>
                      <ThemedText style={styles.indexText}>{index + 1}</ThemedText>
                    </View>
                    <TouchableOpacity
                      style={styles.regDetails}
                      onPress={() => {
                        if (reg.user_id !== user?.id) router.push(`/user/${reg.user_id}`);
                      }}
                      activeOpacity={reg.user_id === user?.id ? 1 : 0.6}
                      disabled={reg.user_id === user?.id}
                    >
                      <ThemedText style={styles.regUser}>
                        {getDisplayName(profiles[reg.user_id], reg.user_id, reg.user_id === user?.id)}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                        {new Date(reg.created_at).toLocaleString('zh-TW')}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.regActions}>
                    {/* Payment toggle */}
                    <TouchableOpacity
                      style={[
                        styles.paymentBadge,
                        reg.payment_status === 'paid'
                          ? { backgroundColor: colors.statusSuccess + '15' }
                          : { backgroundColor: colors.secondary },
                      ]}
                      onPress={() => handleTogglePayment(reg)}
                      activeOpacity={0.6}
                    >
                      <ThemedText
                        type="label"
                        style={{
                          color: reg.payment_status === 'paid' ? colors.statusSuccess : colors.textSecondary,
                        }}
                      >
                        {reg.payment_status === 'paid' ? '已付款' : '未付款'}
                      </ThemedText>
                    </TouchableOpacity>

                    {/* Cancel button */}
                    <TouchableOpacity
                      onPress={() => handleCancelRegistration(reg)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.cancelButton}
                    >
                      <IconSymbol name="trash" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Cancelled */}
        {cancelledRegistrations.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              已取消 ({cancelledRegistrations.length})
            </ThemedText>
            <View style={styles.list}>
              {cancelledRegistrations.map((reg) => (
                <View
                  key={reg.id}
                  style={[styles.regCard, styles.cancelledCard, { borderColor: colors.border }]}
                >
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {getDisplayName(profiles[reg.user_id], reg.user_id, reg.user_id === user?.id)}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: colors.error }}>
                    已取消
                  </ThemedText>
                </View>
              ))}
            </View>
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
  summary: {
    marginBottom: Spacing.xl,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    gap: Spacing.sm,
  },
  regCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cancelledCard: {
    opacity: 0.5,
  },
  regInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  regDetails: {
    gap: Spacing.xs,
  },
  regUser: {
    fontSize: 15,
    fontWeight: '500',
  },
  regActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  paymentBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  cancelButton: {
    padding: Spacing.xs,
  },
  emptyCard: {
    padding: Spacing.xxl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
