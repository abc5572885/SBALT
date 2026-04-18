import * as Calendar from 'expo-calendar';
import { Alert, Platform } from 'react-native';

/**
 * Add an event to the device's native calendar
 */
export async function addToDeviceCalendar(
  title: string,
  location: string,
  startDate: Date,
  notes?: string
): Promise<boolean> {
  // Request permission
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('權限不足', '需要行事曆存取權限');
    return false;
  }

  // Get default calendar
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCalendar = Platform.OS === 'ios'
    ? calendars.find((c) => c.source?.name === 'iCloud' || c.source?.name === 'Default') || calendars[0]
    : calendars.find((c) => c.isPrimary) || calendars[0];

  if (!defaultCalendar) {
    Alert.alert('錯誤', '找不到行事曆');
    return false;
  }

  try {
    // Event duration: 2 hours by default
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    await Calendar.createEventAsync(defaultCalendar.id, {
      title,
      location,
      startDate,
      endDate,
      notes: notes || 'SBALT 活動',
      alarms: [{ relativeOffset: -60 }], // Remind 1 hour before
    });

    return true;
  } catch (error) {
    console.error('行事曆新增失敗:', error);
    return false;
  }
}
