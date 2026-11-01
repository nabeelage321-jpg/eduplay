import Link from 'next/link'
import { ArrowDown, Check, PencilLine, Sparkles, X } from 'lucide-react'

// V0 prompt-preview port, static (no fake typing animation, no fake
// draft submission). The card is a preview of the real /create flow:
// its only action links to the real locale create page.
export default function V0PromptPreview({ locale }: { locale: string }) {
  return (
    <figure
      style={{
        position: 'relative',
        margin: '0 auto',
        width: '100%',
        maxWidth: '28rem',
        borderRadius: '1.5rem',
        border: '2px solid var(--color-border)',
        background: 'var(--color-surface)',
        padding: '1.25rem',
        boxShadow: '0 10px 0 0 var(--color-border)',
      }}
    >
      <figcaption style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
        <Sparkles style={{ width: '1rem', height: '1rem' }} aria-hidden="true" />
        Prompt to game
      </figcaption>

      <p style={{ marginTop: '0.75rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        What will you teach today?
      </p>

      <div style={{ marginTop: '0.75rem', borderRadius: '1rem', border: '2px dashed var(--color-primary)', background: 'var(--color-surface-alt)', padding: '0.75rem 1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        Make a Grade 5 quiz from my water cycle chapter
        <span aria-hidden="true" style={{ display: 'inline-block', width: '2px', height: '1.25rem', marginInlineStart: '0.125rem', verticalAlign: 'middle', background: 'var(--color-primary)' }} />
      </div>

      <div style={{ margin: '0.75rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
        <ArrowDown style={{ width: '1rem', height: '1rem' }} aria-hidden="true" />
        Editable draft
      </div>

      <div style={{ borderRadius: '1rem', background: 'var(--color-background)', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Question 1 · Quiz</p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderRadius: '9999px', background: 'var(--color-surface)', padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            <PencilLine style={{ width: '0.875rem', height: '0.875rem' }} aria-hidden="true" />
            Edit
          </span>
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          What makes water turn into vapour?
        </p>
        <ul style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }} aria-label="Example answer feedback">
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.75rem', border: '2px solid var(--color-primary)', padding: '0.5rem 0.75rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            <Check style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} aria-hidden="true" />
            Heat from the sun
            <span style={{ marginInlineStart: 'auto', fontSize: '0.875rem', color: 'var(--color-primary)' }}>Correct</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.75rem', border: '2px solid #d32f2f', padding: '0.5rem 0.75rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            <X style={{ width: '1.25rem', height: '1.25rem', color: '#d32f2f' }} aria-hidden="true" />
            Cold wind
            <span style={{ marginInlineStart: 'auto', fontSize: '0.875rem', color: '#d32f2f' }}>Try again</span>
          </li>
        </ul>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }} aria-label="Switch game type without retyping">
        {['Quiz', 'Match Up', 'Flashcards', 'Spin Wheel'].map((type, i) => (
          <span
            key={type}
            style={{
              borderRadius: '9999px',
              padding: '0.375rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              background: i === 0 ? 'var(--color-text-primary)' : 'var(--color-surface-alt)',
              color: i === 0 ? 'var(--color-surface)' : 'var(--color-text-primary)',
            }}
          >
            {type}
          </span>
        ))}
      </div>

      <Link
        href={`/${locale}/create`}
        style={{ marginTop: '1rem', display: 'inline-flex', minHeight: '48px', alignItems: 'center', fontWeight: 800, color: 'var(--color-primary)' }}
      >
        Try it — start from a prompt →
      </Link>
    </figure>
  )
}
