import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReportModal } from '@/components/ReportModal';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { blockUser, isBlocked, unblockUser } from '@/services/moderation';
import React, { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  targetUserId: string;
  targetLabel?: string;
  contentType?: 'user' | 'comment' | 'event' | 'promotion';
  contentId?: string;
  onBlocked?: () => void;
  /** Render prop for the trigger element; defaults to three-dot icon */
  trigger?: (onPress: () => void) => React.ReactNode;
  /** Size of default trigger icon */
  iconSize?: number;
}

export function UserActionMenu({
  targetUserId,
  targetLabel,
  contentType = 'user',
  contentId,
  onBlocked,
  trigger,
  iconSize = 18,
}: Props) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [androidMenuOpen, setAndroidMenuOpen] = useState(false);

  useEffect(() => {
    if (user && targetUserId) {
      isBlocked(user.id, targetUserId).then(setBlocked).catch(() => {});
    }
  }, [user, targetUserId]);

  const isSelf = user?.id === targetUserId;

  const handleReport = () => {
    setReportOpen(true);
  };

  const handleBlockToggle = () => {
    if (!user) return;
    if (blocked) {
      Alert.alert('解除封鎖', `確定要解除對 ${targetLabel || '此用戶'} 的封鎖嗎？`, [
        { text: '取消', style: 'cancel' },
        {
          text: '解除',
          onPress: async () => {
            try {
              await unblockUser(user.id, targetUserId);
              setBlocked(false);
            } catch (e: any) {
              Alert.alert('失敗', e.message || '請稍後再試');
            }
          },
        },
      ]);
    } else {
      Alert.alert('封鎖用戶', `封鎖後將不會看到 ${targetLabel || '此用戶'} 的留言與活動`, [
        { text: '取消', style: 'cancel' },
        {
          text: '封鎖',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(user.id, targetUserId);
              setBlocked(true);
              onBlocked?.();
            } catch (e: any) {
              Alert.alert('失敗', e.message || '請稍後再試');
            }
          },
        },
      ]);
    }
  };

  const handlePress = () => {
    if (isSelf) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['取消', '檢舉', blocked ? '解除封鎖' : '封鎖用戶'],
          destructiveButtonIndex: blocked ? undefined : 2,
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) handleReport();
          else if (index === 2) handleBlockToggle();
        }
      );
    } else {
      setAndroidMenuOpen(true);
    }
  };

  if (isSelf) return null;

  return (
    <>
      {trigger ? (
        trigger(handlePress)
      ) : (
        <TouchableOpacity
          onPress={handlePress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}
        >
          <IconSymbol name="ellipsis" size={iconSize} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        contentType={contentType}
        contentId={contentId}
        reportedUserId={targetUserId}
        targetLabel={targetLabel}
      />

      {/* Android fallback menu */}
      <Modal
        visible={androidMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAndroidMenuOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setAndroidMenuOpen(false)}>
          <View style={[styles.menu, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setAndroidMenuOpen(false); handleReport(); }}
              activeOpacity={0.6}
            >
              <Text style={[styles.menuText, { color: colors.text }]}>檢舉</Text>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setAndroidMenuOpen(false); handleBlockToggle(); }}
              activeOpacity={0.6}
            >
              <Text style={[styles.menuText, { color: blocked ? colors.text : colors.error }]}>
                {blocked ? '解除封鎖' : '封鎖用戶'}
              </Text>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setAndroidMenuOpen(false)}
              activeOpacity={0.6}
            >
              <Text style={[styles.menuText, { color: colors.textSecondary }]}>取消</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    minWidth: 240,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
