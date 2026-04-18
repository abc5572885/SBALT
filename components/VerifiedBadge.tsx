import { Radius, Spacing } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccountType, getBadgeInfo } from '@/services/profile';

interface VerifiedBadgeProps {
  accountType: AccountType;
  size?: 'small' | 'normal';
}

export function VerifiedBadge({ accountType, size = 'normal' }: VerifiedBadgeProps) {
  const badge = getBadgeInfo(accountType);
  if (!badge) return null;

  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: badge.color }, isSmall && styles.badgeSmall]}>
      <Text style={[styles.checkmark, isSmall && styles.checkmarkSmall]}>✓</Text>
    </View>
  );
}

export function VerifiedLabel({ accountType, officialTitle }: { accountType: AccountType; officialTitle?: string | null }) {
  const badge = getBadgeInfo(accountType);
  if (!badge) return null;

  return (
    <View style={[styles.labelContainer, { backgroundColor: badge.color + '15' }]}>
      <Text style={[styles.labelCheck, { color: badge.color }]}>✓</Text>
      <Text style={[styles.labelText, { color: badge.color }]}>
        {officialTitle || badge.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  checkmark: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  checkmarkSmall: {
    fontSize: 9,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  labelCheck: {
    fontSize: 10,
    fontWeight: '700',
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
