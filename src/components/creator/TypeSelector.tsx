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
  { slug: 'memory-match',     icon: '🧠', name: 'Memory Match',     desc: 'Flip tiles to match pairs' },
  { slug: 'typing-race',      icon: '⌨️', name: 'Typing Race',      desc: 'Type fast, build a streak' },
  { slug: 'bingo',            icon: '🎱', name: 'Bingo',            desc: 'Mark answers, complete a line' },
  { slug: 'jump-path',        icon: '⭐', name: 'Jump Path',        desc: 'Answer to jump along the path' },
  { slug: 'riddle',           icon: '🧩', name: 'Riddle',           desc: 'Solve the clue by typing the answer' },
  { slug: 'aster-quiz',       icon: '🚀', name: 'AsterQuiz',        desc: 'Answer to fly the ship through asteroids' },
  { slug: 'dictation',        icon: '🎧', name: 'Dictation',        desc: 'Listen and type what you hear' },
  { slug: 'dialogue',         icon: '💬', name: 'Dialogue',         desc: 'Follow a conversation, line by line' },
  { slug: 'map-quiz',         icon: '📍', name: 'Map Quiz',         desc: 'Tap the map to find each point' },
  { slug: 'jigsaw-puzzle',    icon: '🧩', name: 'Jigsaw Puzzle',    desc: 'Rebuild the picture, then answer about it' },
  { slug: 'video-quiz',       icon: '🎬', name: 'Video Quiz',       desc: 'Watch the video, answer as it plays' },
  { slug: 'letter-wheel',     icon: '🔠', name: 'Letter Wheel',     desc: 'Answer one definition per letter on the wheel' },
  { slug: 'maze-run',         icon: '🌀', name: 'Maze Run',         desc: 'Run the maze to the correct answer tile' },
  { slug: 'speed-judge',      icon: '⚡', name: 'Speed Judge',      desc: 'Judge true or false claims fast' },
  { slug: 'spell-it',         icon: '🔡', name: 'Spell It',         desc: 'Spell the answer word, letter by letter' },
  { slug: 'picture-answer',   icon: '🖼️', name: 'Picture Answer',   desc: 'Answer the question about the picture' },
  { slug: 'memory-recall',    icon: '💭', name: 'Memory Recall',    desc: 'Study the pairs, then recall them from memory' },
  { slug: 'claim-line',       icon: '🎯', name: 'Claim Line',       desc: 'Answer to claim squares — first line wins' },
  { slug: 'opinion-cloud',    icon: '☁️', name: 'Opinion Cloud',    desc: 'Share your opinion — no right or wrong answers' },
]

/**
 * SINGLE-GAME MAKER ENTRY (2026-11-04): a type hub page links to
 * /create?type=<slug> so a teacher can make one single game of that
 * type directly. Validate the query value against the known type list:
 * a valid slug is returned as-is, anything else (unknown slug, blank,
 * non-string) returns null and the creator simply opens with no type
 * preselected — never a crash, never an invented type.
 */
export function resolveInitialType(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null
  const slug = value.trim().toLowerCase()
  return ACTIVITY_TYPE_META.some((t) => t.slug === slug) ? slug : null
}

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
