import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please check your Cloudflare or .env configuration.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'postop-auth-token',
    // Disable the lock API if it's causing stalls (common in local dev/agents)
    // Note: older versions of supabase-js might not support this key, 
    // but it's safe to include as an extra property.
    flowType: 'pkce'
  }
});
