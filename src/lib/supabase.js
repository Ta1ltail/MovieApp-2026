import { createClient } from '@supabase/supabase-js'

// ── Supabase client ──────────────────────────────────────────────────────────
// Only the *publishable* (anon) key ever ships to the browser. The service
// key/DB password must NEVER be referenced here — all privileged logic lives
// in RLS policies and the DB schema.

const url  = import.meta.env.VITE_SUPABASE_URL
const key  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && key)

export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  key ?? 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Required for Google OAuth (implicit-flow tokens arrive in the URL
      // hash) and for the confirmation-email link handshake.
      detectSessionInUrl: true,
    },
  }
)
