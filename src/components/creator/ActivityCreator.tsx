'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import TypeSelector, { ACTIVITY_TYPE_META, resolveInitialType } from './TypeSelector'
import RolePicker, { readStoredRole, storeRole, type CreatorRole } from './RolePicker'
import MetaForm, { type ActivityMeta } from './MetaForm'
import ItemEditor from './ItemEditor'
import ActivityPreview from './ActivityPreview'
import type { PromptDraft } from '@/lib/prompt-to-game'
import { curriculumTagLabel, resolveCurriculumTag, type CurriculumTag } from '@/lib/curricula'
import type { ActivityItem, SupportedLocale } from '@/types'

// Lazy-loaded so the creator's first paint stays light; these panels
// only load when the creator opens /create.
const PromptToGame = dynamic(() => import('./PromptToGame'), { ssr: false })
const ChapterScan = dynamic(() => import('./ChapterScan'), { ssr: false })

interface SaveOptions {
  isPublic: boolean
  tags: string
}

const STEPS = [
  { id: 1, label: 'Type',    icon: '🎮' },
  { id: 2, label: 'Details', icon: '📋' },
  { id: 3, label: 'Items',   icon: '✏️' },
  { id: 4, label: 'Preview', icon: '👁️' },
  { id: 5, label: 'Save',    icon: '💾' },
]

interface ActivityCreatorProps {
  locale: SupportedLocale
  /**
   * SINGLE-GAME MAKER ENTRY (2026-11-04): raw ?type= value from the
   * create page (a hub CTA link). Validated by resolveInitialType
   * against the known type list; an invalid value means no
   * preselection, never a crash. The preselected type is only the
   * starting Step 1 pick — the creator can change it in Step 1
   * afterwards, and the Step 1 pick still wins over an approved
   * prompt draft (see resolveApprovedType, Preview fix 2026-11-04).
   */
  initialType?: string | null
  /**
   * BEAT-PLAN BUILD #1: raw ?country= value from the create page (a
   * hub CTA link, e.g. ?country=Pakistan). Passed through to
   * PromptToGame, which validates it with resolveInitialCountry;
   * an invalid value means General, never a crash.
   */
  initialCountry?: string | null
  /**
   * BEAT-PLAN BUILD #3: raw ?subject= value from the create page (a
   * subject-hub CTA link, e.g. ?subject=Urdu). Passed through to
   * PromptToGame, which validates it with resolveInitialSubject;
   * an invalid value means no preselection, never a crash.
   */
  initialSubject?: string | null
}

/**
 * PREVIEW-TYPE FIX (2026-11-04): which type an approved draft plays as.
 * An existing Step 1 pick always wins over the draft's type; the draft
 * supplies the type only when nothing has been picked yet. So Step 1
 * Jump Path + approved Quiz draft = Jump Path Preview, and a prompt-
 * first flow (no Step 1 pick) still previews as the draft's type.
 */
export function resolveApprovedType(existingType: string | null, draftType: string): string {
  return existingType ?? draftType
}

