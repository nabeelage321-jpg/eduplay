'use client'

import { motion } from 'framer-motion'
import type { Activity } from '@/types'
import { ACTIVITY_TYPE_META } from '@/components/creator/TypeSelector'
import {
  escapePrintHtml,
  isPrintableWorksheetType,
  normalizeWorksheetTypeSlug,
  stableShuffle,
} from '@/lib/print-worksheet'
import { buildSpeedJudgeRounds } from '@/lib/speed-judge'
import { buildPictureAnswerRounds } from '@/lib/picture-answer'
import { buildClaimLineQuestions } from '@/lib/claim-line'
import { spellItCells } from '@/lib/spell-it'

export { isPrintableWorksheetType, normalizeWorksheetTypeSlug }

interface PrintExportProps {
  activity: Activity
  onClose: () => void
}

type Item = NonNullable<Activity['items']>[number]

function isMatchType(slug: string): boolean {
  return slug === 'match-up' || slug === 'memory-match'
}

function isQuizLike(slug: string): boolean {
  return (
    slug === 'quiz' ||
    slug === 'gameshow-quiz' ||
    slug === 'jump-path' ||
    slug === 'aster-quiz' ||
    slug === 'balloon-pop' ||
    slug === 'whack-a-mole' ||
    slug === 'spin-wheel' ||
    slug === 'open-box' ||
    slug === 'typing-race'
  )
}

/**
 * Student worksheet HTML. Rule, enforced here and nowhere else:
 * the worksheet NEVER contains an answer. Answers live ONLY in
 * the answer key, which starts on a fresh printed page
 * (break-before: page), so a teacher can print the worksheet
 * pages, the key page, or both via the browser print dialog's
 * page selection. The browser's own print dialog (window.print)
 * is the print/PDF mechanism — the user picks Save as PDF there.
 * No server PDF generation, no PDF library.
 */
