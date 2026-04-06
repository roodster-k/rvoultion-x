import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

/**
 * AuthContext — Phase 1 Étape 3 + Signup Fix.
 * 
 * FIX (Migration 008):
 * - refreshProfile() now uses supabase.auth.getSession() directly
 *   instead of relying on the `user` React state variable.
 *   This fixes a stale closure bug during signup where the async
 *   handler captures `user = null` from before auth state change.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [patientRecord, setPatientRecord] = useState(null);
  const [clinicSettings, setClinicSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const isFetchingProfile = useRef(false);
  const hasInitialized = useRef(false);

  // ─── Fetch profile from `users` table (staff) or `patients` table (patient) ───
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    
    if (isFetchingProfile.current) {
      // If already fetching, don't start a new one, 
      // but the previous one will handle setting loading to false.
      return;
    }

    isFetchingProfile.current = true;
    console.log('[Auth] fetchProfile starting for:', authUser.email);

    const withTimeout = (promise, ms = 30000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms))
      ]);
    };

    try {
      // Small initial delay to let Supabase locks settle
      await new Promise(res => setTimeout(res, 500));

      let staffProfile = null;
      let staffError = null;
      let retries = 3;

      while (retries > 0 && !staffProfile) {
        console.log(`[Auth] Fetching staff profile (Retry: ${3 - retries})...`);
        const result = await withTimeout(
          supabase
            .from('users')
            .select(`
              *,
              clinics (name, logo_url, primary_color)
            `)
            .eq('auth_user_id', authUser.id)
            .maybeSingle()
        );
        staffProfile = result.data;
        staffError = result.error;

        if (!staffProfile && !staffError) {
          console.warn('[Auth] Profile not found, retrying in 1s...');
          await new Promise(res => setTimeout(res, 1000));
          retries--;
        } else {
          break;
        }
      }

      if (staffError) {
        console.error('[Auth] Staff profile fetch error:', staffError);
      }

      if (staffProfile) {
        console.log('[Auth] Staff profile found for clinic:', staffProfile.clinic_id);
        const { clinics, ...restProfile } = staffProfile;
        setProfile(restProfile);
        setPatientRecord(null);
        setClinicSettings(clinics);
        
        if (clinics && clinics.primary_color) {
          console.log('[Auth] Applying clinic theme:', clinics.primary_color);
          document.documentElement.style.setProperty('--primary', clinics.primary_color);
        }
        return;
      }

      // 2. Not a staff member — try patient
      console.log('[Auth] No staff profile found, fetching patient profile...');
      const { data: patientProfile, error: patientError } = await withTimeout(
        supabase
          .from('patients')
          .select(`
            *,
            clinics (name, logo_url, primary_color)
          `)
          .eq('auth_user_id', authUser.id)
          .maybeSingle()
      );

      if (patientError) {
        console.error('[Auth] Patient profile fetch error:', patientError);
      }

      if (patientProfile) {
        console.log('[Auth] Patient profile found.');
        const { clinics, ...restPatient } = patientProfile;
        setPatientRecord(restPatient);
        setProfile(null);
        setClinicSettings(clinics);

        if (clinics && clinics.primary_color) {
          document.documentElement.style.setProperty('--primary', clinics.primary_color);
        }
        return;
      }

      // 3. Auth exists but no profile in either table (normal during onboarding)
      console.warn('[Auth] User authenticated but no profile found in DB:', authUser.email);
      setProfile(null);
      setPatientRecord(null);
      setClinicSettings(null);

    } catch (err) {
      console.error('[Auth] Profile fetch exception:', err.message || err);
      setProfile(null);
      setPatientRecord(null);
      setClinicSettings(null);
    } finally {
      console.log('[Auth] fetchProfile finished.');
      isFetchingProfile.current = false;
      // CRITICAL: Ensure loading is disabled after profile fetch attempt
      setLoading(false);
    }
  }, []);

  // ─── Initialize: restore session + listen for changes ───
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[Auth] getSession error:', sessionError);
        }

        if (mounted && session?.user) {
          console.log('[Auth] Existing session found for:', session.user.email);
          setUser(session.user);
          await fetchProfile(session.user);
        } else {
          // No session, stop loading
          setLoading(false);
        }
      } catch (err) {
        console.error('[Auth] Initialization error:', err);
        setLoading(false);
      } finally {
        if (mounted) {
          hasInitialized.current = true;
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log('[Auth] onAuthStateChange:', event, 'user:', !!session?.user);

        if (event === 'INITIAL_SESSION' && hasInitialized.current) {
          return;
        }

        if (session?.user) {
          const isNewUser = !user || user.id !== session.user.id;
          if (isNewUser) {
            setLoading(true);
            setUser(session.user);
          }
          await fetchProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setPatientRecord(null);
          setClinicSettings(null);
          setLoading(false);
          document.documentElement.style.removeProperty('--primary');
        }

        if (mounted && !hasInitialized.current) {
          hasInitialized.current = true;
          if (!session?.user) setLoading(false);
        }
      }
    );

    initialize();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, user]);

  // ─── Fail-safe: Ensure loading drops if we have data ───
  useEffect(() => {
    if ((profile || patientRecord) && loading) {
      console.log('[Auth] Fail-safe: Data is ready, clearing loading spinner.');
      setLoading(false);
    }
  }, [profile, patientRecord, loading]);

  // ─── Login: email/password (soignants) ───
  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  // ─── Logout ───
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setPatientRecord(null);
    setClinicSettings(null);
    document.documentElement.style.removeProperty('--primary');
  }, []);

  // ─── Refresh profile ───
  // FIX: Uses supabase.auth.getSession() directly instead of relying
  // on the `user` state variable. This avoids stale closure issues when
  // refreshProfile is called from an async handler that started before
  // the auth state change was processed by React.
  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await fetchProfile(session.user);
    }
  }, [fetchProfile]);

  // ─── Derived state ───
  const isStaff = Boolean(profile && profile.is_active);
  const isPatient = Boolean(patientRecord);

  const enrichedUser = user && profile ? {
    id: profile.id,
    authId: user.id,
    email: user.email,
    name: profile.full_name,
    role: profile.role,
    clinicId: profile.clinic_id,
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
  } : user && patientRecord ? {
    id: patientRecord.id,
    authId: user.id,
    email: user.email,
    name: patientRecord.full_name,
    role: 'patient',
    clinicId: patientRecord.clinic_id,
  } : null;

  const value = useMemo(() => ({
    user: enrichedUser,
    authUser: user,
    profile,
    patientRecord,
    clinicSettings,
    isStaff,
    isPatient,
    loading,
    login,
    logout,
    refreshProfile,
  }), [enrichedUser, user, profile, patientRecord, clinicSettings, isStaff, isPatient, loading, login, logout, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
