export function friendlyAuthError(error) {
  const code = error?.code || ''
  if (code === 'invalid_credentials' || /invalid.*credentials/i.test(error?.message || '')) return 'Email or password is incorrect. Please try again.'
  if (code === 'email_not_confirmed') return 'Verify your email using the confirmation link before signing in.'
  if (code.includes('rate_limit') || error?.status === 429) return 'Too many attempts. Please wait before trying again.'
  if (code === 'weak_password') return 'Choose a stronger password that meets the account password policy.'
  if (/not configured|configuration|password must|valid email/i.test(error?.message || '')) return error.message
  return 'Authentication could not be completed. Check your connection or request a fresh email link and retry.'
}

function credentials(email, password) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter a valid email address.')
  if (password != null && password.length < 8) throw new Error('Password must contain at least 8 characters.')
}

export async function createCitizenAccount(client, email, password, origin) {
  credentials(email, password)
  // No role or user-supplied identity is sent. FastAPI provisions a citizen
  // profile only after independently verifying the provider-issued JWT.
  const { data, error } = await client.auth.signUp({ email: email.trim(), password,
    options: { emailRedirectTo: `${origin}/auth/callback` } })
  if (error) throw error
  return { signedIn: Boolean(data?.session), message: data?.session
    ? 'Your account is ready.' : 'Check your email for a confirmation link if registration is available for this address. Then sign in.' }
}

export async function sendResetEmail(client, email, origin) {
  credentials(email)
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin}/auth/reset` })
  if (error) throw error
  return { message: 'If an account exists for this email, a password reset link will arrive. Check your inbox and spam folder.' }
}

export async function changePassword(client, password) {
  if (password.length < 8) throw new Error('Password must contain at least 8 characters.')
  const { error } = await client.auth.updateUser({ password })
  if (error) throw error
  return { message: 'Password updated. You can now sign in with your new password.' }
}
