import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Pick an image from library, upload to Supabase Storage, return public URL
 */
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  // Request permission
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('權限不足', '需要相簿存取權限才能上傳頭像');
    return null;
  }

  // Pick image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${userId}.${fileExt}`;

  // Read file as arraybuffer (React Native doesn't support blob)
  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();

  // Upload to Supabase Storage (upsert to overwrite existing)
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, arrayBuffer, {
      contentType: asset.mimeType || `image/${fileExt}`,
      upsert: true,
    });

  if (uploadError) {
    console.error('上傳失敗:', uploadError);
    Alert.alert('上傳失敗', uploadError.message);
    return null;
  }

  // Get public URL
  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  // Save URL to user metadata so it persists across sessions
  await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  });

  return publicUrl;
}
