'use client'

import Link from 'next/link'
import JsonLd from './JsonLd'
import { generateBreadcrumbSchema } from '@/lib/seo/schema'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  baseUrl?: string
}

export default function Breadcrumb({ items, baseUrl = '' }: BreadcrumbProps) {
  const schemaItems = items.map((item) => ({
    name: item.label,
    url: item.href ? `${baseUrl}${item.href}` : baseUrl,
  }))

  return (
    <>
      <JsonLd data={generateBreadcrumbSchema(schemaItems)} />
      <nav
        aria-label="Breadcrumb"
        className="breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.25rem',
          fontSize: '0.875rem',
          color: 'var(--color-text-muted)',
          padding: '0.5rem 0',
        }}
      >
        <ol
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.25rem',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1

            return (
              <li
                key={index}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                {index > 0 && (
                  <span aria-hidden="true" style={{ color: 'var(--color-border)' }}>
                    /
                  </span>
                )}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    style={{
                      color: 'var(--color-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    style={{
                      color: isLast ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      fontWeight: isLast ? 500 : 400,
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
