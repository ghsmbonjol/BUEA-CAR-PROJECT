import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase'
import { getGroqModel } from '@/lib/groq'

export async function POST(request) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { stakeholderName, title, purpose, details, signatory } = await request.json()
    if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: 'GROQ_API_KEY is not configured.' }, { status: 500 })
    if (!stakeholderName || !purpose) return NextResponse.json({ error: 'Stakeholder name and purpose are required.' }, { status: 400 })

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: getGroqModel(),
        temperature: 0.5,
        max_completion_tokens: 700,
        messages: [
          { role: 'system', content: 'Draft dignified, human-sounding Christian administrative letters. Keep facts exact. Never fabricate scripture quotations, titles or commitments.' },
          { role: 'user', content: `Write a formal but warm letter to ${stakeholderName}${title ? `, ${title}` : ''}. Purpose: ${purpose}. Details to include: ${details || 'No additional details supplied.'}. Use a natural Christian greeting such as “Peace and grace be multiplied unto you.” Keep the tone godly, respectful, grateful and non-coercive. Make the request or update clear. Sign from ${signatory || 'Buea Region Car Project Committee'}.` }
        ]
      })
    })
    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || 'Groq request failed.' }, { status: 500 })
    return NextResponse.json({ draft: data?.choices?.[0]?.message?.content?.trim() || '' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
