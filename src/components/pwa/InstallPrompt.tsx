// src/components/pwa/InstallPrompt.tsx
'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Don't show if already installed or dismissed
    const dismissed = sessionStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show after a short delay so it doesn't immediately interrupt
      setTimeout(() => setShow(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }

    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShow(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setInstalled(true)
        setShow(false)
      } else {
        sessionStorage.setItem('pwa-prompt-dismissed', '1')
        setShow(false)
      }
    } catch {
      // Prompt already used — hide
      setShow(false)
    } finally {
      setInstalling(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-prompt-dismissed', '1')
    setShow(false)
  }

  if (!show || installed) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Install EduPlay app"
      style={{
        position: 'fixed',
        insetBlockEnd: '80px',
        insetInlineStart: '50%',
        transform: 'translateX(-50%)',
        width: 'min(340px, calc(100vw - 32px))',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        zIndex: 9000,
        overflow: 'hidden',
        animation: 'slideUp 0.3s ease',
      }}
    >
      {/* Top accent */}
      <div
        aria-hidden="true"
        style={{
          height: '4px',
          background: 'var(--gradient-btn)',
        }}
      />

      <div style={{ padding: '20px' }}>
        {/* App icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBlockEnd: '16px' }}>
          <div
            aria-hidden="true"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'var(--gradient-hero)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              flexShrink: 0,
            }}
          >
            🎓
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}
            >
              Add EduPlay to Home Screen
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Quick access · Works offline
            </p>
          </div>
        </div>

        {/* Benefits */}
        <ul
          style={{
            margin: '0 0 20px',
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {[
            { icon: '⚡', text: 'Instant launch from home screen' },
            { icon: '📵', text: 'Play activities even offline' },
            { icon: '🔔', text: 'Get notified of new assignments' },
          ].map((item) => (
            <li
              key={item.text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.text}
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleDismiss}
            style={{
              flex: 1,
              padding: '10px',
              background: 'var(--color-surface-alt)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Not Now
          </button>
          <button
            onClick={handleInstall}
            disabled={installing}
            aria-busy={installing}
            style={{
              flex: 2,
              padding: '10px',
              background: 'var(--gradient-btn)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: installing ? 'not-allowed' : 'pointer',
              opacity: installing ? 0.7 : 1,
            }}
          >
            {installing ? '⏳ Installing…' : '📲 Install App'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
