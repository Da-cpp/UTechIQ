import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../types/database';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  birthdate: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [birthdate, setBirthdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const extractBirthdate = (u: User | null) => {
    return u?.user_metadata?.birthdate ?? null;
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
    } catch (err) {
      console.error('Error synchronizing database user profile:', err);
      setProfile(null); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setBirthdate(extractBirthdate(currentUser));

      if (currentUser) {
        fetchUserProfile(currentUser.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      
      setUser(currentUser);
      setBirthdate(extractBirthdate(currentUser));

      if (currentUser) {
        setLoading(true); 
        await fetchUserProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error executing system signout routine:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setBirthdate(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, birthdate, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be wrapped cleanly inside an AuthProvider');
  }
  return context;
}