// src/components/dashboard/ExportGradebook.tsx
'use client'

import { useState } from 'react'

export interface GradeRow {
  studentName: string
  activityTitle: string
  activityType: string
  score: number
  maxScore: number
  completedAt: string
  timeTakenSeconds: number
}

interface ExportGradebookProps {
  grades: GradeRow[]
  className?: string
  loading?: boolean
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function gradesToCSV(grades: GradeRow[]): string {
  const headers = [
    'Student Name',
    'Activity',
    'Type',
    'Score',
    'Max Score',
    'Percentage',
    'Completed At',
    'Time Taken',
  ]

  const rows = grades.map((g) => [
    `"${g.studentName.replace(/"/g, '""')}"`,
    `"${g.activityTitle.replace(/"/g, '""')}"`,
    g.activityType,
    g.score,
    g.maxScore,
    `${Math.round((g.score / g.maxScore) * 100)}%`,
    new Date(g.completedAt).toLocaleString(),
    formatTime(g.timeTakenSeconds),
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportGradebook({
  grades,
  className = 'My Class',
  loading = false,
}: ExportGradebookProps) {
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const handleExportCSV = () => {
    setExporting('csv')
    const csv = gradesToCSV(grades)
    const date = new Date().toISOString().slice(0, 10)
    downloadCSV(csv, `eduplay-grades-${date}.csv`)
    setTimeout(() => setExporting(null), 1000)
  }

  const handleExportPDF = async () => {
    setExporting('pdf')
    // In production: call /api/export/gradebook-pdf
    // For now: print the preview as PDF
    setPreviewOpen(true)
    setTimeout(() => {
      window.print()
      setExporting(null)
    }, 300)
  }

  if (loading) {
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          border: '1px solid var(--color-border)',
          minHeight: '120px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
        aria-busy="true"
        aria-label="Loading gradebook"
      />
    )
  }

  return (
    <section
      aria-label="Export gradebook"
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBlockEnd: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            📥 Export Gradebook
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {grades.length} records — {className}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExportCSV}
            disabled={exporting !== null || grades.length === 0}
            aria-busy={exporting === 'csv'}
            style={{
              padding: '8px 16px',
              background: 'var(--color-surface-alt)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: grades.length === 0 ? 'not-allowed' : 'pointer',
              opacity: grades.length === 0 ? 0.5 : 1,
            }}
          >
            {exporting === 'csv' ? '⏳ Exporting…' : '📊 Export CSV'}
          </button>

          <button
            onClick={handleExportPDF}
            disabled={exporting !== null || grades.length === 0}
            aria-busy={exporting === 'pdf'}
            style={{
              padding: '8px 16px',
              background: 'var(--gradient-btn)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: grades.length === 0 ? 'not-allowed' : 'pointer',
              opacity: grades.length === 0 ? 0.5 : 1,
            }}
          >
            {exporting === 'pdf' ? '⏳ Preparing…' : '📄 Export PDF'}
          </button>
        </div>
      </div>

      {/* Preview table */}
      <div
        style={{ overflowX: 'auto' }}
        id="gradebook-print-area"
      >
        {grades.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>
              No grade data yet. Grades are recorded after students complete activities.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}
            aria-label="Grade records"
          >
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)' }}>
                {['Student', 'Activity', 'Score', '%', 'Date', 'Time'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    style={{
                      padding: '10px 16px',
                      textAlign: 'start',
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBlockEnd: '1px solid var(--color-border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grades.slice(0, previewOpen ? grades.length : 10).map((row, i) => {
                const pct = Math.round((row.score / row.maxScore) * 100)
                const pctColor =
                  pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444'

                return (
                  <tr
                    key={i}
                    style={{
                      borderBlockEnd: '1px solid var(--color-border)',
                    }}
                  >
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {row.studentName}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-secondary)' }}>
                      {row.activityTitle}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-primary)' }}>
                      {row.score}/{row.maxScore}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          color: pctColor,
                          fontWeight: 700,
                          fontSize: '13px',
                        }}
                        aria-label={`${pct} percent`}
                      >
                        {pct}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(row.completedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>
                      {formatTime(row.timeTakenSeconds)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {!previewOpen && grades.length > 10 && (
          <div style={{ padding: '12px 16px', textAlign: 'center' }}>
            <button
              onClick={() => setPreviewOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Show all {grades.length} records ↓
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
