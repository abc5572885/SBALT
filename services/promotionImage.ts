import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export async function pickAndUploadPromotionImage(userId: string): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('權限不足', '需要相簿存取權限');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('promotion-images')
    .upload(filePath, arrayBuffer, {
      contentType: asset.mimeType || `image/${fileExt}`,
      upsert: true,
    });

  if (uploadError) {
    Alert.alert('上傳失敗', uploadError.message);
    return null;
  }

  const { data } = supabase.storage.from('promotion-images').getPublicUrl(filePath);
  return data.publicUrl;
}
