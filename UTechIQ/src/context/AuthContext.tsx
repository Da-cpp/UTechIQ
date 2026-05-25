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
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole]       = useState<'student' | 'professor' | null>(null);
  const [birthdate, setBirthdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const extractBirthdate = (u: User | null): string | null =>
    u?.user_metadata?.birthdate ?? null;

  const extractRole = (u: User | null): 'student' | 'professor' | null =>
    u?.user_metadata?.role ?? null;

  /**
   * Fetches the role-specific profile row for the authenticated user.
   * Branches on the role stored in auth metadata, then queries either
   * `students` or `professors` by matching on `user_id`.
   */
  const fetchUserProfile = async (u: User) => {
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
        // Role not set in metadata — shouldn't happen after signup, but handle gracefully
        console.warn('AuthContext: user has no role in metadata', u.id);
        setProfile(null);
        setRole(null);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setProfile(null);
      setRole(null);
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
        fetchUserProfile(currentUser);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setBirthdate(extractBirthdate(currentUser));

        if (currentUser) {
          setLoading(true);
          await fetchUserProfile(currentUser);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during sign out:', err);
    } finally {
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
