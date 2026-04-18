import { formatRegion, parseRegion, REGION_GROUPS } from '@/constants/regions';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  value: string | null;
  onChange: (region: string | null) => void;
  placeholder?: string;
}

export function RegionPicker({ value, onChange, placeholder = '選擇活動區域' }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [open, setOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setSelectedCity(null);
  }, [open]);

  const handleSelectArea = (city: string, area: string) => {
    onChange(formatRegion(city, area));
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setOpen(false);
  };

  const currentGroup = REGION_GROUPS.find((g) => g.city === selectedCity);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.field,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={{ color: value ? colors.text : colors.disabled, fontSize: 15 }}>
          {value || placeholder}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setOpen(false)}
          />
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <SafeAreaView edges={['bottom']}>
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                {selectedCity ? (
                  <TouchableOpacity onPress={() => setSelectedCity(null)} activeOpacity={0.6}>
                    <Text style={[styles.close, { color: colors.textSecondary }]}>‹ 返回</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 60 }} />
                )}
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {selectedCity ? `選擇 ${selectedCity} 區域` : '選擇縣市'}
                </Text>
                <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.6}>
                  <Text style={[styles.close, { color: colors.textSecondary }]}>關閉</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.content}>
                {!selectedCity ? (
                  <>
                    {REGION_GROUPS.map((group) => {
                      const isCurrent = parseRegion(value)?.city === group.city;
                      return (
                        <TouchableOpacity
                          key={group.city}
                          style={[
                            styles.cityRow,
                            { borderBottomColor: colors.border },
                          ]}
                          onPress={() => setSelectedCity(group.city)}
                          activeOpacity={0.6}
                        >
                          <Text style={[styles.cityText, { color: colors.text }]}>
                            {group.city}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                            {isCurrent && (
                              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                                {parseRegion(value)?.area}
                              </Text>
                            )}
                            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {value && (
                      <TouchableOpacity
                        style={[styles.clearBtn, { borderColor: colors.border }]}
                        onPress={handleClear}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.clearText, { color: colors.error }]}>清除選擇</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.grid}>
                    {currentGroup?.areas.map((area) => {
                      const selected = value === formatRegion(selectedCity, area);
                      return (
                        <TouchableOpacity
                          key={area}
                          style={[
                            styles.areaBtn,
                            { borderColor: colors.border },
                            selected && { backgroundColor: colors.text, borderColor: colors.text },
                          ]}
                          onPress={() => handleSelectArea(selectedCity, area)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.areaText,
                            { color: colors.textSecondary },
                            selected && { color: colors.background },
                          ]}>
                            {area}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  close: {
    fontSize: 15,
    fontWeight: '500',
    width: 60,
  },
  content: {
    padding: Spacing.xl,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  areaBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  areaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearBtn: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
