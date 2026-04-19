import { DAY_KEYS, DAY_LABELS, DayKey, WeeklySchedule } from '@/constants/venues';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  value: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
}

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i); // 0 - 24

function isUniform(schedule: WeeklySchedule): { uniform: boolean; start: number; end: number } {
  const openDays = DAY_KEYS.filter((k) => schedule[k] !== null).map((k) => schedule[k]!);
  if (openDays.length === 0) return { uniform: true, start: 6, end: 22 };
  const first = openDays[0];
  const uniform = openDays.every((d) => d.start === first.start && d.end === first.end);
  return { uniform, start: first.start, end: first.end };
}

export function WeeklySchedulePicker({ value, onChange }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const initial = useMemo(() => isUniform(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [mode, setMode] = useState<'uniform' | 'advanced'>(initial.uniform ? 'uniform' : 'advanced');

  const uniform = isUniform(value);

  const setUniformStart = (start: number) => {
    const end = Math.max(start + 1, uniform.end);
    const next: WeeklySchedule = { ...value };
    for (const k of DAY_KEYS) {
      if (next[k] !== null) next[k] = { start, end: Math.min(end, 24) };
    }
    onChange(next);
  };

  const setUniformEnd = (end: number) => {
    const next: WeeklySchedule = { ...value };
    for (const k of DAY_KEYS) {
      if (next[k] !== null) next[k] = { start: Math.min(uniform.start, end - 1), end };
    }
    onChange(next);
  };

  const toggleDayClosed = (day: DayKey) => {
    const next: WeeklySchedule = { ...value };
    if (next[day] === null) {
      next[day] = { start: uniform.start, end: uniform.end };
    } else {
      next[day] = null;
    }
    onChange(next);
  };

  if (mode === 'uniform') {
    return (
      <View>
        <View style={styles.uniformBlock}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>開始時間</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
            {HOUR_OPTIONS.slice(0, 24).map((h) => {
              const selected = uniform.start === h;
              return (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.hourChip,
                    { borderColor: colors.border },
                    selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setUniformStart(h)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.hourText, { color: colors.textSecondary }, selected && { color: '#FFF' }]}>
                    {pad(h)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.uniformBlock}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>結束時間</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
            {HOUR_OPTIONS.slice(1).map((h) => {
              const selected = uniform.end === h;
              const disabled = h <= uniform.start;
              return (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.hourChip,
                    { borderColor: colors.border },
                    selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    disabled && { opacity: 0.3 },
                  ]}
                  onPress={() => !disabled && setUniformEnd(h)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.hourText, { color: colors.textSecondary }, selected && { color: '#FFF' }]}>
                    {pad(h)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.uniformBlock}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>公休日</Text>
          <View style={styles.daysRow}>
            {DAY_KEYS.map((day) => {
              const closed = value[day] === null;
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayPill,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    closed && { backgroundColor: colors.error + '20', borderColor: colors.error },
                  ]}
                  onPress={() => toggleDayClosed(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayPillText,
                    { color: colors.text },
                    closed && { color: colors.error },
                  ]}>
                    {DAY_LABELS[day].replace('週', '')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            點選要公休的日期（預設全週開放）
          </Text>
        </View>

        <TouchableOpacity
          style={styles.modeSwitch}
          onPress={() => setMode('advanced')}
          activeOpacity={0.6}
        >
          <Text style={[styles.modeSwitchText, { color: colors.primary }]}>
            進階：各日獨立設定 ›
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Advanced mode
  return (
    <View>
      <TouchableOpacity
        style={styles.modeSwitch}
        onPress={() => setMode('uniform')}
        activeOpacity={0.6}
      >
        <Text style={[styles.modeSwitchText, { color: colors.primary }]}>
          ‹ 返回簡易模式（全週統一）
        </Text>
      </TouchableOpacity>

      <View style={{ gap: Spacing.sm }}>
        {DAY_KEYS.map((day) => {
          const schedule = value[day];
          const isOpen = schedule !== null;
          return (
            <View key={day} style={[styles.advRow, { borderColor: colors.border }]}>
              <View style={styles.advDayRow}>
                <TouchableOpacity
                  style={[
                    styles.dayBtn,
                    { borderColor: colors.border },
                    isOpen && { backgroundColor: colors.text, borderColor: colors.text },
                  ]}
                  onPress={() => {
                    const next: WeeklySchedule = { ...value };
                    next[day] = isOpen ? null : { start: 6, end: 22 };
                    onChange(next);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayBtnText,
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
              </View>

              {isOpen && (
                <View style={styles.advPickers}>
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
                          onPress={() => {
                            const next: WeeklySchedule = { ...value };
                            const curEnd = schedule!.end;
                            next[day] = { start: h, end: Math.max(h + 1, curEnd) };
                            onChange(next);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.hourText, { color: colors.textSecondary }, selected && { color: '#FFF' }]}>
                            {pad(h)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={[styles.pickerLabel, { color: colors.textSecondary, marginTop: Spacing.xs }]}>結束</Text>
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
                          onPress={() => {
                            if (disabled) return;
                            const next: WeeklySchedule = { ...value };
                            next[day] = { start: schedule!.start, end: h };
                            onChange(next);
                          }}
                          disabled={disabled}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.hourText, { color: colors.textSecondary }, selected && { color: '#FFF' }]}>
                            {pad(h)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

const styles = StyleSheet.create({
  uniformBlock: { marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  hourRow: { gap: 6, paddingRight: Spacing.md },
  hourChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 40,
    alignItems: 'center',
  },
  hourText: { fontSize: 13, fontWeight: '600' },
  daysRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  dayPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
  },
  dayPillText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, marginTop: Spacing.xs },
  modeSwitch: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  modeSwitchText: { fontSize: 13, fontWeight: '600' },
  advRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  advDayRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dayBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  dayBtnText: { fontSize: 13, fontWeight: '600' },
  advPickers: { gap: Spacing.xs },
  pickerLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
});
