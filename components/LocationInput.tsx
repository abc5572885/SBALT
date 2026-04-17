import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { searchPlaces } from '@/services/places';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function LocationInput({ value, onChange, placeholder = '搜尋場地或地址', disabled }: LocationInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<{ placeId: string; description: string; mainText: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    onChange(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        const results = await searchPlaces(text);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [onChange]);

  const handleSelect = (item: { description: string }) => {
    setQuery(item.description);
    onChange(item.description);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
        value={query}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        editable={!disabled}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
      />
      {showSuggestions && (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.md]}>
          {suggestions.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.placeId}
              style={[styles.suggestion, { borderBottomColor: colors.border }]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.6}
            >
              <ThemedText style={styles.mainText} numberOfLines={1}>{item.mainText}</ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
                {item.description}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.xs,
    overflow: 'hidden',
    zIndex: 999,
    elevation: 10,
  },
  suggestion: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  mainText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
