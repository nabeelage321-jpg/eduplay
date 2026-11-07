'use client'

/**
 * KID ACTIONS BAR (batch-1 shared build, final list item 17).
 *
 * During play a kid can do THREE things — all three, as the owner
 * ordered ("add these alls"):
 *   💡 Hint — removes ONE wrong answer (the 50-50). Only for
 *     choice rounds; types without wrong answers to remove hide it.
 *   ⏭️ Skip — skips the current question/word with NO points and
 *     moves on. Skipping never earns points and never changes the
 *     game's own scoring: a skipped round scores exactly 0, the
 *     same as a wrong answer.
 *   👁️ See the answer — shows the correct answer AND why it is
 *     correct (the item's own hint, when the game has one; otherwise
 *     the correct answer alone, never an invented explanation).
 *
 * The bar is only UI + callbacks: each player wires the actions its
 * mechanic honestly supports and hides the ones that do not map
 * (e.g. Match Up has no wrong answers to remove and no question to
 * skip, so it shows Hint only). Nothing here changes a game's rules
 * or scoring — the actions are the owner's ordered additions, and
 * each player keeps its own point values.
 */

export interface KidActionHandlers {
  /** Remove one wrong answer (choice rounds). Omit when it cannot apply. */
  onHint?: () => void
  /** Skip the current round for 0 points. Omit when it cannot apply. */
  onSkip?: () => void
  /** Reveal the correct answer + why. Omit when it cannot apply. */
  onShowAnswer?: () => void
  /** True while the hint for THIS round is already used. */
  hintUsed?: boolean
  /** True while the answer for THIS round is already revealed. */
  answerShown?: boolean
  /** Small note beside the Hint button, e.g. how many hints are
   *  left and what one costs ("2 left · −5 marks each"). */
  hintNote?: string
}

const BTN: React.CSSProperties = {
  padding: '0.5rem 0.85rem',
  borderRadius: '9999px',
  border: '2px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontWeight: 700,
  fontSize: '0.85rem',
  cursor: 'pointer',
  minHeight: '40px',
}

export default function KidActionsBar({
  onHint,
  onSkip,
  onShowAnswer,
  hintUsed,
  answerShown,
  hintNote,
}: KidActionHandlers) {
  if (!onHint && !onSkip && !onShowAnswer) return null
  return (
    <div
      role="group"
      aria-label="Things you can do while playing"
      style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginBottom: '0.75rem' }}
    >
      {onHint ? (
        <>
          <button type="button" onClick={onHint} disabled={!!hintUsed} aria-label="Use a hint: remove one wrong answer" style={{ ...BTN, opacity: hintUsed ? 0.5 : 1, cursor: hintUsed ? 'default' : 'pointer' }}>
            💡 Hint
          </button>
          {hintNote ? (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{hintNote}</span>
          ) : null}
        </>
      ) : null}
      {onSkip ? (
        <button type="button" onClick={onSkip} aria-label="Skip this question: no points, move on" style={BTN}>
          ⏭️ Skip
        </button>
      ) : null}
      {onShowAnswer ? (
        <button type="button" onClick={onShowAnswer} disabled={!!answerShown} aria-label="See the correct answer and learn why" style={{ ...BTN, opacity: answerShown ? 0.5 : 1, cursor: answerShown ? 'default' : 'pointer' }}>
          👁️ See the answer
        </button>
      ) : null}
    </div>
  )
}
