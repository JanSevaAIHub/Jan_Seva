import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Only the public project key belongs in the browser. Supabase manages session
// persistence and refresh; FastAPI independently verifies every access token.
let client = null
let configurationError = ''
try {
  if (url && key) client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
  else configurationError = 'Sign-in is not configured. Set the public Supabase URL and key.'
} catch {
  configurationError = 'Sign-in configuration is invalid. Check the public Supabase URL and key.'
}
export const supabase = client
export const authConfigurationError = configurationError
