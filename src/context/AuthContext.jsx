import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

/**
 * Formats an email prefix into a display name.
 * "kevin.m" → "Kevin M."
 * "sarah.l" → "Sarah L."
 */
function formatDisplayName(email) {
  const prefix = email.split('@')[0]; // "kevin.m"
  const parts = prefix.split('.');    // ["kevin", "m"]
  return parts.map((p, i) => {
    if (i === parts.length - 1 && p.length === 1) {
      return p.toUpperCase() + '.'; // Single letter → initial with period
    }
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(' ');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const buildUser = (supabaseUser) => ({
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: supabaseUser.user_metadata?.name || formatDisplayName(supabaseUser.email),
    role: 'nurse',
  });

  // Initialize: check if there's an existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(buildUser(session.user));
      }
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(buildUser(session.user));
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
