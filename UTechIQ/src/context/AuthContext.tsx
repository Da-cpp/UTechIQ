import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { StudentProfile, ProfessorProfile } from '../types/database';
import type { User } from '@supabase/supabase-js';

type Profile = StudentProfile | ProfessorProfile;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: 'student' | 'professor' | null;
  birthdate: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [role, setRole]           = useState<'student' | 'professor' | null>(null);
  const [birthdate, setBirthdate] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  const extractBirthdate = (u: User | null): string | null =>
    u?.user_metadata?.birthdate ?? null;

  const extractRole = (u: User | null): 'student' | 'professor' | null =>
    u?.user_metadata?.role ?? null;

  const fetchUserProfile = async (u: User, showLoader = false) => {
    if (showLoader) setLoading(true);

    const timeout = setTimeout(() => {
      console.warn('AuthContext: profile fetch timed out');
      setLoading(false);
    }, 2000);

    try {
      const userRole = extractRole(u);

      if (userRole === 'student') {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', u.id)
          .single();
        if (error) throw error;
        setProfile(data as StudentProfile);
        setRole('student');

      } else if (userRole === 'professor') {
        const { data, error } = await supabase
          .from('professors')
          .select('*')
          .eq('user_id', u.id)
          .single();
        if (error) throw error;
        setProfile(data as ProfessorProfile);
        setRole('professor');

      } else {
        console.warn('AuthContext: user has no role in metadata', u.id);
        setProfile(null);
        setRole(null);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setProfile(null);
      setRole(null);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setBirthdate(extractBirthdate(currentUser));
      if (currentUser) {
        fetchUserProfile(currentUser, true);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') return;
        if (event === 'TOKEN_REFRESHED') return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setBirthdate(extractBirthdate(currentUser));

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRole(null);
          setUser(null);
          setBirthdate(null);
          setLoading(false);
          return;
        }

        if (currentUser) {
          const isNewSignIn = event === 'SIGNED_IN';
          await fetchUserProfile(currentUser, isNewSignIn);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during sign out:', err);
      setUser(null);
      setProfile(null);
      setRole(null);
      setBirthdate(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, birthdate, loading, signOut }}>
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
