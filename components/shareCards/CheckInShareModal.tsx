import { CheckInShareCard } from '@/components/shareCards/CheckInShareCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CheckIn } from '@/services/checkIns';
import { captureAndShare } from '@/services/shareCard';
import { toast } from '@/store/useToast';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  checkIn: CheckIn | null;
  displayName: string;
  onClose: () => void;
}

export function CheckInShareModal({ visible, checkIn, displayName, onClose }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    try {
      setSharing(true);
      const ok = await captureAndShare(cardRef);
      if (!ok) toast.error('此裝置不支援分享');
    } catch (e: any) {
      toast.error(e.message || '分享失敗');
    } finally {
      setSharing(false);
    }
  };

  if (!checkIn) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>分享打卡</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.6}>
              <IconSymbol name="xmark" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.cardWrap}>
            <CheckInShareCard ref={cardRef} checkIn={checkIn} displayName={displayName} />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.shareBtn,
                { backgroundColor: colors.text },
                sharing && { opacity: 0.6 },
              ]}
              onPress={handleShare}
              disabled={sharing}
              activeOpacity={0.85}
            >
              {sharing ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <IconSymbol name="square.and.arrow.up" size={18} color={colors.background} />
                  <Text style={[styles.shareBtnText, { color: colors.background }]}>
                    分享到社群
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 0.85 }],
    marginVertical: -32,
  },
  actionRow: {
    width: '100%',
    marginTop: Spacing.lg,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
