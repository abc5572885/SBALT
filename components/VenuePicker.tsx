import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { searchPublicVenues, Venue } from '@/services/venues';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export interface VenuePickerValue {
  venue_id: string | null;
  text: string;          // display text (venue.name OR free text)
}

interface Props {
  value: VenuePickerValue;
  onChange: (value: VenuePickerValue) => void;
  placeholder?: string;
}

export function VenuePicker({ value, onChange, placeholder = '例：新竹國民運動中心' }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Venue[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [freeText, setFreeText] = useState(value.text);

  // Load on open
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    searchPublicVenues(query, 30)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [open, query]);

  const handleSelectVenue = (v: Venue) => {
    onChange({ venue_id: v.id, text: v.name });
    setOpen(false);
  };

  const handleSaveFreeText = () => {
    onChange({ venue_id: null, text: freeText.trim() });
    setOpen(false);
  };

  const handleClear = () => {
    setFreeText('');
    onChange({ venue_id: null, text: '' });
  };

  const isLinked = !!value.venue_id;

  return (
    <>
      <TouchableOpacity
        style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() => {
          setFreeText(value.text);
          setQuery('');
          setOpen(true);
        }}
        activeOpacity={0.6}
      >
        <View style={styles.fieldLeft}>
          {isLinked && (
            <View style={[styles.linkedBadge, { backgroundColor: colors.primary + '20' }]}>
              <IconSymbol name="location.fill" size={11} color={colors.primary} />
            </View>
          )}
          <Text
            style={[
              styles.fieldText,
              { color: value.text ? colors.text : colors.placeholder },
            ]}
            numberOfLines={1}
          >
            {value.text || placeholder}
          </Text>
        </View>
        {value.text ? (
          <TouchableOpacity onPress={handleClear} hitSlop={10} activeOpacity={0.6}>
            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        ) : (
          <IconSymbol name="chevron.right" size={14} color={colors.disabled} />
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>選擇場地</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10} activeOpacity={0.6}>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>關閉</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: Spacing.xl, paddingBottom: 0 }}>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                ]}
                value={query}
                onChangeText={setQuery}
                placeholder="搜尋場地名稱 / 地址 / 地區"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
              />
            </View>

            <ScrollView style={styles.list} contentContainerStyle={{ padding: Spacing.xl }}>
              {loading ? (
                <View style={styles.center}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : results && results.length > 0 ? (
                results.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.venueRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={() => handleSelectVenue(v)}
                    activeOpacity={0.6}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.venueName, { color: colors.text }]} numberOfLines={1}>
                        {v.name}
                      </Text>
                      {v.address && (
                        <Text style={[styles.venueMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                          {v.address}
                        </Text>
                      )}
                    </View>
                    <IconSymbol name="chevron.right" size={14} color={colors.disabled} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.center}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    {query.trim() ? '沒找到符合的場地' : '尚無公開場地'}
                  </Text>
                </View>
              )}

              {/* Fallback: free text */}
              <View style={[styles.fallbackBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.fallbackTitle, { color: colors.textSecondary }]}>
                  找不到場地？保留為自由文字
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      marginTop: Spacing.sm,
                    },
                  ]}
                  value={freeText}
                  onChangeText={setFreeText}
                  placeholder={placeholder}
                  placeholderTextColor={colors.placeholder}
                />
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: freeText.trim() ? colors.text : colors.disabled },
                  ]}
                  onPress={handleSaveFreeText}
                  disabled={!freeText.trim()}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.background, fontWeight: '700', fontSize: 14 }}>
                    使用此文字
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    minHeight: 48,
  },
  fieldLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fieldText: {
    flex: 1,
    fontSize: 15,
  },
  linkedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  list: { flexGrow: 0 },
  center: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  venueName: { fontSize: 15, fontWeight: '600' },
  venueMeta: { fontSize: 12, marginTop: 2 },
  fallbackBox: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  fallbackTitle: { fontSize: 12, fontWeight: '600' },
  saveBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
});
