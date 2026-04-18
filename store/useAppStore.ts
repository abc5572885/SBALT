/**
 * 全域狀態管理（使用 Zustand）
 * 管理用戶狀態、主題、通知偏好等
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface NotificationPreferences {
  gameStart: boolean;
  scoreUpdate: boolean;
  commentReply: boolean;
  eventReminder: boolean;
  newsUpdate: boolean;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AppState {
  // 用戶狀態
  user: User | null;
  isAuthenticated: boolean;

  // 主題設定
  themeMode: ThemeMode;

  // 選擇的運動
  selectedSport: string;

  // 通知偏好
  notificationPreferences: NotificationPreferences;

  // Actions
  setUser: (user: User | null) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setSelectedSport: (sport: string) => void;
  setNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void) => ({
      // 初始狀態
      user: null,
      isAuthenticated: false,
      themeMode: 'auto',
      selectedSport: 'all',
      notificationPreferences: {
        gameStart: true,
        scoreUpdate: true,
        commentReply: true,
        eventReminder: true,
        newsUpdate: false,
      },

      // Actions
      setUser: (user: User | null) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),

      setSelectedSport: (sport: string) => set({ selectedSport: sport }),

      setNotificationPreferences: (prefs: Partial<NotificationPreferences>) =>
        set((state: AppState) => ({
          notificationPreferences: {
            ...state.notificationPreferences,
            ...prefs,
          },
        })),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'spalt-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: AppState) => ({
        themeMode: state.themeMode,
        selectedSport: state.selectedSport,
        notificationPreferences: state.notificationPreferences,
        // 不持久化用戶資料，由 Supabase Auth 處理
      }),
    }
  )
);

