import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permission. Returns true if granted.
 * Wrapped in try/catch — on simulators without code signing, the underlying
 * Keychain/push-registration call can throw and crash app start.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[notifications] permission request failed (likely no code signing):', e);
    return false;
  }
}

/**
 * Check if notification permission is granted
 */
export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a notification before an event starts
 */
export async function scheduleEventReminder(
  eventId: string,
  title: string,
  location: string,
  scheduledAt: Date,
  minutesBefore: number = 60
): Promise<string | null> {
  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return null;

  const triggerDate = new Date(scheduledAt.getTime() - minutesBefore * 60 * 1000);

  // Don't schedule if trigger time is in the past
  if (triggerDate <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${title} 即將開始`,
      body: `${location} · ${minutesBefore >= 60 ? `${minutesBefore / 60} 小時後` : `${minutesBefore} 分鐘後`}開始`,
      data: { eventId },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

/**
 * Cancel a scheduled notification
 */
export async function cancelEventReminder(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Send an immediate local notification
 */
export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: null, // immediate
  });
}
