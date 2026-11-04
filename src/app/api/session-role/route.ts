import { NextResponse } from 'next/server'
import { resolveSessionUser } from '@/lib/auth/session-user'

// GET /api/session-role — the smallest signed-in fact the client UI
// needs to decide which approval controls to show: signed in or not,
// and the recorded role. No user id, no email, no name is returned.
export async function GET() {
  try {
    const sessionUser = await resolveSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ signedIn: false, role: null })
    }
    return NextResponse.json({ signedIn: true, role: sessionUser.role })
  } catch {
    return NextResponse.json({ signedIn: false, role: null })
  }
}
