import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { searchPlaces } from '@/services/places';
import { getPlaceDetails } from '@/services/placesSearch';
import { searchPublicVenues, upsertVenueFromGooglePlace, Venue } from '@/services/venues';
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
  text: string; // display text (venue.name OR free text fallback)
}

interface Props {
  value: VenuePickerValue;
  onChange: (value: VenuePickerValue) => void;
  placeholder?: string;
}

interface GoogleSuggestion {
  placeId: string;
  description: string;
  mainText: string;
}

export function VenuePicker({ value, onChange, placeholder = '搜尋場地名稱或地址' }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sbaltResults, setSbaltResults] = useState<Venue[]>([]);
  const [googleResults, setGoogleResults] = useState<GoogleSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [upserting, setUpserting] = useState<string | null>(null); // placeId currently being upserted

  // Search both SBALT venues and Google Places when query changes
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const [sbalt, google] = await Promise.all([
          searchPublicVenues(query, 10),
          query.trim().length >= 2 ? searchPlaces(query) : Promise.resolve([]),
        ]);
        setSbaltResults(sbalt);
        setGoogleResults(google);
      } catch {
        setSbaltResults([]);
        setGoogleResults([]);
      } finally {
        setLoading(false);
      }
    }, 200); // debounce
    return () => clearTimeout(handle);
  }, [open, query]);

  const handleSelectSbalt = (v: Venue) => {
    onChange({ venue_id: v.id, text: v.name });
    setOpen(false);
  };

  const handleSelectGoogle = async (g: GoogleSuggestion) => {
    if (upserting) return;
    setUpserting(g.placeId);
    try {
      const details = await getPlaceDetails(g.placeId);
      if (!details) {
        throw new Error('無法取得地點詳情');
      }
      const venue = await upsertVenueFromGooglePlace(details);
      onChange({ venue_id: venue.id, text: venue.name });
      setOpen(false);
    } catch (e: any) {
      console.error('upsert venue failed:', e);
    } finally {
      setUpserting(null);
    }
  };

  const handleClear = () => {
    onChange({ venue_id: null, text: '' });
  };

  // Dedup: drop Google places whose place_id matches a SBALT venue we have
  const sbaltGoogleIds = new Set(sbaltResults.map((v) => v.google_place_id).filter(Boolean));
  const googleFiltered = googleResults.filter((g) => !sbaltGoogleIds.has(g.placeId));

  const isLinked = !!value.venue_id;
  const hasResults = sbaltResults.length > 0 || googleFiltered.length > 0;

  return (
    <>
      <TouchableOpacity
        style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() => {
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

            <View style={{ padding: Spacing.xl, paddingBottom: Spacing.md }}>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                ]}
                value={query}
                onChangeText={setQuery}
                placeholder={placeholder}
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoFocus
              />
            </View>

            <ScrollView style={styles.list} contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl }}>
              {/* SBALT venues section */}
              {sbaltResults.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SBALT 場地</Text>
                  {sbaltResults.map((v) => (
                    <TouchableOpacity
                      key={`sbalt-${v.id}`}
                      style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
                      onPress={() => handleSelectSbalt(v)}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.icon, { backgroundColor: colors.text }]}>
                        <IconSymbol name="location.fill" size={12} color={colors.background} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                          {v.name}
                        </Text>
                        {v.address && (
                          <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                            {v.address}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Google Places section */}
              {googleFiltered.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: sbaltResults.length > 0 ? Spacing.lg : 0 }]}>
                    Google 地點
                  </Text>
                  {googleFiltered.map((g) => {
                    const isUpserting = upserting === g.placeId;
                    return (
                      <TouchableOpacity
                        key={`google-${g.placeId}`}
                        style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        onPress={() => handleSelectGoogle(g)}
                        activeOpacity={0.6}
                        disabled={!!upserting}
                      >
                        <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
                          <IconSymbol name="magnifyingglass" size={12} color={colors.textSecondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                            {g.mainText}
                          </Text>
                          <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                            {g.description}
                          </Text>
                        </View>
                        {isUpserting && <ActivityIndicator size="small" color={colors.text} />}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {/* Loading */}
              {loading && (
                <View style={styles.center}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}

              {/* Empty */}
              {!loading && !hasResults && query.trim().length >= 2 && (
                <View style={styles.center}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>找不到符合的場地</Text>
                </View>
              )}

              {/* Initial hint */}
              {!loading && !hasResults && query.trim().length < 2 && (
                <View style={styles.center}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
                    輸入場地名稱或地址{'\n'}例：新科運動中心 / 大安森林公園
                  </Text>
                </View>
              )}
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  center: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
});
