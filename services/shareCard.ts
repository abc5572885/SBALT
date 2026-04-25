import * as Sharing from 'expo-sharing';
import { RefObject } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Capture a View ref to a PNG and trigger system share sheet.
 * Returns true if share dialog was opened, false otherwise.
 */
export async function captureAndShare(viewRef: RefObject<View | null>): Promise<boolean> {
  if (!viewRef.current) return false;

  const uri = await captureRef(viewRef, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });

  const available = await Sharing.isAvailableAsync();
  if (!available) return false;

  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: '分享打卡',
    UTI: 'public.png',
  });
  return true;
}
