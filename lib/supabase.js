import { createClient } from '@supabase/supabase-js'

export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Supabase browser environment variables are missing.')
  return createClient(url, key)
}

export function getServerSupabase(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase server environment variables are missing.')
  return createClient(url, key, {
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return { error: 'Missing access token', status: 401 }

  const supabase = getServerSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return { error: 'Invalid session', status: 401 }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('user_id', userData.user.id)
    .single()

  if (profileError || profile?.role !== 'admin') return { error: 'Admin access required', status: 403 }
  return { user: userData.user, profile, supabase }
}
