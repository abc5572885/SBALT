import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VenuePicker, VenuePickerValue } from '@/components/VenuePicker';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  CHECK_IN_FIELDS,
  CheckInPartner,
  createCheckIn,
  getUserTaggingPrivacy,
} from '@/services/checkIns';
import { searchUsersByUsername } from '@/services/tournamentTeams';
import { toast } from '@/store/useToast';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface PartnerEntry extends CheckInPartner {
  display_name?: string | null;
  username?: string | null;
}

export default function NewCheckInScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [sportType, setSportType] = useState('basketball');
  const [playedAt, setPlayedAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [venue, setVenue] = useState<VenuePickerValue>({ venue_id: null, text: '' });
  const [statValues, setStatValues] = useState<Record<string, string>>({});
  const [partners, setPartners] = useState<PartnerEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [saving, setSaving] = useState(false);

  // 搜尋同伴 modal
  const [partnerSearchOpen, setPartnerSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string | null; username: string | null }[]>([]);

  const fields = CHECK_IN_FIELDS[sportType] || CHECK_IN_FIELDS.basketball;
  const mainFields = fields.filter((f) => f.category === 'main');
  const optionalFields = fields.filter((f) => f.category === 'optional');

  const updateStat = (key: string, value: string) => {
    setStatValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearchPartner = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const exclude = [user?.id, ...partners.map((p) => p.user_id)].filter(Boolean) as string[];
    const results = await searchUsersByUsername(q.trim(), exclude);
    setSearchResults(results);
  };

  const addPartner = async (u: { id: string; display_name: string | null; username: string | null }) => {
    const privacy = await getUserTaggingPrivacy(u.id);
    setPartners((prev) => [
      ...prev,
      {
        user_id: u.id,
        display_name: u.display_name,
        username: u.username,
        status: privacy === 'public' ? 'accepted' : 'pending',
      },
    ]);
    setPartnerSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removePartner = (uid: string) => {
    setPartners((prev) => prev.filter((p) => p.user_id !== uid));
  };

  const handleSave = async () => {
    if (!user) return;
    // Validate required fields
    for (const f of mainFields) {
      if (f.required && !statValues[f.key]?.trim()) {
        toast.error(`請填寫「${f.label}」`);
        return;
      }
    }

    // Build stats object（過濾空值，轉成數字）
    const stats: Record<string, number> = {};
    for (const f of fields) {
      const v = statValues[f.key];
      if (v && v.trim() !== '') {
        const num = parseInt(v, 10);
        if (!isNaN(num)) stats[f.key] = num;
      }
    }

    try {
      setSaving(true);
      const created = await createCheckIn({
        user_id: user.id,
        sport_type: sportType,
        played_at: playedAt.toISOString(),
        location: venue.text.trim() || undefined,
        venue_id: venue.venue_id,
        stats: Object.keys(stats).length > 0 ? stats : undefined,
        partners: partners.length > 0
          ? partners.map((p) => ({ user_id: p.user_id, status: p.status }))
          : undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('打卡成功');
      router.replace({
        pathname: '/check-in/[id]',
        params: { id: created.id, share: '1' },
      });
    } catch (error: any) {
      toast.error(error.message || '打卡失敗');
    } finally {
      setSaving(false);
    }
  };

  const dateStr = playedAt.toLocaleString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <ScreenLayout scrollable>
      <PageHeader title="打卡" />

      {/* Sport selector */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
          運動類型
        </ThemedText>
        <View style={styles.sportRow}>
          {SPORT_OPTIONS.filter((s) => s.key !== 'other' && s.key !== 'running').map((s) => {
            const selected = sportType === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.sportChip,
                  { borderColor: colors.border },
                  selected && { backgroundColor: colors.text, borderColor: colors.text },
                ]}
                onPress={() => {
                  setSportType(s.key);
                  setStatValues({});
                  setShowOptional(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.sportText,
                  { color: colors.textSecondary },
                  selected && { color: colors.background },
                ]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Date/time */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
          時間
        </ThemedText>
        <TouchableOpacity
          style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.text, fontSize: 15 }}>{dateStr}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DateTimePicker
              value={playedAt}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant={colorScheme ?? 'light'}
              textColor={colors.text}
              locale="zh-Hant-TW"
              maximumDate={new Date()}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShowDatePicker(false);
                if (d) setPlayedAt(d);
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.iosConfirm, { backgroundColor: colors.text }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={{ color: colors.background, fontWeight: '600' }}>確定</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Location / Venue */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
          地點
        </ThemedText>
        <VenuePicker value={venue} onChange={setVenue} />
      </View>

      {/* Main stats */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
          數據
        </ThemedText>
        <View style={styles.statsGrid}>
          {mainFields.map((f) => (
            <View key={f.key} style={styles.statField}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {f.label}{f.required ? ' *' : ''}
              </Text>
              <TextInput
                style={[styles.statInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={statValues[f.key] || ''}
                onChangeText={(v) => updateStat(f.key, v)}
                placeholder="0"
                placeholderTextColor={colors.disabled}
                keyboardType="number-pad"
              />
            </View>
          ))}
        </View>

        {optionalFields.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.toggleOptional}
              onPress={() => setShowOptional((v) => !v)}
              activeOpacity={0.6}
            >
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                {showOptional ? '收起細項' : '展開細項（選填）'}
              </Text>
            </TouchableOpacity>
            {showOptional && (
              <View style={styles.statsGrid}>
                {optionalFields.map((f) => (
                  <View key={f.key} style={styles.statField}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{f.label}</Text>
                    <TextInput
                      style={[styles.statInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                      value={statValues[f.key] || ''}
                      onChangeText={(v) => updateStat(f.key, v)}
                      placeholder="0"
                      placeholderTextColor={colors.disabled}
                      keyboardType="number-pad"
                    />
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {/* Partners */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
          同伴標記
        </ThemedText>
        {partners.length > 0 && (
          <View style={styles.partnerList}>
            {partners.map((p) => (
              <View
                key={p.user_id}
                style={[styles.partnerChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>
                  {p.display_name || p.username || '用戶'}
                </Text>
                <Text style={{
                  color: p.status === 'accepted' ? colors.statusSuccess : colors.textSecondary,
                  fontSize: 11,
                }}>
                  {p.status === 'accepted' ? '已標記' : '待確認'}
                </Text>
                <TouchableOpacity
                  onPress={() => removePartner(p.user_id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={[styles.addPartnerBtn, { borderColor: colors.border }]}
          onPress={() => setPartnerSearchOpen(true)}
          activeOpacity={0.7}
        >
          <IconSymbol name="plus" size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
            從用戶名搜尋加入
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notes */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
          心得
        </ThemedText>
        <TextInput
          style={[styles.input, styles.notesInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="今天打得如何？（選填）"
          placeholderTextColor={colors.placeholder}
          multiline
          maxLength={300}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }, Shadows.sm, saving && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.7}
      >
        <Text style={styles.saveText}>{saving ? '儲存中...' : '完成打卡'}</Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />

      {/* Partner search modal */}
      <Modal
        visible={partnerSearchOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => setPartnerSearchOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPartnerSearchOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>搜尋同伴</Text>
              <TouchableOpacity onPress={() => setPartnerSearchOpen(false)}>
                <Text style={{ color: colors.textSecondary }}>關閉</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: Spacing.xl }}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={searchQuery}
                onChangeText={handleSearchPartner}
                placeholder="輸入名字或 username（至少 2 字）"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
              />
              <ScrollView style={{ maxHeight: 320, marginTop: Spacing.md }}>
                {searchResults.length === 0 && searchQuery.length >= 2 ? (
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.xl }}>
                    沒找到符合的用戶
                  </Text>
                ) : (
                  searchResults.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.searchItem, { borderColor: colors.border }]}
                      onPress={() => addPartner(u)}
                      activeOpacity={0.6}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                          {u.display_name || u.username}
                        </Text>
                        {u.username && (
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>@{u.username}</Text>
                        )}
                      </View>
                      <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>加入</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { marginBottom: Spacing.xl, gap: Spacing.sm },
  label: { textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  sportRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  sportChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  sportText: { fontSize: 13, fontWeight: '600' },
  dateBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pickerWrap: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iosConfirm: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  statField: { flex: 1, minWidth: 80, gap: 6 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  toggleOptional: { paddingVertical: Spacing.sm, alignItems: 'flex-start' },
  partnerList: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addPartnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  saveBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  saveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
});
