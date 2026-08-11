import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase'

export async function POST(request) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { name, group, phone, vowSequence, pledged, paid, balance, note } = await request.json()
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY is not configured.' }, { status: 500 })

    const prompt = `Write a short WhatsApp contribution reminder for a church member in the Deeper Life Buea regional car project.
Member: ${name}
Group: ${group}
Vow: ${vowSequence || 1}
Amount vowed: FCFA ${Number(pledged || 0).toLocaleString()}
Amount given: FCFA ${Number(paid || 0).toLocaleString()}
Balance: FCFA ${Number(balance || 0).toLocaleString()}
Admin note: ${note || 'None'}

Tone requirements: warm, human, respectful, concise, spiritually appropriate, not manipulative, not threatening. Begin naturally with a Christian greeting such as “Peace and grace be multiplied unto you”. Thank the person for what they have already given. State the remaining balance clearly. Encourage them to fulfil the vow as the Lord enables them. Do not invent Bible verses or claim God promised a financial reward. End with appreciation from the Buea Region car project team.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.55,
        max_completion_tokens: 320,
        messages: [
          { role: 'system', content: 'You write pastoral administrative messages with compassion, clarity and accurate financial details.' },
          { role: 'user', content: prompt }
        ]
      })
    })
    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || 'Groq request failed.' }, { status: 500 })
    const draft = data?.choices?.[0]?.message?.content?.trim() || ''
    return NextResponse.json({ draft, phone })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
