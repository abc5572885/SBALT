import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createReport,
  REPORT_REASONS,
  ReportContentType,
  ReportReason,
} from '@/services/moderation';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  contentType: ReportContentType;
  contentId?: string | null;
  reportedUserId?: string | null;
  targetLabel?: string;
}

export function ReportModal({ visible, onClose, contentType, contentId, reportedUserId, targetLabel }: Props) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;
    try {
      setSubmitting(true);
      await createReport({
        reporterId: user.id,
        reportedUserId,
        contentType,
        contentId,
        reason,
        description: description.trim(),
      });
      Alert.alert('已收到檢舉', '我們會盡快審查，感謝您協助維護社群品質', [
        { text: '確定', onPress: () => {
          setReason(null);
          setDescription('');
          onClose();
        } },
      ]);
    } catch (error: any) {
      Alert.alert('送出失敗', error.message || '請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setReason(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <SafeAreaView edges={['bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={handleClose} activeOpacity={0.6}>
                <Text style={[styles.close, { color: colors.textSecondary }]}>取消</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.text }]}>檢舉</Text>
              <TouchableOpacity
                onPress={handleSubmit}
                activeOpacity={0.6}
                disabled={!reason || submitting}
              >
                <Text style={[styles.submit, { color: reason && !submitting ? colors.primary : colors.disabled }]}>
                  {submitting ? '送出中...' : '送出'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
              {targetLabel && (
                <Text style={[styles.target, { color: colors.textSecondary }]}>
                  檢舉對象：{targetLabel}
                </Text>
              )}

              <Text style={[styles.label, { color: colors.text }]}>檢舉原因</Text>
              <View style={styles.reasons}>
                {REPORT_REASONS.map((opt) => {
                  const selected = reason === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.reasonBtn,
                        { borderColor: colors.border },
                        selected && { backgroundColor: colors.text, borderColor: colors.text },
                      ]}
                      onPress={() => setReason(opt.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.reasonText,
                        { color: colors.textSecondary },
                        selected && { color: colors.background },
                      ]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: colors.text, marginTop: Spacing.xl }]}>補充說明（選填）</Text>
              <TextInput
                style={[styles.textarea, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                value={description}
                onChangeText={setDescription}
                placeholder="請提供更多資訊協助審查"
                placeholderTextColor={colors.disabled}
                multiline
                maxLength={500}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'right', marginTop: 4 }}>
                {description.length}/500
              </Text>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  close: {
    fontSize: 15,
    fontWeight: '500',
  },
  submit: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    padding: Spacing.xl,
  },
  target: {
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  reasons: {
    gap: Spacing.sm,
  },
  reasonBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textarea: {
    minHeight: 100,
    fontSize: 15,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    textAlignVertical: 'top',
  },
});
