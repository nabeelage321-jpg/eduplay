// ─── Image approval (owner order 2026-11-07 13:19 PKT) ──────────
// Images are dangerous: a wrong picture under EduPlay's name is
// EduPlay's responsibility. So:
//   * ONLY teachers (role 'teacher') and the owner (role 'admin')
//     may add pictures. Kids/students NEVER — not even via the
//     picker. Parents may not add pictures either.
//   * Every added/changed picture enters PENDING (table
//     image_approvals, migration 012). The picture is NOT written
//     into the game's content while pending, and a game with a
//     pending picture stays PRIVATE.
//   * The OWNER personally approves or rejects each picture in the
//     review queue (/[locale]/admin/image-reviews). Approve writes
//     the picture into the game and restores the visibility the
//     teacher asked for (unless another picture is still pending).
//     Reject drops the picture; the game stays private/imageless.
//     The row stays as the approval record: who approved/rejected
//     what and when.
//   * Until migration 012 is run, new pictures are NOT saved at all
//     (the game still saves, without the picture) and the creator is
//     told to ask the owner to run the migration — never break the
//     site, never publish an unapproved picture.

import type { ActivityItem } from '@/types'

/** Teachers and the owner (admin) may add pictures. Nobody else. */
export function canAddImages(role: string | null | undefined): boolean {
  return role === 'teacher' || role === 'admin'
}

/** Only the owner (role 'admin') reviews pictures. */
export function isImageReviewer(role: string | null | undefined): boolean {
  return role === 'admin'
}

/** Types whose one picture serves the whole game (first item's imageUrl). */
export const SHARED_IMAGE_TYPES = ['labelled-diagram', 'map-quiz', 'jigsaw-puzzle', 'video-quiz'] as const

export interface ImageSlot {
  /** null = the game's shared picture; a number = that item's own picture. */
  itemIndex: number | null
  url: string
  credit: string
}

/** The picture slots a save carries: one shared slot, or one per item. */
export function imageSlotsForSave(type: string, items: ActivityItem[]): ImageSlot[] {
  if ((SHARED_IMAGE_TYPES as readonly string[]).includes(type)) {
    const url = (items[0]?.imageUrl ?? '').trim()
    if (!url) return []
    return [{ itemIndex: null, url, credit: (items[0]?.imageCredit ?? '').trim() }]
  }
  const slots: ImageSlot[] = []
  items.forEach((item, i) => {
    const url = (item.imageUrl ?? '').trim()
    if (url) slots.push({ itemIndex: i, url, credit: (item.imageCredit ?? '').trim() })
  })
  return slots
}

/** True when a Supabase error means the image_approvals table is missing (migration 012 not run). */
export function isImageApprovalSetupError(error: unknown): boolean {
  const msg = (error as { message?: string } | null)?.message ?? ''
  return /42P01|relation .* does not exist|Could not find the table|schema cache/i.test(msg)
}

export interface ImageGatePlan {
  /** Items to store: held-back pictures stripped (old pictures kept). */
  items: ActivityItem[]
  /** True when the game must stay private because a picture is pending. */
  forcePrivate: boolean
  /** New/changed slots to file as pending once the game row exists. */
  changedSlots: ImageSlot[]
  imageApproval: {
    setupReady: boolean
    allowed: boolean
    submitted: number
    pending: boolean
    dropped: number
  }
}

type SupabaseLike = ReturnType<typeof import('@/lib/supabase/server').createServerClient>

/** True when the game has a picture still waiting for owner approval. */
async function hasPendingImage(supabase: SupabaseLike, activityId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('image_approvals')
      .select('id')
      .eq('activity_id', activityId)
      .eq('status', 'pending')
      .limit(1)
    if (error) return false
    return (data?.length ?? 0) > 0
  } catch {
    return false
  }
}

/**
 * Decide what a save may store, BEFORE the game row is written.
 * New/changed pictures are held back from the content — they are
 * filed as pending by submitPendingImages() after the row exists.
 * Pictures the caller may not add (wrong role) or that cannot be
 * filed (migration 012 not run) are stripped and counted as
 * dropped, so the game still saves and nothing unapproved ever
 * reaches the public game.
 */
