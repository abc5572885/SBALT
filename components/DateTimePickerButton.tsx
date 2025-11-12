/**
 * DateTimePickerButton Component
 * Simplified date/time picker wrapper for better reusability
 */

import { ThemedText } from '@/components/themed-text';
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
      textColor="#000000"
      themeVariant="light"
    />
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={handleOpen}
        disabled={disabled}
      >
        <ThemedText style={styles.text}>{formatDisplay(value)}</ThemedText>
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
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <ThemedText style={styles.modalButton}>取消</ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={styles.modalTitle}>
                    {mode === 'date' ? '選擇日期' : '選擇時間'}
                  </ThemedText>
                  <TouchableOpacity onPress={handleConfirm}>
                    <ThemedText style={[styles.modalButton, styles.modalConfirm]}>確定</ThemedText>
                  </TouchableOpacity>
                </View>
                <View style={styles.pickerContainer}>
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
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    color: '#000',
  },
  icon: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  pickerContainer: {
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalButton: {
    fontSize: 16,
    color: '#666',
  },
  modalConfirm: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

