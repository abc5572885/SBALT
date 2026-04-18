import { DAY_KEYS, DAY_LABELS, DayKey, WeeklySchedule } from '@/constants/venues';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  value: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
}

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i); // 0 - 24

export function WeeklySchedulePicker({ value, onChange }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const toggleDay = (day: DayKey) => {
    const current = value[day];
    const next: WeeklySchedule = {
      ...value,
      [day]: current === null ? { start: 6, end: 22 } : null,
    };
    onChange(next);
  };

  const setStart = (day: DayKey, start: number) => {
    const current = value[day];
    if (!current) return;
    // Clamp end to stay > start
    const end = Math.max(start + 1, current.end);
    onChange({ ...value, [day]: { start, end: Math.min(end, 24) } });
  };

  const setEnd = (day: DayKey, end: number) => {
    const current = value[day];
    if (!current) return;
    onChange({ ...value, [day]: { ...current, end: Math.max(end, current.start + 1) } });
  };

  const applyToAll = (day: DayKey) => {
    const src = value[day];
    const next: WeeklySchedule = { ...value };
    for (const k of DAY_KEYS) {
      next[k] = src ? { ...src } : null;
    }
    onChange(next);
  };

  return (
    <View style={styles.container}>
      {DAY_KEYS.map((day) => {
        const schedule = value[day];
        const isOpen = schedule !== null;
        return (
          <View key={day} style={[styles.row, { borderColor: colors.border }]}>
            <View style={styles.dayRow}>
              <TouchableOpacity
                style={[
                  styles.dayBtn,
                  { borderColor: colors.border },
                  isOpen && { backgroundColor: colors.text, borderColor: colors.text },
                ]}
                onPress={() => toggleDay(day)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayText,
                  { color: colors.textSecondary },
                  isOpen && { color: colors.background },
                ]}>
                  {DAY_LABELS[day]}
                </Text>
              </TouchableOpacity>

              {isOpen ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>
                  {pad(schedule!.start)}:00 – {pad(schedule!.end)}:00
                </Text>
              ) : (
                <Text style={{ color: colors.disabled, fontSize: 13, flex: 1 }}>公休</Text>
              )}

              {isOpen && (
                <TouchableOpacity
                  onPress={() => applyToAll(day)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                    套用全週
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {isOpen && (
              <View style={styles.hourPickers}>
                <View style={styles.pickerBlock}>
                  <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>開始</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
                    {HOUR_OPTIONS.slice(0, 24).map((h) => {
                      const selected = schedule!.start === h;
                      return (
                        <TouchableOpacity
                          key={h}
                          style={[
                            styles.hourChip,
                            { borderColor: colors.border },
                            selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                          onPress={() => setStart(day, h)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.hourText,
                            { color: colors.textSecondary },
                            selected && { color: '#FFF' },
                          ]}>
                            {pad(h)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.pickerBlock}>
                  <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>結束</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
                    {HOUR_OPTIONS.slice(1).map((h) => {
                      const selected = schedule!.end === h;
                      const disabled = h <= schedule!.start;
                      return (
                        <TouchableOpacity
                          key={h}
                          style={[
                            styles.hourChip,
                            { borderColor: colors.border },
                            selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                            disabled && { opacity: 0.3 },
                          ]}
                          onPress={() => !disabled && setEnd(day, h)}
                          disabled={disabled}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.hourText,
                            { color: colors.textSecondary },
                            selected && { color: '#FFF' },
                          ]}>
                            {pad(h)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  row: {
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dayBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  dayText: { fontSize: 13, fontWeight: '600' },
  hourPickers: { gap: Spacing.sm },
  pickerBlock: { gap: 4 },
  pickerLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  hourRow: { gap: 6, paddingRight: Spacing.md },
  hourChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 36,
    alignItems: 'center',
  },
  hourText: { fontSize: 12, fontWeight: '600' },
});
