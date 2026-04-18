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
  const currentUserIdRef = useRef(null);

  // ─── Fetch profile from `users` table (staff) or `patients` table (patient) ───
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) { setLoading(false); return; }
    if (isFetchingProfile.current) return;

    isFetchingProfile.current = true;

    const withTimeout = (promise, ms = 8000) =>
      Promise.race([promise, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

    try {
      // 1. Try staff profile first (no retry loop — fails fast)
      const { data: staffProfile, error: staffError } = await withTimeout(
        supabase
          .from('users')
          .select('*, clinics (name, logo_url, primary_color)')
          .eq('auth_user_id', authUser.id)
          .maybeSingle()
      );

      if (staffError) console.error('[Auth] Staff profile error:', staffError.message);

      if (staffProfile) {
        const { clinics, ...rest } = staffProfile;
        setProfile(rest);
        setPatientRecord(null);
        setClinicSettings(clinics);
        if (clinics?.primary_color)
          document.documentElement.style.setProperty('--color-primary', clinics.primary_color);
        return;
      }

      // 2. Try patient profile by auth_user_id
      let { data: patientProfile, error: patientError } = await withTimeout(
        supabase
          .from('patients')
          .select('*, clinics (name, logo_url, primary_color)')
          .eq('auth_user_id', authUser.id)
          .maybeSingle()
      );

      if (patientError) console.error('[Auth] Patient profile error:', patientError.message);

      // 2b. Fallback: match by email (first OTP login — auth_user_id not linked yet)
      if (!patientProfile && authUser.email) {
        const { data: patientByEmail } = await withTimeout(
          supabase
            .from('patients')
            .select('*, clinics (name, logo_url, primary_color)')
            .eq('email', authUser.email)
            .is('auth_user_id', null)
            .maybeSingle()
        );
        if (patientByEmail) {
          // Link auth_user_id for future logins (requires v24_patients_link_auth policy)
          const { error: linkError } = await supabase
            .from('patients')
            .update({ auth_user_id: authUser.id })
            .eq('id', patientByEmail.id);
          if (linkError) {
            console.error('[Auth] Failed to link auth_user_id (RLS?):', linkError.message);
          } else {
            console.log('[Auth] Linked patient by email:', authUser.email);
          }
          patientProfile = { ...patientByEmail, auth_user_id: authUser.id };
        }
      }

      if (patientProfile) {
        const { clinics, ...rest } = patientProfile;
        setPatientRecord(rest);
        setProfile(null);
        setClinicSettings(clinics);
        if (clinics?.primary_color)
          document.documentElement.style.setProperty('--color-primary', clinics.primary_color);
        return;
      }

      // 3. Authenticated but no DB profile yet (signup in progress)
      setProfile(null);
      setPatientRecord(null);
      setClinicSettings(null);

    } catch (err) {
      console.error('[Auth] fetchProfile error:', err.message);
      setProfile(null);
      setPatientRecord(null);
      setClinicSettings(null);
    } finally {
      isFetchingProfile.current = false;
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
          if (currentUserIdRef.current !== session.user.id) {
            currentUserIdRef.current = session.user.id;
            setUser(session.user);
          }
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

        // TOKEN_REFRESHED fires every ~1h — skip re-fetching profile if same user
        if (event === 'TOKEN_REFRESHED' && currentUserIdRef.current === session?.user?.id) {
          return;
        }

        if (session?.user) {
          const isNewUser = currentUserIdRef.current !== session.user.id;
          if (isNewUser) {
            setLoading(true);
            currentUserIdRef.current = session.user.id;
            setUser(session.user);
          }
          await fetchProfile(session.user);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || !session) {
          currentUserIdRef.current = null;
          setUser(null);
          setProfile(null);
          setPatientRecord(null);
          setClinicSettings(null);
          setLoading(false);
          document.documentElement.style.removeProperty('--color-primary');
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
  }, [fetchProfile]);

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
    document.documentElement.style.removeProperty('--color-primary');
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
