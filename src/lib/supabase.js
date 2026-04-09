import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please check your Cloudflare or .env configuration.'
  );
}

// Custom storage to bypass Navigator.locks API issues in production/environments
const customStorage = {
  getItem: (key) => typeof window !== 'undefined' ? window.localStorage.getItem(key) : null,
  setItem: (key, value) => typeof window !== 'undefined' ? window.localStorage.setItem(key, value) : null,
  removeItem: (key) => typeof window !== 'undefined' ? window.localStorage.removeItem(key) : null,
};

// Bypass navigator.locks deadlock bug (supabase-js issues #1594, #2013).
// The Web Locks API used by GoTrueClient for cross-tab session serialization
// has a known re-entrant deadlock: _saveSession() acquires the lock, then
// tries to re-acquire it during the storage write, hanging indefinitely.
// Safe for single-tab SPAs — loses cross-tab sync, which is acceptable here.
const noOpLock = async (_name, _acquireTimeout, fn) => fn();

export { supabaseUrl, supabaseAnonKey };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'postop-auth-token',
    lock: noOpLock,
  }
});
