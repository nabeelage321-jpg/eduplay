/**
 * Prompt-to-game: taps-only guided flow + plain-topic drafts.
 *
 * Owner defects 2026-11-09:
 *  (1) "make a addition game" (Gameshow Quiz, Math, Grade 5) failed
 *      with "Groq returned a draft that did not pass the topic and
 *      answer checks" — arithmetic questions like "What is 2 + 3?"
 *      never mention the word "addition", so the on-topic filter
 *      dropped every single one.
 *  (2) "Make a quiz about animals" (Quiz) failed on first try and
 *      PASSED on retry with the same prompt — the draft check is
 *      flaky: one thin Groq reply kills the whole draft instead of
 *      retrying once behind the scenes.
 *  (3) Guided mode needs typing: the prompt box must be fillable by
 *      taps alone (chip + type + Make draft).
 *
 * Groq is always mocked here — no real key, no network.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  buildGroqDraft,
  parseGroqQuestions,
  topicKeywords,
} from '@/lib/groq'
import { buildGuidedPrompt } from '@/lib/prompt-to-game'

const DUMMY_KEY = 'test-dummy-key-never-real'
let savedKey: string | undefined

beforeEach(() => {
  savedKey = process.env.GROQ_API_KEY
  process.env.GROQ_API_KEY = DUMMY_KEY
})

afterEach(() => {
  if (savedKey === undefined) delete process.env.GROQ_API_KEY
  else process.env.GROQ_API_KEY = savedKey
})

/** A realistic Groq-shaped reply for "make a addition game": plain
 *  arithmetic questions that never say the word "addition". */
const ADDITION_REPLY = {
  questions: [
    { question: 'What is 2 + 3?', correct: '5', incorrect: ['4', '6', '7'] },
    { question: 'What is 5 + 4?', correct: '9', incorrect: ['8', '10', '7'] },
    { question: 'What is 7 + 8?', correct: '15', incorrect: ['14', '16', '13'] },
    { question: 'What is 10 + 6?', correct: '16', incorrect: ['15', '17', '14'] },
    { question: 'What is 3 + 9?', correct: '12', incorrect: ['11', '13', '10'] },
    { question: 'What is 4 + 4?', correct: '8', incorrect: ['7', '9', '6'] },
    { question: 'What is 6 + 5?', correct: '11', incorrect: ['10', '12', '9'] },
    { question: 'What is 8 + 2?', correct: '10', incorrect: ['9', '11', '8'] },
    { question: 'What is 9 + 7?', correct: '16', incorrect: ['15', '17', '14'] },
    { question: 'What is 1 + 8?', correct: '9', incorrect: ['8', '10', '7'] },
  ],
}

/** A realistic Groq-shaped reply for "Make a quiz about animals"
 *  where only ONE question mentions the word "animal" — the rest
 *  are plainly about animals but never say the word. */
const ANIMALS_THIN_REPLY = {
  questions: [
    { question: 'What is the largest land animal?', correct: 'African elephant', incorrect: ['Giraffe', 'Hippo', 'Rhino'] },
    { question: 'What do bees make?', correct: 'Honey', incorrect: ['Milk', 'Silk', 'Wax'] },
    { question: 'What is a baby dog called?', correct: 'Puppy', incorrect: ['Kitten', 'Calf', 'Cub'] },
    { question: 'How many legs does a spider have?', correct: 'Eight', incorrect: ['Six', 'Ten', 'Four'] },
    { question: 'Which bird cannot fly?', correct: 'Penguin', incorrect: ['Eagle', 'Sparrow', 'Owl'] },
  ],
}

/** A full, healthy animals reply — every question mentions "animal". */
const ANIMALS_GOOD_REPLY = {
  questions: [
    { question: 'What is the largest land animal?', correct: 'African elephant', incorrect: ['Giraffe', 'Hippo', 'Rhino'] },
    { question: 'Which animal is the fastest on land?', correct: 'Cheetah', incorrect: ['Lion', 'Horse', 'Gazelle'] },
    { question: 'Which animal is known as the King of the Jungle?', correct: 'Lion', incorrect: ['Tiger', 'Elephant', 'Bear'] },
    { question: 'What animal is the largest mammal in the sea?', correct: 'Blue whale', incorrect: ['Shark', 'Dolphin', 'Orca'] },
    { question: 'Which animal sleeps hanging upside down?', correct: 'Bat', incorrect: ['Owl', 'Sloth', 'Monkey'] },
  ],
}

interface MockCall {
  url: string
  body: Record<string, unknown>
}

/** Mock fetch that answers Groq draft calls from a queue and answers
 *  the answer-consistency self-check with all-valid verdicts. */
