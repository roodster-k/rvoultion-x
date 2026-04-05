import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

/**
 * AuthContext enrichi — Phase 1 Étape 3.
 * 
 * Après login/session restore, charge le profil complet depuis la table `users`
 * (clinic_id, role, full_name) ou détecte si c'est un patient.
 * 
 * Expose :
 *   user       — Supabase Auth user brut (id, email)
 *   profile    — Row de la table `users` (clinic_id, role, full_name, ...)
 *   patientRecord — Row de la table `patients` si c'est un patient auth
 *   isStaff    — boolean
 *   isPatient  — boolean
 *   loading    — boolean
 *   login      — (email, password) → signInWithPassword
 *   logout     — signOut + clear state
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);         // Supabase Auth user
  const [profile, setProfile] = useState(null);    // Table users row
  const [patientRecord, setPatientRecord] = useState(null); // Table patients row (if patient)
  const [clinicSettings, setClinicSettings] = useState(null); // Table clinics row
  const [loading, setLoading] = useState(true);

  // ─── Fetch profile from `users` table (staff) or `patients` table (patient) ───
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      setPatientRecord(null);
      return;
    }

    try {
      // 1. Try staff profile first
      const { data: staffProfile, error: staffError } = await supabase
        .from('users')
        .select(`
          *,
          clinics (name, logo_url, primary_color)
        `)
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (staffError) {
        console.error('[Auth] Staff profile fetch error:', staffError);
      }

      if (staffProfile) {
        const { clinics, ...restProfile } = staffProfile;
        setProfile(restProfile);
        setPatientRecord(null);
        setClinicSettings(clinics);
        
        if (clinics && clinics.primary_color) {
          document.documentElement.style.setProperty('--primary', clinics.primary_color);
        }
        return;
      }

      // 2. Not a staff member — try patient
      const { data: patientProfile, error: patientError } = await supabase
        .from('patients')
        .select(`
          *,
          clinics (name, logo_url, primary_color)
        `)
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (patientError) {
        console.error('[Auth] Patient profile fetch error:', patientError);
      }

      if (patientProfile) {
        const { clinics, ...restPatient } = patientProfile;
        setPatientRecord(restPatient);
        setProfile(null);
        setClinicSettings(clinics);

        if (clinics && clinics.primary_color) {
          document.documentElement.style.setProperty('--primary', clinics.primary_color);
        }
        return;
      }

      // 3. Auth exists but no profile in either table — edge case
      // This can happen during patient activation (between auth creation and profile linking)
      console.warn('[Auth] User authenticated but no profile found:', authUser.email);
      setProfile(null);
      setPatientRecord(null);
      setClinicSettings(null);

    } catch (err) {
      console.error('[Auth] Profile fetch exception:', err);
      setProfile(null);
      setPatientRecord(null);
      setClinicSettings(null);
    }
  }, []);

  // ─── Initialize: restore session + listen for changes ───
  useEffect(() => {
    let mounted = true;

    // 1. Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      }
      setLoading(false);
    });

    // 2. Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          // Re-fetch profile on login, token refresh, or user update
          if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
            await fetchProfile(session.user);
          }
        } else {
          setUser(null);
          setProfile(null);
          setPatientRecord(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ─── Login: email/password (soignants) ───
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Profile will be fetched by onAuthStateChange → SIGNED_IN
    return data;
  };

  // ─── Logout ───
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setPatientRecord(null);
    setClinicSettings(null);
    document.documentElement.style.removeProperty('--primary');
  };

  // ─── Refresh profile (useful after profile updates) ───
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  // ─── Derived state ───
  const isStaff = Boolean(profile && profile.is_active);
  const isPatient = Boolean(patientRecord);

  // Backward-compatible user shape for existing components
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

  return (
    <AuthContext.Provider value={{
      // Core auth
      user: enrichedUser,
      authUser: user,       // Raw Supabase Auth user (for edge cases)
      profile,              // Full staff profile from `users` table
      patientRecord,        // Full patient record if authenticated as patient
      clinicSettings,       // Brand settings from `clinics` table

      // Role detection
      isStaff,
      isPatient,
      
      // State
      loading,

      // Actions
      login,
      logout,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