export async function planImageGate(
  supabase: SupabaseLike,
  opts: {
    role: string | null
    type: string
    items: ActivityItem[]
    existingItems: ActivityItem[]
    activityId: string | null
  },
): Promise<ImageGatePlan> {
  const { role, type, items, existingItems, activityId } = opts
  const slots = imageSlotsForSave(type, items)
  const existingSlots = imageSlotsForSave(type, existingItems)
  const changedSlots = slots.filter(
    (s) => !existingSlots.some((e) => e.url === s.url && e.itemIndex === s.itemIndex),
  )

  // No pictures at all in this save: nothing to gate. A pending
  // picture from an earlier save still holds the game private.
  if (slots.length === 0) {
    const pending = activityId ? await hasPendingImage(supabase, activityId) : false
    return {
      items,
      forcePrivate: pending,
      changedSlots: [],
      imageApproval: { setupReady: true, allowed: canAddImages(role), submitted: 0, pending, dropped: 0 },
    }
  }

  // Wrong role: strip every picture. A kid's game never carries one.
  if (!canAddImages(role)) {
    return {
      items: items.map((it) => ({ ...it, imageUrl: '', imageCredit: '' })),
      forcePrivate: false,
      changedSlots: [],
      imageApproval: { setupReady: true, allowed: false, submitted: 0, pending: false, dropped: slots.length },
    }
  }

  // Nothing new: the pictures already in the content are approved
  // (or were filed earlier). Keep them; the game is not held by
  // this save — unless an earlier picture is still pending.
  if (changedSlots.length === 0) {
    const pending = activityId ? await hasPendingImage(supabase, activityId) : false
    return {
      items,
      forcePrivate: pending,
      changedSlots: [],
      imageApproval: { setupReady: true, allowed: true, submitted: 0, pending, dropped: 0 },
    }
  }

  // New/changed pictures: probe the approvals table first.
  const probe = await supabase.from('image_approvals').select('id').limit(1)
  if (probe.error && isImageApprovalSetupError(probe.error)) {
    // Migration 012 not run: the pictures cannot be filed, so they
    // are NOT stored. The game saves without them.
    const heldBack = items.map((it, i) => {
      const changed = changedSlots.find((s) => s.itemIndex === null || s.itemIndex === i)
      if (!changed) return it
      const old = existingSlots.find((e) => e.itemIndex === changed.itemIndex)
      return { ...it, imageUrl: old?.url ?? '', imageCredit: old?.credit ?? '' }
    })
    return {
      items: heldBack,
      forcePrivate: false,
      changedSlots: [],
      imageApproval: { setupReady: false, allowed: true, submitted: 0, pending: false, dropped: changedSlots.length },
    }
  }

  // Filed as pending: hold the new pictures back from the content
  // (the old picture, if any, stays live) and hold the game private.
  const heldBack = items.map((it, i) => {
    const changed = changedSlots.find((s) => s.itemIndex === null || s.itemIndex === i)
    if (!changed) return it
    const old = existingSlots.find((e) => e.itemIndex === changed.itemIndex)
    return { ...it, imageUrl: old?.url ?? '', imageCredit: old?.credit ?? '' }
  })
  return {
    items: heldBack,
    forcePrivate: true,
    changedSlots,
    imageApproval: { setupReady: true, allowed: true, submitted: changedSlots.length, pending: true, dropped: 0 },
  }
}

/**
 * File the planned slots as pending rows. Deduplicates: a pending
 * row for the same game + item + URL already exists, so a re-save
 * does not file it twice. A missing table (migration 012 not run)
 * files nothing and reports setupReady false.
 */
export async function submitPendingImages(
  supabase: SupabaseLike,
  opts: { activityId: string; submittedBy: string; slots: ImageSlot[]; wasPublic: boolean },
): Promise<{ submitted: number; setupReady: boolean }> {
  if (opts.slots.length === 0) return { submitted: 0, setupReady: true }
  let existing: Array<{ item_index: number | null; image_url: string }> = []
  try {
    const res = await supabase
      .from('image_approvals')
      .select('item_index, image_url')
      .eq('activity_id', opts.activityId)
      .eq('status', 'pending')
    if (res.error) {
      if (isImageApprovalSetupError(res.error)) return { submitted: 0, setupReady: false }
      throw res.error
    }
    existing = res.data ?? []
  } catch (err) {
    if (isImageApprovalSetupError(err)) return { submitted: 0, setupReady: false }
    throw err
  }
  const fresh = opts.slots.filter(
    (s) => !existing.some((e) => e.image_url === s.url && e.item_index === s.itemIndex),
  )
  if (fresh.length === 0) return { submitted: 0, setupReady: true }
  const { error } = await supabase.from('image_approvals').insert(
    fresh.map((s) => ({
      activity_id: opts.activityId,
      item_index: s.itemIndex,
      image_url: s.url,
      image_credit: s.credit,
      status: 'pending',
      submitted_by: opts.submittedBy,
      was_public: opts.wasPublic,
    })),
  )
  if (error) {
    if (isImageApprovalSetupError(error)) return { submitted: 0, setupReady: false }
    throw error
  }
  return { submitted: fresh.length, setupReady: true }
}
