/**
 * Auth Context Provider
 * Provides global authentication state to the app
 * Replaces the need for multiple useAuth hooks and ensures consistent state
 */

import { supabase } from '@/lib/supabase';
import { useAppStore, User } from '@/store/useAppStore';
import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map Supabase User to App User
const mapSupabaseUserToAppUser = async (supabaseUser: any): Promise<User | null> => {
  if (!supabaseUser) return null;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
    avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setUser: setUserStore, logout: logoutStore } = useAppStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        mapSupabaseUserToAppUser(session.user).then((mappedUser) => {
          setUser(mappedUser);
          setUserStore(mappedUser);
        });
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 AuthContext: Auth state changed:', {
        event,
        hasSession: !!session,
        userEmail: session?.user?.email,
      });

      setSession(session);

      if (session?.user) {
        const mappedUser = await mapSupabaseUserToAppUser(session.user);
        setUser(mappedUser);
        setUserStore(mappedUser);
        if (mappedUser) {
          console.log('✅ AuthContext: User set:', mappedUser.email);
        }
      } else {
        setUser(null);
        setUserStore(null);
        console.log('ℹ️ AuthContext: User cleared');
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUserStore]);

  const logout = async () => {
    await supabase.auth.signOut();
    logoutStore();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

