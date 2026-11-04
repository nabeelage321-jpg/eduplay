/**
 * Free, on-device OCR for chapter photos (Tesseract.js, browser worker).
 *
 * Privacy: photos are read in the browser on the user's own device and
 * are never uploaded to any server. On first use the browser downloads
 * the reader script and the English language data from the public
 * Tesseract.js CDN (jsdelivr) — that download contains no photo data.
 * No API key, no paid cloud OCR, no server cost.
 *
 * Honest limits (v1):
 * - Printed English text reads well.
 * - Handwriting reads poorly.
 * - Urdu Nastaliq reads poorly with free Tesseract — that is an open
 *   item (a cloud OCR service, paid, with a key in Vercel env, is a
 *   later option), not a silent failure.
 * - PDF is NOT handled here at all: PDF-to-image OCR is a separate
 *   later batch. The UI keeps an honest "PDF text is not read" note.
 */

export type OcrPageResult = {
  fileName: string
  /** Extracted text for this page ('' when the page failed). */
  text: string
  ok: boolean
  error?: string
}

export type OcrProgress = {
  current: number
  total: number
  fileName: string
}

/**
 * Combine per-page results into one chapter text, in upload order.
 * Failed pages are skipped from the text and reported by name, so a
 * single bad photo never silently eats the rest of the chapter.
 */
export function combineOcrPages(pages: OcrPageResult[]): {
  text: string
  failedNames: string[]
} {
  const failedNames = pages.filter((p) => !p.ok).map((p) => p.fileName)
  const text = pages
    .filter((p) => p.ok)
    .map((p) => p.text.trim())
    .filter((t) => t.length > 0)
    .join('\n\n')
  return { text, failedNames }
}

/**
 * Run OCR over the given image files, in order, with one shared
 * worker (create once, recognise each image, terminate once — the
 * documented Tesseract.js pattern). Progress is reported before each
 * page so the UI can say "Reading photo 2 of 3…".
 *
 * The tesseract.js import is dynamic so the reader is only loaded
 * when the user actually asks to read photos (ChapterScan itself is
 * already loaded client-only with ssr:false).
 */
export async function recognizeImages(
  files: File[],
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrPageResult[]> {
  if (files.length === 0) return []
  let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>
  try {
    const Tesseract = await import('tesseract.js')
    worker = await Tesseract.createWorker('eng')
  } catch {
    throw new Error(
      'Could not load the photo reader — check your internet connection and try again. ' +
        'Your photos were not sent anywhere; reading happens on your device.',
    )
  }
  const results: OcrPageResult[] = []
  try {
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]
      onProgress?.({ current: i + 1, total: files.length, fileName: file.name })
      try {
        const ret = await worker.recognize(file)
        results.push({ fileName: file.name, text: ret.data.text ?? '', ok: true })
      } catch {
        results.push({
          fileName: file.name,
          text: '',
          ok: false,
          error: 'This photo could not be read. Try a straighter, better-lit photo.',
        })
      }
    }
  } finally {
    await worker.terminate().catch(() => undefined)
  }
  return results
}
