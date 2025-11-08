/**
 * Supabase 認證 Hook
 * 管理用戶認證狀態與 Supabase session
 */

import { supabase } from '@/lib/supabase';
import { useAppStore, User } from '@/store/useAppStore';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { setUser, logout: logoutStore } = useAppStore();

  // 將 Supabase User 轉換為 App User
  const mapSupabaseUserToAppUser = async (supabaseUser: any): Promise<User | null> => {
    if (!supabaseUser) return null;

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
      avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
    };
  };

  // 初始化：檢查現有 session
  useEffect(() => {
    // 取得當前 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        mapSupabaseUserToAppUser(session.user).then((user) => {
          setUser(user);
        });
      }
      setLoading(false);
    });

    // 監聽認證狀態變化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 useAuth: 認證狀態變化:', {
        event,
        hasSession: !!session,
        userEmail: session?.user?.email,
      });
      
      setSession(session);
      
      if (session?.user) {
        const user = await mapSupabaseUserToAppUser(session.user);
        setUser(user);
        if (user) {
          console.log('✅ useAuth: 用戶已設定:', user.email);
        }
      } else {
        setUser(null);
        console.log('ℹ️ useAuth: 用戶已清除');
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  // 登出
  const logout = async () => {
    await supabase.auth.signOut();
    logoutStore();
    setSession(null);
  };

  return {
    session,
    user: session?.user || null,
    loading,
    logout,
  };
}

