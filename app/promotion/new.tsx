import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createPromotion, updatePromotion } from '@/services/promotions';
import { pickAndUploadPromotionImage } from '@/services/promotionImage';
import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const TYPE_OPTIONS = [
  { key: 'venue', label: '場地' },
  { key: 'brand', label: '品牌' },
] as const;

export default function NewPromotionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    editId?: string;
    editType?: string;
    editTitle?: string;
    editDescription?: string;
    editLocation?: string;
    editLinkUrl?: string;
    editSportType?: string;
    editImageUrl?: string;
  }>();
  const isEditing = !!params.editId;

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, loading: authLoading } = useAuth();

  const [type, setType] = useState<'venue' | 'brand'>(
    (params.editType === 'venue' || params.editType === 'brand') ? params.editType : 'venue'
  );
  const [title, setTitle] = useState(params.editTitle || '');
  const [description, setDescription] = useState(params.editDescription || '');
  const [location, setLocation] = useState(params.editLocation || '');
  const [linkUrl, setLinkUrl] = useState(params.editLinkUrl || '');
  const [sportType, setSportType] = useState<string | null>(params.editSportType || null);
  const [imageUrl, setImageUrl] = useState<string | null>(params.editImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <ScreenLayout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const handlePickImage = async () => {
    if (uploading) return;
    try {
      setUploading(true);
      const url = await pickAndUploadPromotionImage(user.id);
      if (url) setImageUrl(url);
    } catch (error) {
      console.error('圖片上傳失敗:', error);
      Alert.alert('錯誤', '圖片上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('驗證失敗', '請輸入標題');
      return;
    }

    try {
      setLoading(true);

      const data = {
        type,
        title: title.trim(),
        description: description.trim() || null,
        image_url: imageUrl,
        link_url: linkUrl.trim() || null,
        location: location.trim() || null,
        sport_type: sportType,
      };

      if (isEditing) {
        await updatePromotion(params.editId!, data);
        Alert.alert('成功', '推廣資訊已更新', [
          { text: '確定', onPress: () => router.back() },
        ]);
      } else {
        await createPromotion({
          ...data,
          user_id: user.id,
          is_featured: false,
          status: 'active',
        });
        Alert.alert('成功', '推廣資訊已發布', [
          { text: '確定', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error(isEditing ? '更新失敗:' : '發布失敗:', error);
      Alert.alert('錯誤', isEditing ? '更新失敗，請稍後再試' : '發布失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }];

  return (
    <ScreenLayout scrollable>
      <PageHeader title={isEditing ? '編輯推廣資訊' : '發布推廣資訊'} />

      {/* Type selector */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={styles.label}>類型</ThemedText>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.typeBtn,
                { borderColor: colors.border },
                type === opt.key && { backgroundColor: colors.text, borderColor: colors.text },
              ]}
              onPress={() => setType(opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.typeBtnText,
                { color: colors.textSecondary },
                type === opt.key && { color: colors.background },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Cover image */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={styles.label}>封面圖片（選填）</ThemedText>
        <TouchableOpacity
          style={[styles.imagePicker, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={handlePickImage}
          activeOpacity={0.7}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.previewImage} contentFit="cover" />
          ) : uploading ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <View style={styles.imagePickerPlaceholder}>
              <IconSymbol name="plus" size={24} color={colors.disabled} />
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>點擊上傳圖片</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={styles.label}>標題</ThemedText>
        <TextInput
          style={inputStyle}
          value={title}
          onChangeText={setTitle}
          placeholder={type === 'venue' ? '例：竹北國民運動中心' : '例：Nike 運動裝備'}
          placeholderTextColor={colors.disabled}
        />
      </View>

      {/* Description */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={styles.label}>描述（選填）</ThemedText>
        <TextInput
          style={[...inputStyle, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="詳細說明..."
          placeholderTextColor={colors.disabled}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Location */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={styles.label}>地點（選填）</ThemedText>
        <TextInput
          style={inputStyle}
          value={location}
          onChangeText={setLocation}
          placeholder="例：新竹市東區"
          placeholderTextColor={colors.disabled}
        />
      </View>

      {/* Link */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={styles.label}>連結（選填）</ThemedText>
        <TextInput
          style={inputStyle}
          value={linkUrl}
          onChangeText={setLinkUrl}
          placeholder="https://..."
          placeholderTextColor={colors.disabled}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>

      {/* Sport type */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={styles.label}>運動類型（選填）</ThemedText>
        <View style={styles.sportRow}>
          {SPORT_OPTIONS.filter((s) => s.key !== 'other').map((sport) => (
            <TouchableOpacity
              key={sport.key}
              style={[
                styles.sportBtn,
                { borderColor: colors.border },
                sportType === sport.key && { backgroundColor: colors.text, borderColor: colors.text },
              ]}
              onPress={() => setSportType(sportType === sport.key ? null : sport.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.sportBtnText,
                { color: colors.textSecondary },
                sportType === sport.key && { color: colors.background },
              ]}>
                {sport.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.text }, Shadows.sm]}
        onPress={handleSubmit}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.background} />
        ) : (
          <Text style={[styles.submitText, { color: colors.background }]}>
            {isEditing ? '儲存' : '發布'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imagePicker: {
    height: 160,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    fontSize: 15,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },
  sportRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sportBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  sportBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