export default function ActivityCreator({ locale, initialType, initialCountry, initialSubject }: ActivityCreatorProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [creatorRole, setCreatorRole] = useState<CreatorRole>('teacher')
  const [roleHydrated, setRoleHydrated] = useState(false)
  // SINGLE-GAME MAKER ENTRY: preselectedType is fixed at open time so
  // the "Making:" banner stays honest about where the maker came from;
  // typeSlug is the live Step 1 pick and starts at the same value.
  const [preselectedType] = useState<string | null>(() => resolveInitialType(initialType))
  const [typeSlug, setTypeSlug] = useState<string | null>(() => resolveInitialType(initialType))
  const [meta, setMeta] = useState<ActivityMeta>({
    title: '', description: '', subject: '', grade: '',
    locale: locale || 'en', curriculum: '', tags: '',
  })
  const [items, setItems] = useState<ActivityItem[]>([
    { prompt: '', answer: '', hint: '', imageUrl: '' },
    { prompt: '', answer: '', hint: '', imageUrl: '' },
    { prompt: '', answer: '', hint: '', imageUrl: '' },
  ])
  const [saveOptions, setSaveOptions] = useState<SaveOptions>({ isPublic: true, tags: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // APPROVE-DRAFT FIX 2026-11-01: the old code set step 4 but never moved
  // the viewport. The wizard sits BELOW the PromptToGame and ChapterScan
  // boxes, so on a phone the Preview was far below the fold and the click
  // looked like it did nothing (the only change was a small green line
  // above the draft, in the box the user had just scrolled past). The
  // wizardRef + approved banner below make the jump unmistakable.
  const wizardRef = useRef<HTMLDivElement>(null)
  const [approvedDraftTitle, setApprovedDraftTitle] = useState<string | null>(null)
  // WORLDWIDE CURRICULUM v1 (2026-11-04): country + syllabus tags from
  // the approved prompt draft (validated against the seed). Null =
  // General, no syllabus claim. Set ONLY by approveDraft below: a
  // chapter approval (which carries no pick) resets it to null, so a
  // chapter game can never inherit a prompt draft's syllabus tag.
  const [curriculumTag, setCurriculumTag] = useState<CurriculumTag | null>(null)

  useEffect(() => { setCreatorRole(readStoredRole()); setRoleHydrated(true) }, [])

  function canProceed(): boolean {
    if (step === 1) return !!typeSlug
    if (step === 2) return !!(meta.title.trim() && meta.subject && meta.grade)
    if (step === 3) return items.filter((i) => i.prompt && i.answer).length >= 2
    return true
  }

  function next() { if (canProceed() && step < 5) setStep((s) => s + 1) }
  function back() { if (step > 1) setStep((s) => s - 1) }

  /**
   * Prompt / chapter approval (mandatory, no auto-publish): an approved
   * draft only fills the wizard and jumps to Preview. Nothing is saved
   * until the creator clicks Save, and prompt/chapter games start
   * PRIVATE — the creator must choose public in step 5, and a student
   * game should be checked by a teacher/parent before going public.
   */
  function approveDraft(draft: PromptDraft) {
    // PREVIEW-TYPE FIX (2026-11-04): an approved prompt/chapter draft
    // used to overwrite the creator's Step 1 type pick with the prompt
    // radio's type (Quiz by default — the radio only offers Quiz /
    // Match Up / Unjumble). So a creator who picked Jump Path in Step 1
    // and then approved a draft got a Quiz Preview, with no warning
    // that the type had changed. A Step 1 pick now wins: the draft
    // fills title/items/subject/grade, but the type only comes from
    // the draft when no type has been picked yet. The creator can
    // still change the type afterwards in Step 1.
    setTypeSlug((prev) => resolveApprovedType(prev, draft.type))
    setMeta((m) => ({
      ...m,
      title: draft.title,
      description: draft.sourceNote.slice(0, 300),
      // GUIDED BUILDER (2026-11-01): a guided draft carries the exact
      // DB subject/grade the creator picked, so the saved game no
      // longer has a blank subject/grade. Chapter drafts carry none
      // and keep the previous values (and the amber warning below).
      subject: draft.subject ?? m.subject,
      grade: draft.grade ?? m.grade,
    }))
    setItems(draft.items.map((i) => ({
      prompt: i.prompt,
      answer: i.answer,
      hint: i.hint ?? '',
      imageUrl: i.imageUrl ?? '',
    })))
    setSaveOptions((o) => ({ ...o, isPublic: false }))
    setCurriculumTag(resolveCurriculumTag(draft.countryCode, draft.syllabusSlug))
    setApprovedDraftTitle(draft.title)
    setStep(4)
    // Move the viewport to the wizard itself, after React renders step 4.
    // Without this, the Preview was below the fold and approval looked dead.
    window.setTimeout(() => {
      wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      wizardRef.current?.focus({ preventScroll: true })
    }, 100)
  }

  async function save() {
    if (!typeSlug) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: meta.title.trim(),
        description: meta.description.trim(),
        type_id: typeSlug,
        locale: meta.locale,
        subject_id: meta.subject,
        grade_id: meta.grade,
        curriculum_id: meta.curriculum,
        topic_id: '',
        items: items.filter((i) => i.prompt && i.answer),
        is_public: saveOptions.isPublic,
        tags: meta.tags.split(',').map((t) => t.trim()).filter(Boolean),
        // WORLDWIDE CURRICULUM v1: the validated country + syllabus
        // tags. The server re-validates them against the seed and
        // stores them inside the game's content record (no migration,
        // no new table). Absent = General, no syllabus claim.
        ...(curriculumTag ? { curriculum_tag: curriculumTag } : {}),
      }
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // APPROVE-DRAFT FIX: the API returns bare "Unauthorized" for a
        // signed-out user, which read as a silent failure. Say plainly
        // that sign-in is needed, instead of showing that bare word.
        if (res.status === 401) {
          throw new Error('Sign-in is needed to save. Use Sign in at the top of the page, then come back and click Save Activity again.')
        }
        throw new Error(data.error || 'Failed to save activity')
      }
      const { activity } = await res.json()
      router.push(`/${locale}/activity/${activity.id}/play`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="eduplay-create" style={{ maxWidth: '680px', margin: '0 auto', padding: '1rem' }}>
      {/* SINGLE-GAME MAKER ENTRY: when the maker was opened from a type
          hub's "Make a … game" link, say plainly at the top which
          single game is being made, so the prompt Quiz radio above
          cannot confuse it. The banner follows the live Step 1 pick,
          which the creator can still change in Step 1. */}
      {preselectedType && (
        <div
          role="status"
          style={{
            background: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))',
            border: '2px solid var(--color-primary)', borderRadius: 'var(--radius)',
            padding: '1rem', marginBottom: '1.25rem',
          }}
        >
          <p style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 0.25rem' }}>
            🎮 Making: {ACTIVITY_TYPE_META.find((t) => t.slug === typeSlug)?.name ?? ACTIVITY_TYPE_META.find((t) => t.slug === preselectedType)?.name ?? preselectedType}
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            You are making a single game of this type. Change it in Step 1 (Type) if you want a different game.
          </p>
        </div>
      )}
      {/* Prompt-to-game + chapter-scan, prominent at the top of /create.
          Both are lazy-loaded; approval only fills the wizard below. */}
      <PromptToGame onApprove={approveDraft} initialCountry={initialCountry} initialSubject={initialSubject} />
      <ChapterScan onApprove={approveDraft} />
      {/* Batch 1 — creator role picker (local choice; auth is a later batch) */}
      <div style={{ maxWidth: '720px', margin: '0 auto 1.5rem' }}>
        <RolePicker
          value={roleHydrated ? creatorRole : 'teacher'}
          onChange={(role) => { setCreatorRole(role); storeRole(role) }}
        />
      </div>
      {/* FUNNEL (2026-11-04): the manual way is headed in bold, exactly
          "Manual game" — the wizard below (Type, Details, Items,
          Preview, Save) is unchanged; only this heading is new. */}
      <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1rem' }}>
        Manual game
      </h2>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <button
              onClick={() => s.id < step && setStep(s.id)}
              aria-current={step === s.id ? 'step' : undefined}
              aria-label={`Step ${s.id}: ${s.label}`}
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                border: `2px solid ${step >= s.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: step > s.id ? 'var(--color-primary)' : step === s.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                color: step >= s.id ? (step > s.id ? '#fff' : 'var(--color-primary)') : 'var(--color-text-muted)',
                cursor: s.id < step ? 'pointer' : 'default',
                fontSize: '0.9rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.2s',
              }}
            >
              {step > s.id ? '✓' : s.icon}
            </button>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 0.2rem',
                background: step > s.id ? 'var(--color-primary)' : 'var(--color-border)',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content — the scroll target for draft approval. */}
      <div
        ref={wizardRef}
        tabIndex={-1}
        id="creator-wizard"
        style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem',
          boxShadow: 'var(--shadow-card)', minHeight: '400px',
          outline: 'none',
        }}
      >
        {/* APPROVE-DRAFT FIX: unmistakable banner on the Preview step.
            Approval still only fills the wizard — nothing is saved here —
            but the user must be able to SEE that it happened, what was
            filled in, that it is private, and what to click next. */}
        {step === 4 && approvedDraftTitle && (
          <div
            role="status"
            style={{
              background: 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))',
              border: '2px solid var(--color-success)', borderRadius: 'var(--radius)',
              padding: '1rem', marginBottom: '1.25rem',
            }}
          >
            <p style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 0.25rem' }}>
              ✅ Draft approved: {approvedDraftTitle}
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
              {items.filter((i) => i.prompt && i.answer).length} questions filled in below.
              This game is 🔒 Private by default — nothing is published until you save it.
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
              🎮 Playing as: {ACTIVITY_TYPE_META.find((t) => t.slug === typeSlug)?.name ?? typeSlug ?? '—'}
              {typeSlug ? ' — change it in Step 1 (Type) if you want a different game.' : ''}
            </p>
            {curriculumTag && curriculumTagLabel(curriculumTag) && (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
                🌍 {curriculumTagLabel(curriculumTag)}
              </p>
            )}
            {(!meta.subject || !meta.grade) && (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
                ⚠️ Subject or grade is still blank. Tap “Edit details” to pick them in
                Details (Step 2) before you save, or the game will save without them.
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setStep(5)}
                style={{
                  minHeight: '48px', padding: '0.5rem 1.25rem', border: 'none',
                  borderRadius: 'var(--radius)', background: 'var(--gradient-btn)',
                  color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.95rem',
                  cursor: 'pointer', fontWeight: 700,
                }}
              >
                Preview and Save →
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  minHeight: '48px', padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius)', border: '2px solid var(--color-border)',
                  background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-display)', fontSize: '0.95rem', cursor: 'pointer',
                }}
              >
                Edit details
              </button>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <TypeSelector selected={typeSlug} onSelect={setTypeSlug} />
            )}
            {step === 2 && (
              <MetaForm meta={meta} onChange={setMeta} />
            )}
            {step === 3 && typeSlug && (
              <ItemEditor items={items} onChange={setItems} activityType={typeSlug} />
            )}
            {step === 4 && typeSlug && (
              <ActivityPreview typeSlug={typeSlug} meta={meta} items={items} />
            )}
            {step === 5 && (
              <div>
                <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', marginBottom: '0.25rem', fontSize: '1.25rem' }}>
                  Save Activity
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  Choose visibility and finalize. Saving needs a signed-in account —
                  if you are not signed in, sign in at the top first, then save here.
                </p>

                {/* Summary */}
                <div style={{
                  background: 'var(--color-surface-alt)', borderRadius: 'var(--radius)',
                  padding: '1rem', marginBottom: '1.25rem',
                }}>
                  <p style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 0.25rem' }}>
                    {meta.title}
                  </p>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    {meta.subject} · {meta.grade} · {items.filter((i) => i.prompt && i.answer).length} items
                  </p>
                </div>

                {/* Visibility toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button
                    role="switch"
                    aria-checked={saveOptions.isPublic}
                    onClick={() => setSaveOptions((o) => ({ ...o, isPublic: !o.isPublic }))}
                    style={{
                      width: '48px', height: '26px', borderRadius: '13px',
                      border: 'none', background: saveOptions.isPublic ? 'var(--color-success)' : 'var(--color-border)',
                      position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                    }}
                    aria-label="Toggle public/private"
                  >
                    <span style={{
                      position: 'absolute', top: '3px',
                      insetInlineStart: saveOptions.isPublic ? '24px' : '3px',
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                  <div>
                    <p style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '0.9rem', margin: 0 }}>
                      {saveOptions.isPublic ? '🌐 Public' : '🔒 Private'}
                    </p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', margin: 0 }}>
                      {saveOptions.isPublic ? 'Anyone can find and play this activity' : 'Only you can access this activity'}
                    </p>
                  </div>
                </div>

                {error && (
                  <div style={{
                    padding: '0.75rem', borderRadius: 'var(--radius)',
                    background: 'color-mix(in srgb, var(--color-danger) 15%, var(--color-surface))',
                    border: '1px solid var(--color-danger)',
                    color: 'var(--color-danger)', fontSize: '0.875rem',
                    fontFamily: 'var(--font-body)', marginBottom: '1rem',
                  }}
                    role="alert"
                  >
                    ⚠️ {error}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={save}
                  disabled={saving}
                  aria-label="Save activity"
                  style={{
                    width: '100%', padding: '0.875rem',
                    borderRadius: 'var(--radius)', border: 'none',
                    background: saving ? 'var(--color-text-muted)' : 'var(--gradient-btn)',
                    color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem',
                    cursor: saving ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow)',
                  }}
                >
                  {saving ? '⏳ Saving…' : '💾 Save Activity'}
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={back}
          disabled={step === 1}
          style={{
            padding: '0.75rem 1.25rem', minHeight: '48px', borderRadius: 'var(--radius)',
            border: '2px solid var(--color-border)', background: 'var(--color-surface)',
            color: step === 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)', fontSize: '0.9rem',
            cursor: step === 1 ? 'not-allowed' : 'pointer', opacity: step === 1 ? 0.5 : 1,
          }}
        >
          ← Back
        </motion.button>

        {step < 5 ? (
          <motion.button
            whileHover={canProceed() ? { scale: 1.02 } : {}}
            whileTap={canProceed() ? { scale: 0.98 } : {}}
            onClick={next}
            disabled={!canProceed()}
            style={{
              padding: '0.75rem 1.5rem', minHeight: '48px', borderRadius: 'var(--radius)',
              border: 'none',
              background: canProceed() ? 'var(--gradient-btn)' : 'var(--color-border)',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.9rem',
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              boxShadow: canProceed() ? 'var(--shadow)' : 'none',
            }}
          >
            {step === 4 ? 'Save →' : 'Next →'}
          </motion.button>
        ) : null}
      </div>

      {/* Validation hint */}
      {!canProceed() && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', textAlign: 'center', marginTop: '0.5rem' }}>
          {step === 1 && 'Choose an activity type to continue'}
          {step === 2 && 'Fill in title, subject, and grade to continue'}
          {step === 3 && 'Add at least 2 complete items (prompt + answer) to continue'}
        </p>
      )}
    </div>
  )
}
