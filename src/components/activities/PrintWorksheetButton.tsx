'use client'

import { useEffect, useState } from 'react'
import type { Activity } from '@/types'
import PrintExport from '@/components/activities/PrintExport'
import {
  canShowPrintButton,
  isPrintableWorksheetType,
  notPrintableWorksheetReason,
} from '@/lib/print-worksheet'

interface PrintWorksheetButtonProps {
  activity: Activity
  /** True unless the row's is_public is exactly false (same rule the play page uses). */
  isPublic: boolean
}

/**
 * The ONE new print control (detail page, next to Play / Copy & Edit).
 * The pre-existing list-card print button is unchanged in placement
 * and is now gated by the same rules below; print is NOT added to
 * the play page, browse hubs, or the homepage.
 *
 * Audience rule: a public game prints for anyone. A private game
 * prints ONLY for its owner, proven the same way HostLiveGame and
 * the play page's convert gate prove it — GET /api/my-activities
 * lists the signed-in user's own games. While that check runs, or
 * for a non-owner, NOTHING renders here: no button, no print view,
 * so a private game's questions can never leak through this control.
 * A non-printable type renders a plain note instead of a button,
 * never a mangled worksheet.
 */
export default function PrintWorksheetButton({ activity, isPublic }: PrintWorksheetButtonProps) {
  const [showPrint, setShowPrint] = useState(false)
  const [isOwner, setIsOwner] = useState<boolean | null>(isPublic ? true : null)
  const [ownerChecked, setOwnerChecked] = useState(isPublic)

  useEffect(() => {
    if (isPublic) return
    let cancelled = false
    fetch('/api/my-activities')
      .then((res) => (res.ok ? res.json() : { activities: [] }))
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data.activities) ? data.activities : []
        setIsOwner(list.some((g: { id?: string }) => g.id === activity.id))
        setOwnerChecked(true)
      })
      .catch(() => {
        if (!cancelled) {
          setIsOwner(false)
          setOwnerChecked(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [isPublic, activity.id])

  if (!activity.items || activity.items.length === 0) return null

  if (!isPrintableWorksheetType(activity.type_id)) {
    const reason = notPrintableWorksheetReason(activity.type_id)
    if (!reason) return null
    return (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.75rem', flexBasis: '100%' }}>
        🖨️ {reason}
      </p>
    )
  }

  // Private game: render nothing until ownership is proven, and
  // nothing at all for a non-owner.
  if (!isPublic && !ownerChecked) return null
  if (!canShowPrintButton({ typeSlug: activity.type_id, isPublic, isOwner: isOwner === true })) return null

  return (
    <>
      <button
        onClick={() => setShowPrint(true)}
        aria-label={`Print worksheet for ${activity.title}`}
        title="Print worksheet"
        style={{
          padding: '0.875rem 1.25rem',
          background: 'var(--color-surface-alt)',
          color: 'var(--color-primary)',
          borderRadius: 'var(--radius)',
          fontWeight: 600,
          border: '2px solid var(--color-primary)',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        🖨️ Print worksheet
      </button>
      {showPrint && <PrintExport activity={activity} onClose={() => setShowPrint(false)} />}
    </>
  )
}
