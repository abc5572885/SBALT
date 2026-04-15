/**
 * DateTimePickerButton Component
 * Simplified date/time picker wrapper for better reusability
 */

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateChinese, formatTime } from '@/utils/dateFormat';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

interface DateTimePickerButtonProps {
  value: Date;
  onChange: (date: Date) => void;
  mode: 'date' | 'time';
  minimumDate?: Date;
  disabled?: boolean;
  label?: string;
}

export function DateTimePickerButton({
  value,
  onChange,
  mode,
  minimumDate,
  disabled = false,
  label,
}: DateTimePickerButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showPicker, setShowPicker] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const formatDisplay = (date: Date): string => {
    if (mode === 'date') {
      return formatDateChinese(date);
    } else {
      return formatTime(date);
    }
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selectedDate && event.type !== 'dismissed') {
        onChange(selectedDate);
      }
    } else {
      // iOS: update temp value while selecting
      if (selectedDate) {
        setTempValue(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    onChange(tempValue);
    setShowPicker(false);
  };

  const handleOpen = () => {
    setTempValue(value);
    setShowPicker(true);
  };

  const picker = (
    <DateTimePicker
      value={tempValue}
      mode={mode}
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={handleChange}
      minimumDate={minimumDate}
      locale="zh-TW"
      textColor={colors.text}
      themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
    />
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { borderColor: colors.border, backgroundColor: colors.background }, disabled && styles.buttonDisabled]}
        onPress={handleOpen}
        disabled={disabled}
      >
        <ThemedText style={[styles.text, { color: colors.text }]}>{formatDisplay(value)}</ThemedText>
        <ThemedText style={styles.icon}>{mode === 'date' ? '📅' : '🕐'}</ThemedText>
      </TouchableOpacity>

      {showPicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowPicker(false)}
          >
            <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <ThemedText style={[styles.modalButton, { color: colors.icon }]}>取消</ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={styles.modalTitle}>
                    {mode === 'date' ? '選擇日期' : '選擇時間'}
                  </ThemedText>
                  <TouchableOpacity onPress={handleConfirm}>
                    <ThemedText style={[styles.modalButton, { color: colors.primary, fontWeight: '600' }]}>確定</ThemedText>
                  </TouchableOpacity>
                </View>
                <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
                  {picker}
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          picker
        )
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
  },
  icon: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  pickerContainer: {},
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
});