function mockGroqFetch(draftReplies: Array<unknown>) {
  const calls: MockCall[] = []
  let draftIndex = 0
  const fetchImpl = (async (url: string, init?: { body?: string }) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
    calls.push({ url, body })
    const messages = (body.messages as Array<{ content?: string }>) ?? []
    const userText = messages.map((m) => m.content ?? '').join('\n')
    // Self-check call: judge every listed item valid.
    if (userText.includes('Claimed correct answer')) {
      const count = (userText.match(/Claimed correct answer/g) ?? []).length
      const verdicts = Array.from({ length: count }, (_, i) => ({ index: i, valid: true }))
      return {
        status: 200,
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ verdicts }) } }] }),
      }
    }
    // Draft call: next queued reply.
    const reply = draftReplies[Math.min(draftIndex, draftReplies.length - 1)]
    draftIndex++
    return {
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(reply) } }] }),
    }
  }) as unknown as typeof fetch
  return { fetchImpl, calls }
}

function draftUserContent(call: MockCall): string {
  const messages = (call.body.messages as Array<{ role?: string; content?: string }>) ?? []
  return messages.filter((m) => m.role === 'user').map((m) => m.content ?? '').join('\n')
}

describe('topicKeywords', () => {
  it('keeps the plain topic word from a kid-style prompt', () => {
    expect(topicKeywords('make a addition game')).toEqual(['addition'])
    expect(topicKeywords('Make a quiz about animals')).toEqual(['animals'])
  })
})

describe('addition draft (owner case 1)', () => {
  it('keeps plain arithmetic questions about addition', () => {
    const items = parseGroqQuestions(ADDITION_REPLY, 'make a addition game')
    expect(items.length).toBeGreaterThanOrEqual(2)
    expect(items[0].prompt).toBe('What is 2 + 3?')
    expect(items[0].answer).toBe('5')
  })

  it('builds a draft from a mocked Groq reply that never says "addition"', async () => {
    const { fetchImpl, calls } = mockGroqFetch([ADDITION_REPLY])
    const result = await buildGroqDraft('make a addition game', fetchImpl)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items.length).toBeGreaterThanOrEqual(2)
      expect(result.items[0].prompt).toBe('What is 2 + 3?')
    }
    // The Groq prompt sent must carry the topic word explicitly, so
    // the model is told to mention it in every question.
    const draftCall = calls.find((c) => draftUserContent(c).includes('make a addition game'))
    expect(draftCall).toBeDefined()
    expect(draftUserContent(draftCall!).toLowerCase()).toContain('addition')
  })

  it('still rejects a genuinely off-topic reply', () => {
    const offTopic = {
      questions: [
        { question: 'What is the capital of France?', correct: 'Paris', incorrect: ['London', 'Berlin', 'Madrid'] },
        { question: 'Which planet is closest to the Sun?', correct: 'Mercury', incorrect: ['Venus', 'Mars', 'Earth'] },
      ],
    }
    expect(parseGroqQuestions(offTopic, 'make a addition game')).toEqual([])
  })
})

describe('animals draft flakiness (owner case 2)', () => {
  it('retries once behind the scenes when the first reply is too thin', async () => {
    const { fetchImpl, calls } = mockGroqFetch([ANIMALS_THIN_REPLY, ANIMALS_GOOD_REPLY])
    const result = await buildGroqDraft('Make a quiz about animals', fetchImpl)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items.length).toBeGreaterThanOrEqual(2)
      expect(result.items[0].answer).toBe('African elephant')
    }
    // Two draft calls happened (first thin, second good) — the owner
    // never saw the first failure.
    const draftCalls = calls.filter((c) => !draftUserContent(c).includes('Claimed correct answer'))
    expect(draftCalls.length).toBe(2)
  })

  it('still errors when BOTH attempts are too thin', async () => {
    const { fetchImpl } = mockGroqFetch([ANIMALS_THIN_REPLY, ANIMALS_THIN_REPLY])
    const result = await buildGroqDraft('Make a quiz about animals', fetchImpl)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('did not pass the topic and answer checks')
    }
  })

  it('does NOT retry a provider error (429)', async () => {
    let callCount = 0
    const fetchImpl = (async () => {
      callCount++
      return { status: 429, ok: false, json: async () => ({}) }
    }) as unknown as typeof fetch
    const result = await buildGroqDraft('Make a quiz about animals', fetchImpl)
    expect(result.ok).toBe(false)
    expect(callCount).toBe(1)
  })
})

describe('guided taps-only prompt', () => {
  it('builds the prompt from the tapped chip when the box is empty', () => {
    expect(buildGuidedPrompt('', 'make game for a table of 3')).toBe('make game for a table of 3')
    expect(buildGuidedPrompt('   ', 'Animals for Grade 5')).toBe('Animals for Grade 5')
  })

  it('keeps a typed prompt over the tapped chip', () => {
    expect(buildGuidedPrompt('make a addition game', 'make game for a table of 3')).toBe('make a addition game')
  })

  it('is empty when nothing was typed and nothing was tapped', () => {
    expect(buildGuidedPrompt('', null)).toBe('')
    expect(buildGuidedPrompt('', '')).toBe('')
  })
})
