import { NextResponse } from 'next/server'

// POST /api/activities/[id]/approve — SUPERSEDED 2026-11-04.
// The 2026-10-30 teacher/parent approval gate is replaced by the agreed
// kids social model (see src/lib/social-approval.ts): a kid's game goes
// public when 3 testers approve it via its test link — never by a single
// teacher/parent approval, which would be a solo unlock the owner never
// agreed to. This route is kept as a 410 (not deleted) so any old UI or
// bookmarked call gets a plain explanation instead of a silent 404, and
// so no call site can keep solo-publishing games through it.
// Teachers/parents who find a bad live game use
// POST /api/activities/[id]/remove instead.
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Teacher/parent approval is replaced by tester approval. Share the game\'s test link — when 3 testers approve, it goes public. Teachers and parents can remove a live game instead.',
      test_approve: 'POST /api/activities/[id]/test-approve',
      remove: 'POST /api/activities/[id]/remove',
    },
    { status: 410 },
  )
}
