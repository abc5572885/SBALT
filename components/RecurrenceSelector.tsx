import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateChinese } from '@/utils/dateFormat';
import { RecurrenceConfig, generateRRULE } from '@/utils/rrule';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

interface RecurrenceSelectorProps {
  initialDate: Date;
  onRecurrenceChange: (rrule: string | null, endDate: Date | null, count?: number | null) => void;
  disabled?: boolean;
}

type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
type EndCondition = 'never' | 'date' | 'count';

const WEEKDAY_NAMES = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

export function RecurrenceSelector({
  initialDate,
  onRecurrenceChange,
  disabled = false,
}: RecurrenceSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('WEEKLY');
  const [interval, setInterval] = useState(1);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [monthlyDay, setMonthlyDay] = useState<number>(initialDate.getDate()); // 每月第幾天 (1-31)
  const [yearlyMonth, setYearlyMonth] = useState<number>(initialDate.getMonth() + 1); // 每年月份 (1-12)
  const [yearlyDay, setYearlyDay] = useState<number>(initialDate.getDate()); // 每年日期 (1-31)
  const [endCondition, setEndCondition] = useState<EndCondition>('date');
  const [endDate, setEndDate] = useState<Date>(() => {
    const date = new Date(initialDate);
    date.setMonth(date.getMonth() + 3); // Default: 3 months
    return date;
  });
  const [occurrenceCount, setOccurrenceCount] = useState(12);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempEndDate, setTempEndDate] = useState<Date>(endDate);

  // Adjust yearly day when month changes
  React.useEffect(() => {
    if (frequency === 'YEARLY') {
      const maxDays = new Date(2024, yearlyMonth, 0).getDate();
      if (yearlyDay > maxDays) {
        setYearlyDay(maxDays);
      }
    }
  }, [yearlyMonth, frequency]);

  React.useEffect(() => {
    updateRecurrence();
  }, [isRecurring, frequency, interval, selectedWeekdays, monthlyDay, yearlyMonth, yearlyDay, endCondition, endDate, occurrenceCount, initialDate]);

  const updateRecurrence = () => {
    if (!isRecurring) {
      onRecurrenceChange(null, null, null);
      return;
    }

    const config: RecurrenceConfig = {
      frequency,
      interval,
      dtstart: initialDate,
    };

    if (frequency === 'WEEKLY' && selectedWeekdays.length > 0) {
      config.byweekday = selectedWeekdays;
    }

    if (frequency === 'MONTHLY') {
      config.bymonthday = [monthlyDay];
    }

    if (frequency === 'YEARLY') {
      config.bymonth = [yearlyMonth];
      config.bymonthday = [yearlyDay];
    }

    let recurrenceCount: number | null = null;
    if (endCondition === 'date') {
      config.until = endDate;
    } else if (endCondition === 'count') {
      config.count = occurrenceCount;
      recurrenceCount = occurrenceCount;
    }

    const rrule = generateRRULE(config);
    const finalEndDate = endCondition === 'date' ? endDate : null;
    onRecurrenceChange(rrule, finalEndDate, recurrenceCount);
  };

  const toggleWeekday = (day: number) => {
    if (disabled) return;
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleFrequencyChange = (freq: Frequency) => {
    if (disabled) return;
    setFrequency(freq);
    if (freq !== 'WEEKLY') {
      setSelectedWeekdays([]);
    } else if (selectedWeekdays.length === 0) {
      // Default to the weekday of initial date
      setSelectedWeekdays([initialDate.getDay() === 0 ? 6 : initialDate.getDay() - 1]);
    }
    // Initialize monthly and yearly values from initial date if not set
    if (freq === 'MONTHLY') {
      setMonthlyDay(initialDate.getDate());
    }
    if (freq === 'YEARLY') {
      setYearlyMonth(initialDate.getMonth() + 1);
      setYearlyDay(initialDate.getDate());
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.switchRow}>
        <ThemedText style={styles.label}>重複活動</ThemedText>
        <Switch
          value={isRecurring}
          onValueChange={(value) => {
            if (disabled) return;
            setIsRecurring(value);
          }}
          disabled={disabled}
          trackColor={{
            false: Colors[colorScheme ?? 'light'].switchTrackOff,
            true: Colors[colorScheme ?? 'light'].primary,
          }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={Colors[colorScheme ?? 'light'].switchTrackOff}
        />
      </View>

      {isRecurring && (
        <View style={styles.recurrenceOptions}>
          <View style={styles.frequencySection}>
            <ThemedText style={styles.sectionLabel}>頻率</ThemedText>
            <View style={styles.frequencyButtons}>
              {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as Frequency[]).map((freq) => {
                const isActive = frequency === freq;
                return (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      colorScheme === 'dark' ? styles.frequencyButtonDark : styles.frequencyButtonLight,
                      isActive && styles.frequencyButtonActive,
                      isActive && (colorScheme === 'dark' ? styles.frequencyButtonActiveDark : styles.frequencyButtonActiveLight),
                    ]}
                    onPress={() => handleFrequencyChange(freq)}
                    disabled={disabled}
                  >
                    <ThemedText
                      style={[
                        styles.frequencyButtonText,
                        isActive && styles.frequencyButtonTextActive,
                      ]}
                    >
                      {freq === 'DAILY' ? '每天' : freq === 'WEEKLY' ? '每週' : freq === 'MONTHLY' ? '每月' : '每年'}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {frequency === 'WEEKLY' && (
            <View style={styles.weekdaySection}>
              <ThemedText style={styles.sectionLabel}>重複於</ThemedText>
              <View style={styles.weekdayButtons}>
                {WEEKDAY_NAMES.map((name, index) => {
                  const isActive = selectedWeekdays.includes(index);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.weekdayButton,
                        colorScheme === 'dark' ? styles.weekdayButtonDark : styles.weekdayButtonLight,
                        isActive && styles.weekdayButtonActive,
                        isActive && (colorScheme === 'dark' ? styles.weekdayButtonActiveDark : styles.weekdayButtonActiveLight),
                      ]}
                      onPress={() => toggleWeekday(index)}
                      disabled={disabled}
                    >
                      <ThemedText
                        style={[
                          styles.weekdayButtonText,
                          isActive && styles.weekdayButtonTextActive,
                        ]}
                      >
                        {name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {frequency === 'MONTHLY' && (
            <View style={styles.monthlySection}>
              <ThemedText style={styles.sectionLabel}>每月第幾天</ThemedText>
              <View style={styles.pickerContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pickerScrollContent}
                  style={styles.pickerScroll}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const isActive = monthlyDay === day;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.pickerItem,
                          colorScheme === 'dark' ? styles.pickerItemDark : styles.pickerItemLight,
                          isActive && [styles.pickerItemActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                        ]}
                        onPress={() => {
                          if (disabled) return;
                          setMonthlyDay(day);
                        }}
                        disabled={disabled}
                      >
                        <ThemedText
                          style={[
                            styles.pickerItemText,
                            isActive && styles.pickerItemTextActive,
                          ]}
                        >
                          {day}日
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={[styles.pickerIndicator, { backgroundColor: colors.secondary }]}>
                  <ThemedText style={[styles.pickerIndicatorText, { color: colors.primary }]}>目前選擇：{monthlyDay}日</ThemedText>
                </View>
              </View>
            </View>
          )}

          {frequency === 'YEARLY' && (
            <View style={styles.yearlySection}>
              <ThemedText style={styles.sectionLabel}>每年日期</ThemedText>
              <View style={styles.yearlySelector}>
                <View style={styles.pickerGroup}>
                  <ThemedText style={styles.selectorLabel}>月份</ThemedText>
                  <View style={styles.pickerContainer}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.pickerScrollContent}
                      style={styles.pickerScroll}
                    >
                      {[
                        '1月', '2月', '3月', '4月', '5月', '6月',
                        '7月', '8月', '9月', '10月', '11月', '12月'
                      ].map((month, index) => {
                        const monthNum = index + 1;
                        const isActive = yearlyMonth === monthNum;
                        return (
                          <TouchableOpacity
                            key={monthNum}
                            style={[
                              styles.pickerItem,
                              isActive && styles.pickerItemActive,
                              colorScheme === 'dark' ? styles.pickerItemDark : styles.pickerItemLight,
                            ]}
                            onPress={() => {
                              if (disabled) return;
                              setYearlyMonth(monthNum);
                              // Adjust day if needed (e.g., if month has fewer days)
                              const maxDays = new Date(2024, monthNum, 0).getDate();
                              if (yearlyDay > maxDays) {
                                setYearlyDay(maxDays);
                              }
                            }}
                            disabled={disabled}
                          >
                            <ThemedText
                              style={[
                                styles.pickerItemText,
                                isActive && styles.pickerItemTextActive,
                              ]}
                            >
                              {month}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <View style={styles.pickerIndicator}>
                      <ThemedText style={styles.pickerIndicatorText}>目前選擇：{yearlyMonth}月</ThemedText>
                    </View>
                  </View>
                </View>
                <View style={styles.pickerGroup}>
                  <ThemedText style={styles.selectorLabel}>日期</ThemedText>
                  <View style={styles.pickerContainer}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.pickerScrollContent}
                      style={styles.pickerScroll}
                    >
                      {Array.from({ length: new Date(2024, yearlyMonth, 0).getDate() }, (_, i) => i + 1).map((day) => {
                        const isActive = yearlyDay === day;
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.pickerItem,
                              isActive && styles.pickerItemActive,
                              colorScheme === 'dark' ? styles.pickerItemDark : styles.pickerItemLight,
                            ]}
                            onPress={() => {
                              if (disabled) return;
                              setYearlyDay(day);
                            }}
                            disabled={disabled}
                          >
                            <ThemedText
                              style={[
                                styles.pickerItemText,
                                isActive && styles.pickerItemTextActive,
                              ]}
                            >
                              {day}日
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <View style={styles.pickerIndicator}>
                      <ThemedText style={styles.pickerIndicatorText}>目前選擇：{yearlyDay}日</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.endConditionSection}>
            <ThemedText style={styles.sectionLabel}>結束條件</ThemedText>
            <View style={styles.endConditionButtons}>
              <TouchableOpacity
                style={[
                  styles.endConditionButton,
                  colorScheme === 'dark' ? styles.endConditionButtonDark : styles.endConditionButtonLight,
                  endCondition === 'date' && styles.endConditionButtonActive,
                  endCondition === 'date' && (colorScheme === 'dark' ? styles.endConditionButtonActiveDark : styles.endConditionButtonActiveLight),
                ]}
                onPress={() => {
                  if (disabled) return;
                  setEndCondition('date');
                }}
                disabled={disabled}
              >
                <ThemedText
                  style={[
                    styles.endConditionButtonText,
                    endCondition === 'date' && styles.endConditionButtonTextActive,
                  ]}
                >
                  結束日期
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.endConditionButton,
                  colorScheme === 'dark' ? styles.endConditionButtonDark : styles.endConditionButtonLight,
                  endCondition === 'count' && styles.endConditionButtonActive,
                  endCondition === 'count' && (colorScheme === 'dark' ? styles.endConditionButtonActiveDark : styles.endConditionButtonActiveLight),
                ]}
                onPress={() => {
                  if (disabled) return;
                  setEndCondition('count');
                }}
                disabled={disabled}
              >
                <ThemedText
                  style={[
                    styles.endConditionButtonText,
                    endCondition === 'count' && styles.endConditionButtonTextActive,
                  ]}
                >
                  重複次數
                </ThemedText>
              </TouchableOpacity>
            </View>

            {endCondition === 'date' && (
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  colorScheme === 'dark' ? styles.dateButtonDark : styles.dateButtonLight,
                ]}
                onPress={() => {
                  if (disabled) return;
                  setTempEndDate(endDate);
                  setShowEndDatePicker(true);
                }}
                disabled={disabled}
              >
                <ThemedText style={styles.dateButtonText}>
                  {formatDateChinese(endDate)}
                </ThemedText>
              </TouchableOpacity>
            )}

            {endCondition === 'count' && (
              <View style={styles.countInput}>
                <ThemedText style={styles.countLabel}>重複</ThemedText>
                <View style={styles.countControls}>
                  <TouchableOpacity
                    style={[styles.countButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      if (disabled || occurrenceCount <= 1) return;
                      setOccurrenceCount(occurrenceCount - 1);
                    }}
                    disabled={disabled || occurrenceCount <= 1}
                  >
                    <ThemedText style={styles.countButtonText}>-</ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={styles.countValue}>{occurrenceCount}</ThemedText>
                  <TouchableOpacity
                    style={[styles.countButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      if (disabled) return;
                      setOccurrenceCount(occurrenceCount + 1);
                    }}
                    disabled={disabled}
                  >
                    <ThemedText style={styles.countButtonText}>+</ThemedText>
                  </TouchableOpacity>
                </View>
                <ThemedText style={styles.countLabel}>次</ThemedText>
              </View>
            )}
          </View>
        </View>
      )}

      {showEndDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showEndDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowEndDatePicker(false)}
          >
            <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowEndDatePicker(false);
                    }}
                  >
                    <ThemedText style={[styles.modalButton, { color: colors.icon }]}>取消</ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={styles.modalTitle}>選擇結束日期</ThemedText>
                  <TouchableOpacity
                    onPress={() => {
                      setEndDate(tempEndDate);
                      setShowEndDatePicker(false);
                    }}
                  >
                    <ThemedText style={[styles.modalButton, styles.modalConfirm, { color: colors.primary }]}>確定</ThemedText>
                  </TouchableOpacity>
                </View>
                <View style={[styles.pickerContainerModal, { backgroundColor: colors.background }]}>
                  <DateTimePicker
                    value={tempEndDate}
                    mode="date"
                    minimumDate={initialDate}
                    display="spinner"
                    locale="zh-TW"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setTempEndDate(selectedDate);
                      }
                    }}
                    textColor={colors.text}
                    themeVariant="light"
                  />
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempEndDate}
            mode="date"
            minimumDate={initialDate}
            display="default"
            locale="zh-TW"
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate && event.type !== 'dismissed') {
                setEndDate(selectedDate);
              }
            }}
            textColor={colors.text}
            themeVariant="light"
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  recurrenceOptions: {
    gap: 16,
    paddingTop: 8,
  },
  frequencySection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  frequencyButton: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  frequencyButtonLight: {
    backgroundColor: Colors.light.card,
    borderColor: Colors.light.border,
  },
  frequencyButtonDark: {
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.border,
  },
  frequencyButtonActive: {
    borderWidth: 2,
  },
  frequencyButtonActiveLight: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  frequencyButtonActiveDark: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  frequencyButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  weekdaySection: {
    gap: 8,
  },
  weekdayButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  weekdayButton: {
    flex: 1,
    minWidth: 50,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  weekdayButtonLight: {
    backgroundColor: Colors.light.card,
    borderColor: Colors.light.border,
  },
  weekdayButtonDark: {
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.border,
  },
  weekdayButtonActive: {
    borderWidth: 2,
  },
  weekdayButtonActiveLight: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  weekdayButtonActiveDark: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  weekdayButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  weekdayButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  monthlySection: {
    gap: 8,
  },
  pickerGroup: {
    gap: 8,
  },
  pickerContainer: {
    gap: 8,
  },
  pickerScroll: {
    maxHeight: 120,
  },
  pickerScrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 8,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    borderWidth: 1,
  },
  pickerItemLight: {
    backgroundColor: Colors.light.card,
    borderColor: Colors.light.border,
  },
  pickerItemDark: {
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.border,
  },
  pickerItemActive: {
    borderWidth: 2,
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pickerItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pickerIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  pickerIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  yearlySection: {
    gap: 16,
  },
  yearlySelector: {
    gap: 16,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  endConditionSection: {
    gap: 8,
  },
  endConditionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  endConditionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  endConditionButtonLight: {
    backgroundColor: Colors.light.card,
    borderColor: Colors.light.border,
  },
  endConditionButtonDark: {
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.border,
  },
  endConditionButtonActive: {
    borderWidth: 2,
  },
  endConditionButtonActiveLight: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  endConditionButtonActiveDark: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  endConditionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  endConditionButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonLight: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.border,
  },
  dateButtonDark: {
    backgroundColor: Colors.dark.background,
    borderColor: Colors.dark.border,
  },
  dateButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  countInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  countLabel: {
    fontSize: 14,
  },
  countControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  countButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  countValue: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalButton: {
    fontSize: 16,
  },
  modalConfirm: {
    fontWeight: '600',
  },
  pickerContainerModal: {
    paddingVertical: 8,
  },
});

