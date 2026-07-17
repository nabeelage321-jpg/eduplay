'use client'

import { motion } from 'framer-motion'
import type { Activity } from '@/types'
import { ACTIVITY_TYPE_META } from '@/components/creator/TypeSelector'

interface PrintExportProps {
  activity: Activity
  onClose: () => void
}

export function generatePrintHTML(activity: Activity): string {
  const typeMeta = ACTIVITY_TYPE_META.find((t) => t.slug === activity.type_id)
  const items = activity.items ?? []

  const itemsHTML = items.map((item, i) => {
    const isQuiz = activity.type_id === 'quiz' || activity.type_id === 'gameshow-quiz'
    const isTrueFalse = activity.type_id === 'true-false'
    const isFlashcard = activity.type_id === 'flashcards'
    const isHangman = activity.type_id === 'hangman'
    const isFillBlank = activity.type_id === 'fill-blank' || activity.type_id === 'missing-word'

    let content = ''
    if (isQuiz) {
      content = `
        <div class="question-num">Q${i + 1}</div>
        <p class="prompt">${item.prompt}</p>
        <div class="options">
          <span class="opt">A) ${item.answer}</span>
          <span class="opt">B) ___________</span>
          <span class="opt">C) ___________</span>
          <span class="opt">D) ___________</span>
        </div>
      `
    } else if (isTrueFalse) {
      content = `
        <div class="question-num">${i + 1}.</div>
        <p class="prompt">${item.prompt}</p>
        <div class="tf-boxes">
          <span class="tf-box">True ☐</span>
          <span class="tf-box">False ☐</span>
        </div>
      `
    } else if (isFlashcard) {
      content = `
        <div class="flashcard">
          <div class="card-front">${item.prompt}</div>
          <div class="card-back">${item.answer}</div>
        </div>
      `
    } else if (isHangman) {
      const blanks = item.answer.toUpperCase().split('').map((c) => c === ' ' ? '&nbsp;&nbsp;' : '_').join(' ')
      content = `
        <div class="question-num">${i + 1}. <em>${item.prompt}</em></div>
        <p class="blanks">${blanks}</p>
      `
    } else if (isFillBlank) {
      const sentence = item.prompt.includes('___') ? item.prompt.replace('___', '________________') : `${item.prompt} ________________`
      content = `
        <div class="question-num">${i + 1}.</div>
        <p class="prompt">${sentence}</p>
      `
    } else {
      content = `
        <div class="question-num">${i + 1}.</div>
        <p class="prompt">${item.prompt}</p>
        <p class="answer-blank">Answer: _______________________________</p>
      `
    }
    return `<div class="item">${content}</div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="${activity.locale || 'en'}" dir="${['ur', 'ar'].includes(activity.locale || '') ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <title>${activity.title} — EduPlay Worksheet</title>
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
    .flashcard { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .card-front { background: #f1f5ff; border: 1.5px solid #6366f1; border-radius: 4px; padding: 0.75rem; font-size: 0.875rem; }
    .card-back { background: #fffbf0; border: 1.5px dashed #666; border-radius: 4px; padding: 0.75rem; font-size: 0.875rem; }
    .blanks { font-size: 1.3rem; letter-spacing: 0.3em; margin-top: 0.35rem; }
    .answer-blank { font-size: 0.875rem; color: #555; margin-top: 0.35rem; }
    .answer-key { margin-top: 2rem; padding-top: 1rem; border-top: 2px dashed #ccc; }
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
    <div class="title">${typeMeta?.icon ?? ''} ${activity.title}</div>
    <div class="meta">${activity.subject_id ?? ''} ${activity.grade_id ? '· ' + activity.grade_id : ''} · ${(items.length)} questions</div>
  </div>
  <div class="name-line">
    <label>Name:</label><span>&nbsp;</span>
    &nbsp;&nbsp;
    <label>Date:</label><span>&nbsp;</span>
    &nbsp;&nbsp;
    <label>Score: ___/___</label>
  </div>
  <div class="items">${itemsHTML}</div>
  <div class="answer-key">
    <h2>Answer Key (Teacher Only)</h2>
    <div class="answers-grid">
      ${items.map((item, i) => `<div class="answer-item">${i + 1}. ${item.answer}</div>`).join('')}
    </div>
  </div>
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
          This will generate a print-ready worksheet for <strong>{activity.title}</strong> with {activity.items?.length ?? 0} items and an answer key.
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
