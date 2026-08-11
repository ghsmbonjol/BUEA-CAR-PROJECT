import { getServerSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization') || ''

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: 'Unauthorized cron request' }, { status: 401 })
  }

  const checkedAt = new Date().toISOString()

  try {
    const supabase = getServerSupabase()

    // A few real, harmless database reads to create genuine project activity.
    // No member, vow, contribution, expense or financial amount is changed.
    const [groupProbe, memberProbe, settingsProbe] = await Promise.all([
      supabase.from('groups').select('id').limit(1),
      supabase.from('members').select('id').limit(1),
      supabase.from('project_settings').select('id').eq('id', 1).limit(1)
    ])

    const probeError = groupProbe.error || memberProbe.error || settingsProbe.error
    if (probeError) throw probeError

    const note = 'Supabase database check successful; 3 lightweight reads completed.'
    const { error: statusError } = await supabase
      .from('project_settings')
      .update({
        last_keep_alive_at: checkedAt,
        last_keep_alive_status: 'online',
        last_keep_alive_note: note
      })
      .eq('id', 1)

    if (statusError) throw statusError

    return Response.json({
      ok: true,
      database: 'awake',
      checkedAt,
      note
    })
  } catch (error) {
    console.error('Keep-alive cron failed:', error)
    return Response.json({
      ok: false,
      database: 'unreachable',
      checkedAt,
      error: error?.message || 'Unknown keep-alive error'
    }, { status: 500 })
  }
}
