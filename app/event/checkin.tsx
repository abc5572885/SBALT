import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { checkInRegistration, getEventById, getRegistrations } from '@/services/database';
import { Event, Registration } from '@/types/database';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function CheckInScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

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
      setRegistrations(regs.filter((r) => r.status === 'registered'));
    } catch (error) {
      console.error('載入失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckIn = async (reg: Registration) => {
    try {
      await checkInRegistration(reg.user_id, eventId);
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === reg.id
            ? { ...r, form_data: { checked_in: true, checked_in_at: new Date().toISOString() } }
            : r
        )
      );
    } catch (error: any) {
      Alert.alert('錯誤', error.message || '簽到失敗');
    }
  };

  const isCheckedIn = (reg: Registration) => {
    const data = reg.form_data as any;
    return data?.checked_in === true;
  };

  const checkedInCount = registrations.filter(isCheckedIn).length;

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="簽到" />
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </ThemedView>
      </ScreenLayout>
    );
  }

  // QR code value: deep link that participants can scan
  const qrValue = `sbalt://checkin?event=${eventId}`;

  return (
    <ScreenLayout>
      <PageHeader title="簽到" />
      <View style={styles.content}>
        {/* QR Code */}
        <View style={[styles.qrSection, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.md]}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={qrValue}
              size={180}
              backgroundColor="transparent"
              color={colors.text}
            />
          </View>
          <ThemedText type="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
            讓參加者掃描此 QR Code 簽到
          </ThemedText>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{checkedInCount}</Text>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            {' '}/ {registrations.length} 已簽到
          </ThemedText>
        </View>

        {/* Manual check-in list */}
        <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          手動簽到
        </ThemedText>
        <View style={styles.list}>
          {registrations.map((reg, index) => {
            const checked = isCheckedIn(reg);
            return (
              <TouchableOpacity
                key={reg.id}
                style={[
                  styles.personRow,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  checked && { borderColor: colors.statusSuccess },
                  Shadows.sm,
                ]}
                onPress={() => !checked && handleManualCheckIn(reg)}
                activeOpacity={checked ? 1 : 0.6}
                disabled={checked}
              >
                <View style={[styles.indexBadge, { backgroundColor: checked ? colors.statusSuccess : colors.disabled }]}>
                  <Text style={styles.indexText}>{checked ? '✓' : index + 1}</Text>
                </View>
                <ThemedText style={styles.personName}>
                  {reg.user_id === user?.id ? '我' : `用戶 ${reg.user_id.slice(0, 8)}`}
                </ThemedText>
                <ThemedText type="caption" style={{ color: checked ? colors.statusSuccess : colors.textSecondary }}>
                  {checked ? '已簽到' : '未簽到'}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: Spacing.xxxl,
  },
  qrSection: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  qrWrapper: {
    padding: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  sectionLabel: {
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    gap: Spacing.sm,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
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
  personName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
