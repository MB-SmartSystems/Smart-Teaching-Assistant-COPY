import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createSessionToken } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Passwort erforderlich' }, { status: 400 })
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 })
    }

    const token = createSessionToken()

    const response = NextResponse.json({ authenticated: true })
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: true, // Always secure for better security
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Anmeldung fehlgeschlagen' }, { status: 500 })
  }
}
