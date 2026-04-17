import { CommentInput } from '@/components/CommentInput';
import { CommentList } from '@/components/CommentList';
import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  cancelRegistration,
  createRegistration,
  createWaitlistEntry,
  getComments,
  getEventById,
  getEventScores,
  getRegistrationCount,
  hasUserRegistered,
} from '@/services/database';
import { Comment, Event, EventScore } from '@/types/database';
import { scheduleEventReminder } from '@/services/notifications';
import { getWeatherForDate } from '@/services/weather';
import { formatDateChinese, formatTime } from '@/utils/dateFormat';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const [regCount, setRegCount] = useState(0);
  const [scores, setScores] = useState<EventScore[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [weather, setWeather] = useState<{ temperature: number; description: string; icon: string; isRainy: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (eventId) loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      const eventData = await getEventById(eventId);
      setEvent(eventData);

      const [count, eventScores] = await Promise.all([
        getRegistrationCount(eventId),
        getEventScores(eventId),
      ]);
      setRegCount(count);
      setScores(eventScores);

      // Load comments
      try {
        const commentsData = await getComments('event', eventId);
        setComments(commentsData);
      } catch {}

      // Load weather (only for events within 7 days)
      const eventDate = new Date(eventData.scheduled_at);
      const daysUntil = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntil >= 0 && daysUntil <= 7) {
        getWeatherForDate(eventDate).then(setWeather).catch(() => {});
      }


      if (user) {
        const isRegistered = await hasUserRegistered(user.id, eventId);
        setRegistered(isRegistered);
        // Check if waitlisted
        if (!isRegistered) {
          const { data: wl } = await supabase
            .from('registrations')
            .select('id')
            .eq('user_id', user.id)
            .eq('event_id', eventId)
            .eq('status', 'waitlisted')
            .single();
          setWaitlisted(!!wl);
        }
      }
    } catch (error) {
      console.error('載入活動失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      Alert.alert('請先登入', '報名功能需要先登入帳號');
      return;
    }
    if (!event) return;

    try {
      setSubmitting(true);

      if (regCount >= event.quota) {
        // Full — add to waitlist
        await createWaitlistEntry({
          event_id: event.id,
          user_id: user.id,
          payment_status: 'pending',
          status: 'registered', // will be overridden to 'waitlisted' in function
        });
        setWaitlisted(true);
        Alert.alert('已加入候補', '名額已滿，您已加入候補名單。有人取消時會自動遞補並通知您');
      } else {
        await createRegistration({
          event_id: event.id,
          user_id: user.id,
          payment_status: 'pending',
          status: 'registered',
        });
        setRegistered(true);
        setRegCount((prev) => prev + 1);

        scheduleEventReminder(
          event.id,
          event.title,
          event.location,
          new Date(event.scheduled_at),
          60
        );

        Alert.alert('報名成功', '您已成功報名此活動，開始前 1 小時會提醒您');
      }
    } catch (error: any) {
      if (error?.code === '23505') {
        Alert.alert('重複報名', '您已經報名過此活動');
      } else {
        Alert.alert('錯誤', error?.message || '報名失敗，請稍後再試');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!user || !event) return;

    Alert.alert('取消報名', '確定要取消報名嗎？', [
      { text: '返回', style: 'cancel' },
      {
        text: '取消報名',
        style: 'destructive',
        onPress: async () => {
          try {
            setSubmitting(true);
            await cancelRegistration(user.id, event.id);
            setRegistered(false);
            setRegCount((prev) => prev - 1);
          } catch (error: any) {
            Alert.alert('錯誤', error?.message || '操作失敗');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="活動詳情" />
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </ThemedView>
      </ScreenLayout>
    );
  }

  if (!event) {
    return (
      <ScreenLayout>
        <PageHeader title="活動詳情" />
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={{ color: colors.textSecondary }}>找不到此活動</ThemedText>
        </ThemedView>
      </ScreenLayout>
    );
  }

  const loadComments = async () => {
    try {
      const data = await getComments('event', eventId);
      setComments(data);
    } catch (err) {
      console.error('載入留言失敗:', err);
    }
  };

  const isFull = regCount >= event.quota;
  const isOrganizer = user?.id === event.organizer_id;
  const scheduledDate = new Date(event.scheduled_at);

  const handleShare = async () => {
    try {
      const dateStr = scheduledDate.toLocaleDateString('zh-TW', {
        month: 'long',
        day: 'numeric',
      });
      const timeStr = scheduledDate.toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
      });
      await Share.share({
        message: `${event.title}\n${dateStr} ${timeStr} | ${event.location}\n${regCount}/${event.quota} 人${event.fee > 0 ? ` | NT$ ${event.fee}` : ''}\n\nSBALT 報名連結：sbalt://open?event=${event.id}`,
      });
    } catch (error) {
      // User cancelled share
    }
  };

  return (
    <ScreenLayout>
      <PageHeader title="活動詳情" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Title & Status & Share */}
        <View style={styles.titleSection}>
          <View style={styles.titleTopRow}>
            <View style={[styles.statusBadge, { backgroundColor: colors.statusSuccess + '15' }]}>
              <ThemedText type="label" style={{ color: colors.statusSuccess }}>
                {event.status === 'open' ? '開放報名' : event.status}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.shareBtn, { backgroundColor: colors.secondary }]}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol name="paperplane.fill" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.title}>{event.title}</ThemedText>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
          <View style={styles.infoRow}>
            <IconSymbol name="calendar" size={16} color={colors.textSecondary} />
            <ThemedText style={styles.infoText}>
              {formatDateChinese(scheduledDate)} {formatTime(scheduledDate)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.infoRow}
            onPress={async () => {
              const query = encodeURIComponent(event.location);
              try {
                const hasGoogle = await Linking.canOpenURL('comgooglemaps://');
                if (hasGoogle) {
                  Linking.openURL(`comgooglemaps://?q=${query}`);
                  return;
                }
              } catch {}
              const fallback = Platform.select({
                ios: `maps:?q=${query}`,
                android: `geo:0,0?q=${query}`,
                default: `https://maps.google.com/?q=${query}`,
              });
              Linking.openURL(fallback);
            }}
            activeOpacity={0.6}
          >
            <IconSymbol name="location.fill" size={16} color={colors.primary} />
            <ThemedText style={[styles.infoText, { color: colors.primary }]}>{event.location}</ThemedText>
            <IconSymbol name="chevron.right" size={14} color={colors.disabled} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <IconSymbol name="person.fill" size={16} color={colors.textSecondary} />
            <ThemedText style={styles.infoText}>
              {regCount} / {event.quota} 人
              {isFull && (
                <ThemedText style={{ color: colors.error }}> （已額滿）</ThemedText>
              )}
            </ThemedText>
          </View>
          {event.fee > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <ThemedText type="caption" style={{ color: colors.textSecondary, width: 20, textAlign: 'center' }}>
                  $
                </ThemedText>
                <ThemedText style={styles.infoText}>NT$ {event.fee}</ThemedText>
              </View>
            </>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <IconSymbol name="person.fill" size={16} color={colors.textSecondary} />
            <ThemedText style={styles.infoText}>
              {isOrganizer ? '我主辦的' : '主辦人'}
            </ThemedText>
          </View>
        </View>

        {/* Weather */}
        {weather && (
          <View style={[
            styles.weatherCard,
            { backgroundColor: weather.isRainy ? colors.error + '08' : colors.primary + '08', borderColor: weather.isRainy ? colors.error + '20' : colors.border },
            Shadows.sm,
          ]}>
            <Text style={styles.weatherIcon}>{weather.icon}</Text>
            <View style={styles.weatherInfo}>
              <ThemedText style={styles.weatherTemp}>{weather.temperature}°C · {weather.description}</ThemedText>
              {weather.isRainy && (
                <ThemedText type="caption" style={{ color: colors.error }}>
                  注意：活動當天可能下雨
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {/* Scores */}
        {scores.length > 0 && (
          <View style={styles.descSection}>
            <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              比分結果
            </ThemedText>
            <View style={[styles.scoresCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
              {scores.map((s, i) => (
                <View key={s.id}>
                  {i > 0 && <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />}
                  <View style={styles.scoreRow}>
                    <Text style={[styles.scoreLabel, { color: colors.text }]}>{s.label}</Text>
                    <Text style={[styles.scoreValue, { color: i === 0 && scores[0].score >= (scores[1]?.score ?? 0) ? colors.primary : colors.text }]}>
                      {s.score}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        {event.description && (
          <View style={styles.descSection}>
            <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              活動說明
            </ThemedText>
            <ThemedText style={styles.description}>{event.description}</ThemedText>
          </View>
        )}

        {/* Comments */}
        <View style={styles.descSection}>
          <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            留言 ({comments.length})
          </ThemedText>
          <CommentInput
            entityType="event"
            entityId={eventId}
            onCommentAdded={loadComments}
          />
          {comments.length > 0 && (
            <View style={{ marginTop: Spacing.md }}>
              <CommentList comments={comments} onCommentDeleted={loadComments} />
            </View>
          )}
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      {/* Bottom action */}
      {!isOrganizer && (
        <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {registered ? (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.error, borderWidth: 1 }]}
              onPress={handleCancel}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.actionBtnText, { color: colors.error }]}>
                {submitting ? '處理中...' : '取消報名'}
              </ThemedText>
            </TouchableOpacity>
          ) : waitlisted ? (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.textSecondary, borderWidth: 1 }]}
              onPress={handleCancel}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.actionBtnText, { color: colors.textSecondary }]}>
                {submitting ? '處理中...' : '候補中 — 點擊取消'}
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                isFull
                  ? { backgroundColor: colors.secondary }
                  : { backgroundColor: colors.primary },
                !isFull && Shadows.md,
              ]}
              onPress={handleRegister}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.actionBtnText, { color: isFull ? colors.text : colors.primaryText }]}>
                {submitting ? '處理中...' : isFull ? '加入候補' : '立即報名'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  titleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
  },
  descSection: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  weatherIcon: {
    fontSize: 32,
  },
  weatherInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  weatherTemp: {
    fontSize: 16,
    fontWeight: '600',
  },
  scoresCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 36,
  },
  scoreDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
  },
  actionBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
