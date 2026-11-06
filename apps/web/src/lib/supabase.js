import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Only the public project key belongs in the browser. Supabase manages session
// persistence and refresh; FastAPI independently verifies every access token.
export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null
