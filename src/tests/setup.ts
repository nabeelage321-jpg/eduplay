import React from 'react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ locale: 'en', id: 'test-id' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/en',
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}))

// Mock framer-motion for tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({} as typeof actual.motion, {
      get: (_target, prop: string) => {
        const Component = React.forwardRef(
          (
            { children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode },
            ref: React.Ref<HTMLElement>
          ) => {
            const element = React.createElement(
              prop as keyof JSX.IntrinsicElements,
              { ...(props as React.HTMLAttributes<HTMLElement>), ref },
              children
            )
            return element
          }
        )
        Component.displayName = `motion.${prop}`
        return Component
      },
    }),
  }
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock window.open for print tests
Object.defineProperty(window, 'open', {
  writable: true,
  value: vi.fn(() => ({
    document: { write: vi.fn(), close: vi.fn() },
    print: vi.fn(),
  })),
})

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
})

// Suppress console.error in tests
vi.spyOn(console, 'error').mockImplementation(() => {})
