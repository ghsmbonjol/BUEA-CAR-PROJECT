import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase'

export async function POST(request) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { phone, message } = await request.json()
    if (!phone || !message) return NextResponse.json({ error: 'Phone and message are required.' }, { status: 400 })

    const token = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const version = process.env.WHATSAPP_GRAPH_VERSION
    if (!token || !phoneNumberId || !version) return NextResponse.json({ error: 'WhatsApp environment variables are incomplete.' }, { status: 500 })

    const cleanPhone = String(phone).replace(/[^0-9]/g, '')
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { preview_url: false, body: message }
      })
    })
    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || 'WhatsApp send failed.', details: data }, { status: 500 })
    return NextResponse.json({ ok: true, result: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
