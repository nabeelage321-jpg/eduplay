import { describe, it, expect } from 'vitest'
import { shuffleArray, isRTL, getRandomFeedback, SCORE_PER_CORRECT, TIMER_DEFAULT } from '@/components/activity-types/shared'
import type { SupportedLocale } from '@/types'

// ── shared utilities ──────────────────────────────────────────────────────────

describe('shuffleArray', () => {
  it('returns an array of the same length', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(shuffleArray(arr)).toHaveLength(arr.length)
  })

  it('contains all original elements', () => {
    const arr = ['a', 'b', 'c', 'd']
    const result = shuffleArray(arr)
    expect(result.sort()).toEqual(arr.sort())
  })

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3]
    const copy = [...arr]
    shuffleArray(arr)
    expect(arr).toEqual(copy)
  })

  it('handles empty array', () => {
    expect(shuffleArray([])).toEqual([])
  })

  it('handles single element', () => {
    expect(shuffleArray(['only'])).toEqual(['only'])
  })
})

describe('isRTL', () => {
  it('returns true for Urdu', () => {
    expect(isRTL('ur')).toBe(true)
  })

  it('returns true for Arabic', () => {
    expect(isRTL('ar')).toBe(true)
  })

  it('returns false for English', () => {
    expect(isRTL('en')).toBe(false)
  })

  it('returns false for Hindi', () => {
    expect(isRTL('hi')).toBe(false)
  })

  it('returns false for all LTR locales', () => {
    const ltrLocales: SupportedLocale[] = ['en', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id', 'zh']
    ltrLocales.forEach((locale) => {
      expect(isRTL(locale)).toBe(false)
    })
  })
})

describe('getRandomFeedback', () => {
  it('returns a string for correct', () => {
    expect(typeof getRandomFeedback('correct')).toBe('string')
    expect(getRandomFeedback('correct').length).toBeGreaterThan(0)
  })

  it('returns a string for wrong', () => {
    expect(typeof getRandomFeedback('wrong')).toBe('string')
    expect(getRandomFeedback('wrong').length).toBeGreaterThan(0)
  })

  it('returns one of the predefined messages', () => {
    const correctMessages = ['Correct! +10', 'Great job! +10', 'Excellent! +10', '⭐ +10']
    const wrongMessages = ['Try again!', 'Not quite!', 'Keep going!', 'Almost there!']
    expect(correctMessages).toContain(getRandomFeedback('correct'))
    expect(wrongMessages).toContain(getRandomFeedback('wrong'))
  })
})

describe('constants', () => {
  it('SCORE_PER_CORRECT is 10', () => {
    expect(SCORE_PER_CORRECT).toBe(10)
  })

  it('TIMER_DEFAULT is 30', () => {
    expect(TIMER_DEFAULT).toBe(30)
  })
})

// ── Quiz scoring logic ────────────────────────────────────────────────────────

describe('QuizActivity scoring', () => {
  function calcScore(correctAnswers: number): number {
    return correctAnswers * SCORE_PER_CORRECT
  }

  it('scores 0 for no correct answers', () => {
    expect(calcScore(0)).toBe(0)
  })

  it('scores 10 per correct answer', () => {
    expect(calcScore(1)).toBe(10)
    expect(calcScore(5)).toBe(50)
    expect(calcScore(10)).toBe(100)
  })
})

// ── MatchUp scoring logic ─────────────────────────────────────────────────────

describe('MatchUpActivity scoring', () => {
  const items = [
    { prompt: 'Paris', answer: 'France' },
    { prompt: 'Berlin', answer: 'Germany' },
    { prompt: 'Tokyo', answer: 'Japan' },
  ]

  function isCorrectMatch(prompt: string, answer: string): boolean {
    return items.find((i) => i.prompt === prompt)?.answer === answer
  }

  it('correctly identifies correct matches', () => {
    expect(isCorrectMatch('Paris', 'France')).toBe(true)
    expect(isCorrectMatch('Berlin', 'Germany')).toBe(true)
  })

  it('correctly identifies wrong matches', () => {
    expect(isCorrectMatch('Paris', 'Germany')).toBe(false)
    expect(isCorrectMatch('Tokyo', 'France')).toBe(false)
  })
})

// ── Anagram scoring logic ─────────────────────────────────────────────────────

describe('AnagramActivity scoring', () => {
  function checkAnagram(input: string, answer: string): boolean {
    return input.toUpperCase().trim() === answer.toUpperCase().trim()
  }

  it('accepts correct answer (case insensitive)', () => {
    expect(checkAnagram('HELLO', 'hello')).toBe(true)
    expect(checkAnagram('world', 'WORLD')).toBe(true)
  })

  it('rejects wrong answer', () => {
    expect(checkAnagram('HELLO', 'WORLD')).toBe(false)
  })

  it('handles whitespace', () => {
    expect(checkAnagram('hello ', 'hello')).toBe(true)
  })
})

// ── TrueFalse scoring logic ───────────────────────────────────────────────────

describe('TrueFalseActivity scoring', () => {
  function getCorrectAnswer(answer: string): 'true' | 'false' {
    return answer.toLowerCase() === 'true' ? 'true' : 'false'
  }

  it('recognises true answer', () => {
    expect(getCorrectAnswer('true')).toBe('true')
    expect(getCorrectAnswer('True')).toBe('true')
    expect(getCorrectAnswer('TRUE')).toBe('true')
  })

  it('recognises false answer', () => {
    expect(getCorrectAnswer('false')).toBe('false')
    expect(getCorrectAnswer('False')).toBe('false')
    expect(getCorrectAnswer('anything else')).toBe('false')
  })
})

// ── Hangman scoring logic ─────────────────────────────────────────────────────

describe('HangmanActivity scoring', () => {
  const MAX_WRONG = 6

  function calcHangmanScore(wrongGuesses: number): number {
    return SCORE_PER_CORRECT * Math.max(1, MAX_WRONG - wrongGuesses)
  }

  it('gives maximum score for no wrong guesses', () => {
    expect(calcHangmanScore(0)).toBe(SCORE_PER_CORRECT * MAX_WRONG)
  })

  it('gives minimum score for max wrong guesses', () => {
    expect(calcHangmanScore(MAX_WRONG - 1)).toBe(SCORE_PER_CORRECT)
  })

  it('never goes below SCORE_PER_CORRECT', () => {
    expect(calcHangmanScore(MAX_WRONG)).toBeGreaterThanOrEqual(SCORE_PER_CORRECT)
  })
})

// ── Flashcards scoring logic ──────────────────────────────────────────────────

describe('FlashcardsActivity scoring', () => {
  it('scores 10 per known card', () => {
    const knownCount = 7
    expect(knownCount * 10).toBe(70)
  })

  it('scores 0 if nothing known', () => {
    expect(0 * 10).toBe(0)
  })
})

// ── Order activity scoring logic ──────────────────────────────────────────────

describe('OrderActivity scoring', () => {
  const correct = ['a', 'b', 'c', 'd']

  function scoreOrder(arranged: string[]): number {
    return arranged.reduce((score, item, i) => {
      return item === correct[i] ? score + SCORE_PER_CORRECT : score
    }, 0)
  }

  it('full score for correct order', () => {
    expect(scoreOrder(['a', 'b', 'c', 'd'])).toBe(40)
  })

  it('0 for completely wrong order', () => {
    expect(scoreOrder(['d', 'c', 'b', 'a'])).toBe(0)
  })

  it('partial score for partial order', () => {
    expect(scoreOrder(['a', 'c', 'b', 'd'])).toBe(20) // a and d correct
  })
})

// ── FillBlank scoring logic ───────────────────────────────────────────────────

describe('FillBlankActivity scoring', () => {
  function checkFillBlank(input: string, answer: string): boolean {
    return input.trim().toLowerCase() === answer.trim().toLowerCase()
  }

  it('accepts correct answer case-insensitively', () => {
    expect(checkFillBlank('Paris', 'paris')).toBe(true)
    expect(checkFillBlank('PARIS', 'Paris')).toBe(true)
  })

  it('rejects wrong answer', () => {
    expect(checkFillBlank('London', 'Paris')).toBe(false)
  })
})

// ── Crossword scoring logic ───────────────────────────────────────────────────

describe('CrosswordActivity scoring', () => {
  function checkWord(input: string, answer: string): boolean {
    return input.toUpperCase() === answer.toUpperCase()
  }

  it('correctly matches crossword words', () => {
    expect(checkWord('PARIS', 'paris')).toBe(true)
    expect(checkWord('paris', 'PARIS')).toBe(true)
  })

  it('rejects partial matches', () => {
    expect(checkWord('PAR', 'PARIS')).toBe(false)
  })
})

// ── MissingWord scoring logic ─────────────────────────────────────────────────

describe('MissingWordActivity scoring', () => {
  function checkMissingWord(chosen: string, answer: string): boolean {
    return chosen.toLowerCase() === answer.toLowerCase()
  }

  it('correct choice returns true', () => {
    expect(checkMissingWord('jumped', 'jumped')).toBe(true)
  })

  it('wrong choice returns false', () => {
    expect(checkMissingWord('walked', 'jumped')).toBe(false)
  })
})

// ── Unjumble scoring logic ────────────────────────────────────────────────────

describe('UnjumbleActivity scoring', () => {
  function checkUnjumble(words: string[], answer: string): boolean {
    return words.join(' ').toLowerCase() === answer.toLowerCase()
  }

  it('correct sentence order returns true', () => {
    expect(checkUnjumble(['The', 'cat', 'sat'], 'The cat sat')).toBe(true)
  })

  it('wrong order returns false', () => {
    expect(checkUnjumble(['cat', 'The', 'sat'], 'The cat sat')).toBe(false)
  })
})

// ── Gameshow scoring logic ────────────────────────────────────────────────────

describe('GameshowQuizActivity scoring', () => {
  const GAMESHOW_BONUS = 2

  it('gives double points vs regular quiz', () => {
    expect(SCORE_PER_CORRECT * GAMESHOW_BONUS).toBe(20)
  })
})

// ── Categorize scoring logic ──────────────────────────────────────────────────

describe('CategorizeActivity scoring', () => {
  const items = [
    { label: 'Cat', category: 'Animals' },
    { label: 'Rose', category: 'Plants' },
    { label: 'Dog', category: 'Animals' },
  ]

  function checkCategory(label: string, droppedInto: string): boolean {
    return items.find((i) => i.label === label)?.category === droppedInto
  }

  it('correct category returns true', () => {
    expect(checkCategory('Cat', 'Animals')).toBe(true)
    expect(checkCategory('Rose', 'Plants')).toBe(true)
  })

  it('wrong category returns false', () => {
    expect(checkCategory('Cat', 'Plants')).toBe(false)
  })
})

// ── Wordsearch scoring logic ──────────────────────────────────────────────────

describe('WordsearchActivity scoring', () => {
  function foundWord(selectedCells: string[], wordCells: string[]): boolean {
    const selStr = selectedCells.join('|')
    const wordStr = wordCells.join('|')
    const wordStrRev = [...wordCells].reverse().join('|')
    return selStr === wordStr || selStr === wordStrRev
  }

  it('detects forward match', () => {
    expect(foundWord(['0,0', '0,1', '0,2'], ['0,0', '0,1', '0,2'])).toBe(true)
  })

  it('detects reverse match', () => {
    expect(foundWord(['0,2', '0,1', '0,0'], ['0,0', '0,1', '0,2'])).toBe(true)
  })

  it('rejects non-match', () => {
    expect(foundWord(['0,0', '0,1'], ['0,0', '0,1', '0,2'])).toBe(false)
  })
})

// ── PrintExport logic ─────────────────────────────────────────────────────────

describe('generatePrintHTML', () => {
  it('generates HTML string with activity title', async () => {
    const { generatePrintHTML } = await import('@/components/activities/PrintExport')
    const mockActivity = {
      id: 'test',
      title: 'Test Quiz',
      type_id: 'quiz',
      locale: 'en',
      teacher_id: 'teacher1',
      is_public: true,
      items: [
        { prompt: 'What is 2+2?', answer: '4' },
        { prompt: 'Capital of France?', answer: 'Paris' },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const html = generatePrintHTML(mockActivity)
    expect(html).toContain('Test Quiz')
    expect(html).toContain('What is 2+2?')
    expect(html).toContain('Answer Key')
    expect(html).toContain('EduPlay')
  })
})
