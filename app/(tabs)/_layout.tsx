/**
 * Protected Tabs Layout with center SBALT button
 */

import { Redirect, Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store/useAppStore';
import * as Haptics from 'expo-haptics';

function CenterButton() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { selectedSport, setSelectedSport } = useAppStore();
  const [showPicker, setShowPicker] = useState(false);

  const handleSportSelect = (sportKey: string) => {
    setShowPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedSport(sportKey);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.centerButton, { backgroundColor: colors.text }, Shadows.lg]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowPicker(true);
        }}
        activeOpacity={0.8}
      >
        <Text style={[styles.centerButtonText, { color: colors.background }]}>S</Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={[styles.pickerContainer, { backgroundColor: colors.background }, Shadows.lg]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>選擇運動</Text>
            <View style={styles.sportGrid}>
              {[{ key: 'all', label: '全部' }, ...SPORT_OPTIONS.filter((s) => s.key !== 'other')].map((sport) => (
                <TouchableOpacity
                  key={sport.key}
                  style={[
                    styles.sportCard,
                    { backgroundColor: colors.surface },
                    selectedSport === sport.key && { backgroundColor: colors.text },
                  ]}
                  onPress={() => handleSportSelect(sport.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.sportLabel,
                    { color: colors.text },
                    selectedSport === sport.key && { color: colors.background },
                  ]}>
                    {sport.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBar,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="scores"
        options={{
          title: '社群',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="center"
        options={{
          title: '',
          tabBarButton: () => <CenterButton />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '數據',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: '發現',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 88,
    paddingBottom: 28,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    alignSelf: 'center',
  },
  centerButtonText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  sportGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  sportCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
  },
  sportLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
