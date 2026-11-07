// BATCH 1 (final list item 34): Random Wheel landing maths.
//
// The wheel must land on a question the kid has not answered yet, so
// the spin target is chosen FIRST (from the unasked, playable
// questions) and the rotation is computed to land the pointer on it —
// never the other way round. `wheelLandingIndex` is the exact inverse
// of the pointer math (pointer at the top, segment i spans
// [i * segAngle, (i + 1) * segAngle) going clockwise from the top).

export function wheelLandingIndex(rotation: number, n: number): number {
  if (n <= 0) return 0
  const segAngle = 360 / n
  const norm = ((rotation % 360) + 360) % 360
  return Math.floor(((360 - norm) % 360) / segAngle) % n
}

/** Rotation that spins the wheel several full turns and lands the
 *  pointer in the middle of segment `targetIdx` (0-based). */
export function wheelSpinTo(rotation: number, targetIdx: number, n: number): number {
  if (n <= 0) return rotation
  const segAngle = 360 / n
  const targetNorm = (360 - (targetIdx + 0.5) * segAngle + 360) % 360
  const currentNorm = ((rotation % 360) + 360) % 360
  const delta = (targetNorm - currentNorm + 360) % 360
  return rotation + 1440 + delta
}
