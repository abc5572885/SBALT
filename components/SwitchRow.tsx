import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';

interface SwitchRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function SwitchRow({ label, value, onValueChange }: SwitchRowProps) {
  const colorScheme = useColorScheme();
  const borderColor = Colors[colorScheme ?? 'light'].border;

  return (
    <View style={[styles.switchRow, { borderBottomColor: borderColor }]}>
      <ThemedText style={styles.switchLabel}>{label}</ThemedText>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  switchLabel: {
    fontSize: 16,
  },
});

