'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ACTIVITY_TYPE_META } from '@/components/creator/TypeSelector'
import { storeRole, type CreatorRole } from '@/components/creator/RolePicker'

/**
 * PROMPT GAME-MAKING FUNNEL (2026-11-04), one thing only.
 *
 * Homepage "Make a game with a prompt" -> this funnel -> /create?type=<slug>.
 * Step 1: who are you? Step 2: what game do you want to make?
 * The funnel itself provides the role -> type -> making order; it does
 * NOT reorder the create page, does NOT rebuild the prompt box or the
 * manual wizard, and does NOT touch draft approval, Preview, or players.
 *
 * ROLE MAPPING — the owner asked for Teacher / Creator / Kid / Parent,
 * but the existing create-page role system only has Teacher / Student /
 * Parent-Creator (see RolePicker, untouched here). Mapping, stated plainly:
 *   Teacher -> 'teacher'   (exact match)
 *   Kid     -> 'student'   (closest: the learner role)
 *   Parent  -> 'parent'    (exact match; label on the create page is
 *                           "Parent-Creator")
 *   Creator -> 'parent'    (closest: the create page's "Parent-Creator"
 *                           is the only existing role whose label
 *                           contains "Creator")
 * Teacher and Parent/Creator therefore share no new value, and Creator
 * and Parent both land on 'parent' — that collision is honest, not
 * hidden. A missing mapping can never block creation: if the mapped
 * value is ever null, the funnel still advances to the type step and
 * the type link still opens the maker.
 *
 * TYPE LIST — the type step renders ACTIVITY_TYPE_META, the same source
 * the create page's Step 1 TypeSelector uses (and the same 31 slugs the
 * homepage grid derives from DB_TYPE_BY_SLUG). It lists ONLY types that
 * exist today: 31 at the time of writing, never the 9 not-yet-built
 * types, never a fake type. The count is derived from the list length,
 * so it grows to 40 automatically when those types land — no edit here.
 */

export type FunnelRoleAnswer = 'teacher' | 'creator' | 'kid' | 'parent'

export const FUNNEL_ROLES: Array<{ answer: FunnelRoleAnswer; icon: string; label: string }> = [
  { answer: 'teacher', icon: '👩‍🏫', label: 'Teacher' },
  { answer: 'creator', icon: '🎨', label: 'Creator' },
  { answer: 'kid', icon: '🧒', label: 'Kid' },
  { answer: 'parent', icon: '👨‍👩‍👧', label: 'Parent' },
]

export const FUNNEL_ROLE_MAP: Record<FunnelRoleAnswer, CreatorRole> = {
  teacher: 'teacher',
  creator: 'parent',
  kid: 'student',
  parent: 'parent',
}

/** Map a funnel answer to an existing creator role, or null if unknown. */
export function resolveFunnelRole(answer: string | null | undefined): CreatorRole | null {
  if (!answer) return null
  const key = answer.trim().toLowerCase()
  return (FUNNEL_ROLE_MAP as Record<string, CreatorRole>)[key] ?? null
}

export default function MakeGameFunnel({ locale }: { locale: string }) {
  const [step, setStep] = useState<'role' | 'type'>('role')
  const [roleAnswer, setRoleAnswer] = useState<FunnelRoleAnswer | null>(null)

  function chooseRole(answer: FunnelRoleAnswer) {
    // Store the mapped role so the maker opens with it (CreatePageHeader
    // and RolePicker read the same localStorage key). A null mapping
    // never blocks: the funnel advances either way.
    const mapped = resolveFunnelRole(answer)
    if (mapped) storeRole(mapped)
    setRoleAnswer(answer)
    setStep('type')
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1rem' }}>
      {step === 'role' ? (
        <div>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 0.25rem' }}>
            Step 1 of 2
          </p>
          <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>
            Who are you?
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: '0 0 1.25rem' }}>
            Pick one — then pick the game you want to make.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }} role="radiogroup" aria-label="Who are you?">
            {FUNNEL_ROLES.map((r) => (
              <button
                key={r.answer}
                type="button"
                onClick={() => chooseRole(r.answer)}
                style={{
                  minHeight: '96px', padding: '1rem 0.5rem', borderRadius: 'var(--radius-lg)',
                  border: '2px solid var(--color-border)', background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
                }}
              >
                <span style={{ display: 'block', fontSize: '2rem', marginBottom: '0.25rem' }}>{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 0.25rem' }}>
            Step 2 of 2
          </p>
          <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>
            What game do you want to make?
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: '0 0 1.25rem' }}>
            Pick one game — it opens already selected, then you make it with a prompt or by hand.
            {roleAnswer ? ` (You are: ${FUNNEL_ROLES.find((r) => r.answer === roleAnswer)?.label}.)` : ''}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
            {ACTIVITY_TYPE_META.map((type) => (
              <Link
                key={type.slug}
                href={`/${locale}/create?type=${type.slug}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                  borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
                  background: 'var(--color-surface)', padding: '1rem 0.5rem',
                  color: 'var(--color-text-primary)', fontWeight: 700, fontSize: '0.95rem', textAlign: 'center', textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{type.icon}</span>
                {type.name}
                <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{type.desc}</span>
              </Link>
            ))}
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
            {ACTIVITY_TYPE_META.length} game types — only games that exist today are listed.
          </p>
          <button
            type="button"
            onClick={() => setStep('role')}
            style={{ marginTop: '1rem', minHeight: '48px', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 700 }}
          >
            ← Back: who are you?
          </button>
        </div>
      )}
    </div>
  )
}
