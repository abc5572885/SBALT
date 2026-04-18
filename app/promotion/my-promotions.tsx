import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deletePromotion, getMyPromotions } from '@/services/promotions';
import { Promotion } from '@/types/database';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const TYPE_LABELS: Record<string, string> = {
  event: '賽事',
  venue: '場地',
  brand: '品牌',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: '上架中', color: '#16A34A' },
  draft: { label: '草稿', color: '#9CA3AF' },
  expired: { label: '已過期', color: '#DC2626' },
};

export default function MyPromotionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (user) loadData();
    }, [user])
  );

  const loadData = async () => {
    if (!user) return;
    try {
      const data = await getMyPromotions(user.id);
      setPromotions(data);
    } catch (error) {
      console.error('載入推廣資訊失敗:', error);
    } finally {
      setLoading(false);
    }
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
          } catch (error) {
            Alert.alert('錯誤', '刪除失敗');
          }
        },
      },
    ]);
  };

  return (
    <ScreenLayout>
      <PageHeader title="我的推廣資訊" />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : promotions.length === 0 ? (
        <View style={styles.centerContainer}>
          <IconSymbol name="magnifyingglass" size={40} color={colors.disabled} />
          <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.md }}>
            尚未發布任何推廣資訊
          </ThemedText>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.text }, Shadows.sm]}
            onPress={() => router.push('/promotion/new')}
            activeOpacity={0.8}
          >
            <Text style={[styles.createBtnText, { color: colors.background }]}>發布推廣資訊</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {promotions.map((item) => {
            const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.active;
            return (
              <View
                key={item.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              >
                {item.image_url && (
                  <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
                )}
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
                      <ThemedText type="label" style={{ color: colors.primary }}>
                        {TYPE_LABELS[item.type] || item.type}
                      </ThemedText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                    </View>
                  </View>

                  <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>

                  {item.location && (
                    <View style={styles.metaItem}>
                      <IconSymbol name="location.fill" size={12} color={colors.textSecondary} />
                      <ThemedText type="caption" style={{ color: colors.textSecondary }}>{item.location}</ThemedText>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.deleteBtn, { borderColor: colors.error }]}
                    onPress={() => handleDelete(item)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="trash" size={14} color={colors.error} />
                    <Text style={[styles.deleteBtnText, { color: colors.error }]}>刪除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.addMoreBtn, { borderColor: colors.border }]}
            onPress={() => router.push('/promotion/new')}
            activeOpacity={0.7}
          >
            <IconSymbol name="plus" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>新增推廣資訊</Text>
          </TouchableOpacity>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  createBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 120,
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: Spacing.sm,
  },
});