export function generatePrintHTML(activity: Activity): string {
  const slug = normalizeWorksheetTypeSlug(activity.type_id ?? (activity as { type?: string }).type)
  const typeMeta = ACTIVITY_TYPE_META.find((t) => t.slug === slug)
  const items = activity.items ?? []
  const esc = escapePrintHtml

  // Matching columns: right-hand answers are deterministically
  // shuffled, so the key's number→letter mapping cannot drift.
  const matchOrder = isMatchType(slug)
    ? stableShuffle(items, (it) => it.answer)
    : items
  const matchLetterOf = new Map<Item, string>()
  matchOrder.forEach((it, i) => {
    matchLetterOf.set(it, String.fromCharCode(65 + i))
  })

  // Order worksheet: items are shuffled; the student writes the
  // correct position number beside each one.
  const orderItems = slug === 'order' ? stableShuffle(items, (it) => it.prompt + '|' + it.answer) : items

  // Speed Judge worksheet: claims are DETERMINISTIC (original
  // order, even rounds true, odd rounds the next item's answer),
  // so the student sheet and the answer key below are built from
  // the exact same rounds and can never drift apart. The claim
  // itself is shown — judging it is the task, as with True/False
  // — but the correct judgement lives ONLY in the key.
  const speedJudgeRounds = slug === 'speed-judge'
    ? buildSpeedJudgeRounds(items, { deterministic: true })
    : []
  // Picture Answer worksheet: rounds are DETERMINISTIC
  // (original order, stored option order), so the student
  // sheet and the answer key below are built from the exact
  // same rounds and can never drift apart. The picture is
  // the teacher's own URL printed from that URL; an item
  // with no picture gets a plain "No picture" line — never
  // a fake picture. Options are blank checkboxes with
  // NOTHING marking the correct one; the answer lives ONLY
  // in the key.
  const pictureAnswerRounds = slug === 'picture-answer'
    ? buildPictureAnswerRounds(items, { deterministic: true })
    : []
  // Claim Line worksheet: questions are DETERMINISTIC
  // (original item order), so the student sheet and the
  // answer key below are built from the exact same
  // questions and can never drift apart. Options are
  // stably shuffled per question (keyed by option text)
  // so the sheet never leaks the answer position. The
  // on-screen computer opponent has no paper equivalent,
  // so the sheet says plainly to play with a friend,
  // taking turns, or on your own.
  const claimLineQuestions = slug === 'claim-line'
    ? buildClaimLineQuestions(items, { deterministic: true })
    : []
  const orderPositionOf = new Map<Item, number>()
  items.forEach((it, i) => {
    orderPositionOf.set(it, i + 1)
  })

  let itemsHTML = ''
  if (isMatchType(slug)) {
    const left = items
      .map(
        (item, i) => `
        <div class="match-row">
          <span class="match-num">${i + 1}.</span>
          <span class="match-text">${esc(item.prompt)}</span>
          <span class="match-blank">______</span>
        </div>`,
      )
      .join('')
    const right = matchOrder
      .map(
        (item, i) => `
        <div class="match-row">
          <span class="match-letter">${String.fromCharCode(65 + i)}.</span>
          <span class="match-text">${esc(item.answer)}</span>
        </div>`,
      )
      .join('')
    itemsHTML = `
      <p class="match-intro">Match each item on the left with the correct item on the right. Write the letter in the blank.</p>
      <div class="match-cols">
        <div class="match-col"><h3>Column A</h3>${left}</div>
        <div class="match-col"><h3>Column B</h3>${right}</div>
      </div>`
  } else if (slug === 'speed-judge') {
    itemsHTML = `
      <p class="match-intro">Judge each claim: tick Correct if the claimed answer really answers the question, or Wrong if it does not. Judge fast — but the paper has no timer.</p>
      ${speedJudgeRounds
        .map(
          (round, i) => `
        <div class="item">
          <div class="question-num">${i + 1}.</div>
          <p class="prompt">${esc(round.prompt)} → <strong>${esc(round.claimedAnswer)}</strong></p>
          <div class="tf-boxes">
            <span class="tf-box">Correct ☐</span>
            <span class="tf-box">Wrong ☐</span>
          </div>
        </div>`,
        )
        .join('')}`
  } else if (slug === 'picture-answer') {
    itemsHTML = `
      <p class="match-intro">Look at the picture, read the question, and tick the answer that fits. A question with no picture says so — answer it from the question alone.</p>
      ${pictureAnswerRounds
        .map(
          (round, i) => `
        <div class="item">
          <div class="question-num">${i + 1}.</div>
          ${round.imageUrl
            ? `<img src="${esc(round.imageUrl)}" alt="" style="display:block;max-width:100%;max-height:280px;object-fit:cover;border-radius:6px;margin-bottom:0.5rem;">`
            : `<p style="font-size:0.875rem;color:#666;margin-bottom:0.5rem;">🖼️ No picture for this question — answer from the question.</p>`}
          <p class="prompt">${esc(round.prompt)}</p>
          <div class="options">${round.options
            .map((opt, oi) => `<span class="opt">☐ ${String.fromCharCode(65 + oi)}) ${esc(opt)}</span>`)
            .join('')}</div>
        </div>`,
        )
        .join('')}`
  } else if (slug === 'memory-recall') {
    // Recall worksheet: the prompt only plus a writing line.
    // The answer lives ONLY in the key, never on the student
    // sheet. The on-screen study phase has no paper
    // equivalent, so the sheet says plainly to answer from
    // memory — it is a recall test, not an open-book sheet.
    itemsHTML = `
      <p class="match-intro">Answer each question from memory — do not look at your notes. Write your recalled answer on the line.</p>
      ${items
        .map(
          (item, i) => `
        <div class="item">
          <div class="question-num">${i + 1}.</div>
          <p class="prompt">${esc(item.prompt)}</p>
          <p class="answer-blank">Answer: _______________________________</p>
        </div>`,
        )
        .join('')}`
  } else if (slug === 'claim-line') {
    // Paper Claim Line: an empty 3x3 board to mark by hand
    // (first line of 3 wins, same as on screen) plus the
    // game's questions with blank option checkboxes —
    // nothing marks the correct option. The answer lives
    // ONLY in the key.
    const boardHTML = `<table style="border-collapse:collapse;margin:0 auto 1.25rem;"><tbody>${[0, 1, 2].map((r) => `<tr>${[0, 1, 2].map(() => `<td style="width:64px;height:64px;border:2px solid #333;text-align:center;">&nbsp;</td>`).join('')}</tr>`).join('')}</tbody></table>`
    itemsHTML = `
      <p class="match-intro">Play on paper: answer a question to claim a square — mark your square on the board. First line of 3 wins. Play with a friend, taking turns, or on your own.</p>
      ${boardHTML}
      ${claimLineQuestions
        .map(
          (q, i) => `
        <div class="item">
          <div class="question-num">${i + 1}.</div>
          <p class="prompt">${esc(q.prompt)}</p>
          <div class="options">${stableShuffle(q.options, (opt) => opt)
            .map((opt, oi) => `<span class="opt">☐ ${String.fromCharCode(65 + oi)}) ${esc(opt)}</span>`)
            .join('')}</div>
        </div>`,
        )
        .join('')}`
  } else if (slug === 'opinion-cloud') {
    // Opinion sheet: KEYLESS by definition. Statements with
    // Agree / Disagree / Not sure checkboxes and a plain
    // "no right answers" note. No answer is ever printed:
    // the item's answer is not an opinion, and a key page
    // for opinions would be a lie — so the final page
    // below states plainly that there is no key.
    const opinionItems = items.filter((item) => item.prompt?.trim())
    itemsHTML = `
      <p class="match-intro">There are no right answers — tick what YOU think. Agree, disagree, or not sure: every opinion counts, none is marked wrong. Discuss your ticks together afterwards.</p>
      ${opinionItems
        .map(
          (item, i) => `
        <div class="item">
          <div class="question-num">${i + 1}.</div>
          <p class="prompt">${esc(item.prompt)}</p>
          <div class="tf-boxes">
            <span class="tf-box">Agree ☐</span>
            <span class="tf-box">Disagree ☐</span>
            <span class="tf-box">Not sure ☐</span>
          </div>
        </div>`,
        )
        .join('')}`
  } else if (slug === 'order') {
    itemsHTML = `
      <p class="match-intro">Write the correct order number (1, 2, 3…) in the blank beside each item.</p>
      ${orderItems
        .map(
          (item) => `
        <div class="item">
          <div class="question-num">Order: ______</div>
          <p class="prompt">${esc(item.prompt)}</p>
        </div>`,
        )
        .join('')}`
  } else {
    itemsHTML = items
      .map((item, i) => {
        if (slug === 'true-false') {
          return `
        <div class="item">
          <div class="question-num">${i + 1}.</div>
          <p class="prompt">${esc(item.prompt)}</p>
          <div class="tf-boxes">
            <span class="tf-box">True ☐</span>
            <span class="tf-box">False ☐</span>
          </div>
        </div>`
        }
        if (slug === 'spell-it') {
          const blanks = spellItCells(item.answer)
            .map((c) => (c.kind === 'letter' ? '_' : c.kind === 'gap' ? '&nbsp;&nbsp;' : esc(c.char)))
            .join(' ')
          return `
        <div class="item">
          <div class="question-num">${i + 1}. <em>${esc(item.prompt)}</em></div>
          <p class="blanks">${blanks}</p>
        </div>`
        }
        if (slug === 'hangman') {
          const blanks = item.answer
            .toUpperCase()
            .split('')
            .map((c) => (c === ' ' ? '&nbsp;&nbsp;' : '_'))
            .join(' ')
          return `
        <div class="item">
          <div class="question-num">${i + 1}. <em>${esc(item.prompt)}</em></div>
          <p class="blanks">${blanks}</p>
        </div>`
        }
        if (slug === 'fill-blank' || slug === 'missing-word') {
          const sentence = item.prompt.includes('___')
            ? item.prompt.replace('___', '________________')
            : `${item.prompt} ________________`
          return `
        <div class="item">
          <div class="question-num">${i + 1}.</div>
          <p class="prompt">${esc(sentence)}</p>
        </div>`
        }
        if (isQuizLike(slug) && item.answers && item.answers.length > 1) {
          // Options are shown as blank checkboxes, in stored order,
          // with NOTHING marking the correct one. Showing the answer
          // as option A (the old behaviour) leaked the key into the
          // student sheet and is deliberately gone.
          const opts = item.answers
            .map((opt, oi) => `<span class="opt">☐ ${String.fromCharCode(65 + oi)}) ${esc(opt)}</span>`)
            .join('')
          return `
        <div class="item">
          <div class="question-num">Q${i + 1}</div>
          <p class="prompt">${esc(item.prompt)}</p>
          <div class="options">${opts}</div>
        </div>`
        }
        // Flashcards, riddle, letter-wheel, anagram, categorize,
        // bingo and every other text Q&A type: prompt only plus a
        // writing line. The answer is key-only, never here.
        return `
        <div class="item">
          <div class="question-num">${i + 1}.</div>
          <p class="prompt">${esc(item.prompt)}</p>
          <p class="answer-blank">Answer: _______________________________</p>
        </div>`
      })
      .join('')
  }

  // Answer key, on its own printed page. For matching types the
  // key maps each left number to its right-hand letter; for order
  // it lists the items in correct sequence; otherwise "N. answer".
  let keyHTML = ''
  if (isMatchType(slug)) {
    keyHTML = items
      .map((item, i) => `<div class="answer-item">${i + 1}. → ${matchLetterOf.get(item) ?? '?'}</div>`)
      .join('')
  } else if (slug === 'order') {
    keyHTML = items
      .map((item, i) => `<div class="answer-item">${i + 1}. ${esc(item.prompt)}</div>`)
      .join('')
  } else if (slug === 'speed-judge') {
    keyHTML = speedJudgeRounds
      .map((round, i) => `<div class="answer-item">${i + 1}. ${round.correctJudgement === 'correct' ? 'Correct' : 'Wrong'}</div>`)
      .join('')
  } else if (slug === 'claim-line') {
    // Keyed from the same deterministic questions as the
    // sheet (original item order), so sheet and key can
    // never drift apart — and the key lists the answer
    // text, never a letter, so the stably shuffled sheet
    // options cannot be reverse-engineered from it.
    keyHTML = claimLineQuestions
      .map((q, i) => `<div class="answer-item">${i + 1}. ${esc(q.answer)}</div>`)
      .join('')
  } else {
    keyHTML = items.map((item, i) => `<div class="answer-item">${i + 1}. ${esc(item.answer)}</div>`).join('')
  }

  // Opinion Cloud has NO answer key by definition: opinions
  // have no right answers, so the final page states plainly
  // that there is no key instead of faking one.
  const keySection = slug === 'opinion-cloud'
    ? `<div class="answer-key">
    <h2>No answer key</h2>
    <p style="font-size:0.9rem;color:#444;">Opinions have no right answers — there is nothing to mark. Discuss the ticked opinions together instead.</p>
  </div>`
    : `<div class="answer-key">
    <h2>Answer Key (Teacher Only)</h2>
    <div class="answers-grid">
      ${keyHTML}
    </div>
  </div>`

  return `<!DOCTYPE html>
<html lang="${esc(activity.locale || 'en')}" dir="${['ur', 'ar'].includes(activity.locale || '') ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <title>${esc(activity.title)} — EduPlay Worksheet</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 1.5rem; max-width: 820px; margin: 0 auto; }
    .header { border-bottom: 3px solid #6366f1; padding-bottom: 0.75rem; margin-bottom: 1.25rem; }
    .title { font-size: 1.4rem; font-weight: 800; color: #1a1a2e; }
    .meta { font-size: 0.8rem; color: #666; margin-top: 0.25rem; }
    .logo { float: right; font-size: 0.85rem; color: #6366f1; font-weight: 700; }
    .name-line { margin-bottom: 1.5rem; }
    .name-line label { font-size: 0.875rem; color: #555; }
    .name-line span { display: inline-block; border-bottom: 1.5px solid #333; width: 200px; margin-inline-start: 0.5rem; }
    .items { display: flex; flex-direction: column; gap: 1.25rem; }
    .item { padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; break-inside: avoid; }
    .question-num { font-weight: 700; font-size: 0.8rem; color: #6366f1; margin-bottom: 0.3rem; }
    .prompt { font-size: 0.95rem; margin-bottom: 0.4rem; }
    .options { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem; }
    .opt { font-size: 0.875rem; color: #444; }
    .tf-boxes { display: flex; gap: 1.5rem; margin-top: 0.35rem; }
    .tf-box { font-size: 0.875rem; border: 1.5px solid #333; padding: 0.2rem 0.75rem; border-radius: 4px; }
    .blanks { font-size: 1.3rem; letter-spacing: 0.3em; margin-top: 0.35rem; }
    .answer-blank { font-size: 0.875rem; color: #555; margin-top: 0.35rem; }
    .match-intro { font-size: 0.95rem; margin-bottom: 1rem; color: #444; }
    .match-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .match-col h3 { font-size: 0.9rem; color: #6366f1; margin-bottom: 0.75rem; }
    .match-row { display: flex; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
    .match-num, .match-letter { font-weight: 700; color: #6366f1; }
    .match-blank { margin-left: auto; color: #999; }
    .answer-key { margin-top: 2rem; padding-top: 1rem; border-top: 2px dashed #ccc; break-before: page; page-break-before: always; }
    .answer-key h2 { font-size: 0.9rem; color: #6366f1; margin-bottom: 0.75rem; }
    .answers-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; }
    .answer-item { font-size: 0.8rem; color: #444; }
    .footer { margin-top: 2rem; text-align: center; font-size: 0.7rem; color: #aaa; }
    @media print {
      body { padding: 1rem; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="logo">EduPlay</span>
    <div class="title">${esc(typeMeta?.icon ?? '')} ${esc(activity.title)}</div>
    <div class="meta">${esc(activity.subject_id ?? '')} ${activity.grade_id ? '· ' + esc(activity.grade_id) : ''} · ${items.length} ${slug === 'opinion-cloud' ? 'statements' : 'questions'}</div>
  </div>
  <div class="no-print" style="background:#f1f5ff;border:1px solid #6366f1;border-radius:6px;padding:0.75rem;margin-bottom:1.25rem;font-size:0.875rem;">
    Print tip (this box does not print): in the print dialog, choose <strong>Save as PDF</strong> to save this worksheet as a PDF.
    ${slug === 'opinion-cloud' ? 'Print all pages — the final page states plainly that there is no answer key, because opinions have no right answers.' : 'Use the dialog\'s page range to print only the worksheet pages, or include the final page for the answer key.'}
  </div>
  <div class="name-line">
    <label>Name:</label><span>&nbsp;</span>
    &nbsp;&nbsp;
    <label>Date:</label><span>&nbsp;</span>
    &nbsp;&nbsp;
    <label>${slug === 'opinion-cloud' ? 'Opinions shared: ___/___' : 'Score: ___/___'}</label>
  </div>
  <div class="items">${itemsHTML}</div>
  ${keySection}
  <div class="footer">Generated by EduPlay · ${new Date().toLocaleDateString()}</div>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 300))<\/script>
</body>
</html>`
}

export default function PrintExport({ activity, onClose }: PrintExportProps) {
  function openPrint() {
    const html = generatePrintHTML(activity)
    const win = window.open('', '_blank', 'width=900,height=700')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}
      role="dialog" aria-modal="true" aria-label="Print activity"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{
          background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
          padding: '1.5rem', maxWidth: '420px', width: '100%',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
          🖨️ Print Worksheet
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          This opens a print view for <strong>{activity.title}</strong> with {activity.items?.length ?? 0} items:
          {normalizeWorksheetTypeSlug(activity.type_id) === 'opinion-cloud'
            ? 'a student opinion sheet with no answer key — opinions have no right answers.'
            : 'a student worksheet first, then the answer key on a separate final page.'}
          In the print dialog, choose Save as PDF to save it as a PDF.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={onClose}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: 'var(--radius)',
              border: '2px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={openPrint}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: 'var(--radius)',
              border: 'none', background: 'var(--gradient-btn)',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.875rem',
              cursor: 'pointer', boxShadow: 'var(--shadow)',
            }}
          >
            Open Print View
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
