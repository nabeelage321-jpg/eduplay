'use client'

import { motion } from 'framer-motion'

export const ACTIVITY_TYPE_META = [
  { slug: 'quiz',             icon: '❓', name: 'Quiz',             desc: 'Multiple choice questions' },
  { slug: 'match-up',         icon: '🔗', name: 'Match Up',         desc: 'Connect pairs of items' },
  { slug: 'anagram',          icon: '🔤', name: 'Anagram',          desc: 'Unscramble letters' },
  { slug: 'crossword',        icon: '✏️', name: 'Crossword',        desc: 'Fill in the grid' },
  { slug: 'wordsearch',       icon: '🔍', name: 'Word Search',      desc: 'Find hidden words' },
  { slug: 'spin-wheel',       icon: '🎡', name: 'Spin Wheel',       desc: 'Random item selector' },
  { slug: 'balloon-pop',      icon: '🎈', name: 'Balloon Pop',      desc: 'Pop the right balloon' },
  { slug: 'whack-a-mole',     icon: '🔨', name: 'Whack-a-Mole',    desc: 'Hit the correct mole' },
  { slug: 'true-false',       icon: '✅', name: 'True / False',     desc: 'Swipe to judge statements' },
  { slug: 'categorize',       icon: '🗂️', name: 'Categorize',       desc: 'Sort items into groups' },
  { slug: 'order',            icon: '📋', name: 'Order',            desc: 'Arrange in correct sequence' },
  { slug: 'fill-blank',       icon: '📝', name: 'Fill the Blank',   desc: 'Complete the sentence' },
  { slug: 'labelled-diagram', icon: '🗺️', name: 'Labelled Diagram', desc: 'Label parts of an image' },
  { slug: 'flashcards',       icon: '🃏', name: 'Flashcards',       desc: 'Flip and learn' },
  { slug: 'missing-word',     icon: '🔎', name: 'Missing Word',     desc: 'Choose the missing word' },
  { slug: 'unjumble',         icon: '📖', name: 'Unjumble',         desc: 'Rearrange jumbled words' },
  { slug: 'gameshow-quiz',    icon: '🎬', name: 'Gameshow Quiz',    desc: 'Dramatic quiz with lifelines' },
  { slug: 'hangman',          icon: '🎯', name: 'Hangman',          desc: 'Guess letter by letter' },
  { slug: 'random-wheel',     icon: '🎰', name: 'Random Wheel',     desc: 'Pick a random name/topic' },
  { slug: 'open-box',         icon: '🎁', name: 'Open the Box',     desc: 'Reveal hidden items' },
]

interface TypeSelectorProps {
  selected: string | null
  onSelect: (slug: string) => void
}

export default function TypeSelector({ selected, onSelect }: TypeSelectorProps) {
  return (
    <div>
      <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', marginBottom: '0.25rem', fontSize: '1.25rem' }}>
        Choose Activity Type
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        Select the type of activity you want to create
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '0.6rem',
      }}>
        {ACTIVITY_TYPE_META.map((type) => {
          const isSelected = selected === type.slug
          return (
            <motion.button
              key={type.slug}
              onClick={() => onSelect(type.slug)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              aria-pressed={isSelected}
              aria-label={`${type.name}: ${type.desc}`}
              style={{
                padding: '0.875rem 0.75rem',
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: isSelected ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))' : 'var(--color-surface)',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: isSelected ? 'var(--shadow-card)' : 'none',
                transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
              }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem', lineHeight: 1 }}>{type.icon}</div>
              <p style={{
                color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
                marginBottom: '0.2rem',
              }}>
                {type.name}
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.68rem', fontFamily: 'var(--font-body)', lineHeight: 1.3 }}>
                {type.desc}
              </p>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
