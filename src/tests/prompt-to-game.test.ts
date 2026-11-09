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
 *
 * EXACTLY-10 (owner order 2026-11-09): live game 114777 "Make a
 * quiz about animals" shipped with only 3 questions — Groq decides
 * the draft size run to run (4, then 10, then 3). Every draft must
 * now have exactly 10 usable items, and near-duplicate answers
 * ("Elephant" vs "African elephant" in that same game) must not
 * both appear.
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

/** A full, healthy animals reply — 10 questions, every one
 *  mentioning "animal", distinct answers, no near-duplicates. */
const ANIMALS_GOOD_REPLY = {
  questions: [
    { question: 'What is the largest land animal?', correct: 'African elephant', incorrect: ['Giraffe', 'Hippo', 'Rhino'] },
    { question: 'Which animal is the fastest on land?', correct: 'Cheetah', incorrect: ['Lion', 'Horse', 'Gazelle'] },
    { question: 'Which animal is known as the King of the Jungle?', correct: 'Lion', incorrect: ['Tiger', 'Elephant', 'Bear'] },
    { question: 'What animal is the largest mammal in the sea?', correct: 'Blue whale', incorrect: ['Shark', 'Dolphin', 'Orca'] },
    { question: 'Which animal sleeps hanging upside down?', correct: 'Bat', incorrect: ['Owl', 'Sloth', 'Monkey'] },
    { question: 'Which animal is the tallest land animal?', correct: 'Giraffe', incorrect: ['Elephant', 'Horse', 'Camel'] },
    { question: 'Which animal carries its baby in a pouch?', correct: 'Kangaroo', incorrect: ['Koala', 'Wombat', 'Platypus'] },
    { question: 'Which animal changes colour to blend in with its surroundings?', correct: 'Chameleon', incorrect: ['Iguana', 'Gecko', 'Snake'] },
    { question: 'Which animal is a black-and-white bear from China?', correct: 'Giant panda', incorrect: ['Polar bear', 'Grizzly bear', 'Koala'] },
    { question: 'Which animal is the largest bird that cannot fly?', correct: 'Ostrich', incorrect: ['Penguin', 'Emu', 'Kiwi'] },
  ],
}

/** The same animals reply cut to 3 usable questions — the live
 *  failure shape (game 114777 shipped with only 3). */
const ANIMALS_3_REPLY = {
  questions: ANIMALS_GOOD_REPLY.questions.slice(0, 3),
}

/** The same animals reply cut to 5 usable questions — still short
 *  of 10, so it must never ship. */
const ANIMALS_5_REPLY = {
  questions: ANIMALS_GOOD_REPLY.questions.slice(0, 5),
}

/** A 10-question reply carrying the live near-duplicate pair:
 *  "African elephant" AND a bare "Elephant" — only one may survive. */
const DEDUP_REPLY = {
  questions: [
    { question: 'What is the largest land animal?', correct: 'African elephant', incorrect: ['Giraffe', 'Hippo', 'Rhino'] },
    { question: 'Which animal has a long trunk?', correct: 'Elephant', incorrect: ['Lion', 'Tiger', 'Bear'] },
    { question: 'Which animal is the fastest on land?', correct: 'Cheetah', incorrect: ['Lion', 'Horse', 'Gazelle'] },
    { question: 'Which animal is known as the King of the Jungle?', correct: 'Lion', incorrect: ['Tiger', 'Elephant', 'Bear'] },
    { question: 'What animal is the largest mammal in the sea?', correct: 'Blue whale', incorrect: ['Shark', 'Dolphin', 'Orca'] },
    { question: 'Which animal sleeps hanging upside down?', correct: 'Bat', incorrect: ['Owl', 'Sloth', 'Monkey'] },
    { question: 'Which animal is the tallest land animal?', correct: 'Giraffe', incorrect: ['Elephant', 'Horse', 'Camel'] },
    { question: 'Which animal carries its baby in a pouch?', correct: 'Kangaroo', incorrect: ['Koala', 'Wombat', 'Platypus'] },
    { question: 'Which animal changes colour to blend in with its surroundings?', correct: 'Chameleon', incorrect: ['Iguana', 'Gecko', 'Snake'] },
    { question: 'Which animal is a black-and-white bear from China?', correct: 'Giant panda', incorrect: ['Polar bear', 'Grizzly bear', 'Koala'] },
  ],
}

/** Hangman replies: 3 words, then 10 words, every hint naming the
 *  topic word "animal" without naming the word itself. */
const HANGMAN_3_REPLY = {
  words: [
    { word: 'Lion', hint: 'This animal is known as the king of the jungle' },
    { word: 'Tiger', hint: 'This animal has orange fur with black stripes' },
    { word: 'Elephant', hint: 'This animal has a long trunk' },
  ],
}

const HANGMAN_10_REPLY = {
  words: [
    ...HANGMAN_3_REPLY.words,
    { word: 'Giraffe', hint: 'This animal has the longest neck of any land animal' },
    { word: 'Zebra', hint: 'This animal has black and white stripes' },
    { word: 'Monkey', hint: 'This animal swings through the trees' },
    { word: 'Panda', hint: 'This animal eats bamboo all day' },
    { word: 'Koala', hint: 'This animal sleeps in a gum tree' },
    { word: 'Penguin', hint: 'This animal is a bird that cannot fly' },
    { word: 'Dolphin', hint: 'This animal is a clever sea animal' },
  ],
}

/** True/false reply: 10 statements, 6 true / 4 false, every one
 *  mentioning "animal". */
const TRUE_FALSE_10_REPLY = {
  statements: [
    { statement: 'An African elephant is the largest land animal.', correct: true },
    { statement: 'A cheetah is the slowest animal on land.', correct: false },
    { statement: 'A lion is an animal known as the king of the jungle.', correct: true },
    { statement: 'A blue whale is the largest animal in the sea.', correct: true },
    { statement: 'A bat is an animal that lays eggs.', correct: false },
    { statement: 'A giraffe is the tallest land animal.', correct: true },
    { statement: 'A kangaroo is an animal that carries its baby in a pouch.', correct: true },
    { statement: 'A penguin is an animal that can fly.', correct: false },
    { statement: 'An ostrich is an animal that cannot fly.', correct: true },
    { statement: 'A dolphin is an animal that is a fish.', correct: false },
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
  it('retries behind the scenes when the first reply is too thin', async () => {
    const { fetchImpl, calls } = mockGroqFetch([ANIMALS_THIN_REPLY, ANIMALS_GOOD_REPLY])
    const result = await buildGroqDraft('Make a quiz about animals', fetchImpl)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items.length).toBe(10)
      expect(result.items[0].answer).toBe('African elephant')
    }
    // Two draft calls happened (first thin, second good) — the owner
    // never saw the first failure.
    const draftCalls = calls.filter((c) => !draftUserContent(c).includes('Claimed correct answer'))
    expect(draftCalls.length).toBe(2)
  })

  it('still errors when all three attempts are too thin', async () => {
    const { fetchImpl, calls } = mockGroqFetch([ANIMALS_THIN_REPLY, ANIMALS_THIN_REPLY])
    const result = await buildGroqDraft('Make a quiz about animals', fetchImpl)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('did not pass the topic and answer checks')
    }
    // Three draft calls happened (initial + two retries) — the thin
    // reply was retried, not shipped.
    const draftCalls = calls.filter((c) => !draftUserContent(c).includes('Claimed correct answer'))
    expect(draftCalls.length).toBe(3)
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

describe('exactly 10 items (owner order 2026-11-09)', () => {
  it('a 3-item reply plus a good reply yields a 10-item draft', async () => {
    const { fetchImpl, calls } = mockGroqFetch([ANIMALS_3_REPLY, ANIMALS_GOOD_REPLY])
    const result = await buildGroqDraft('Make a quiz about animals', fetchImpl)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items.length).toBe(10)
    }
    const draftCalls = calls.filter((c) => !draftUserContent(c).includes('Claimed correct answer'))
    expect(draftCalls.length).toBe(2)
  })

  it('a 5-item reply never ships short', async () => {
    const { fetchImpl, calls } = mockGroqFetch([ANIMALS_5_REPLY])
    const result = await buildGroqDraft('Make a quiz about animals', fetchImpl)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('did not pass the topic and answer checks')
    }
    // Three draft calls happened (initial + two retries) — the
    // 5-item draft was retried, not shipped as if complete.
    const draftCalls = calls.filter((c) => !draftUserContent(c).includes('Claimed correct answer'))
    expect(draftCalls.length).toBe(3)
  })

  it('a reply with a near-duplicate pair retries to a full 10-item draft', async () => {
    const { fetchImpl, calls } = mockGroqFetch([DEDUP_REPLY, ANIMALS_GOOD_REPLY])
    const result = await buildGroqDraft('Make a quiz about animals', fetchImpl)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items.length).toBe(10)
      // No bare "Elephant" next to "African elephant" in the draft.
      const answers = result.items.map((i) => i.answer)
      expect(answers).toContain('African elephant')
      expect(answers).not.toContain('Elephant')
    }
    const draftCalls = calls.filter((c) => !draftUserContent(c).includes('Claimed correct answer'))
    expect(draftCalls.length).toBe(2)
  })

  it('asks Groq for exactly 10 questions', async () => {
    const { fetchImpl, calls } = mockGroqFetch([ANIMALS_GOOD_REPLY])
    const result = await buildGroqDraft('Make a quiz about animals', fetchImpl)
    expect(result.ok).toBe(true)
    const draftCall = calls.find((c) => !draftUserContent(c).includes('Claimed correct answer'))
    expect(draftCall).toBeDefined()
    const systemText = ((draftCall!.body.messages as Array<{ content?: string }>) ?? [])
      .map((m) => m.content ?? '')
      .join('\n')
    expect(systemText).toContain('Exactly 10 questions')
    expect(systemText).not.toContain('Up to 10 questions')
  })
})

describe('answer dedupe (live game 114777)', () => {
  it('keeps only one of "African elephant" and "Elephant"', () => {
    const items = parseGroqQuestions(DEDUP_REPLY, 'Make a quiz about animals')
    expect(items.length).toBe(9)
    const answers = items.map((i) => i.answer)
    expect(answers).toContain('African elephant')
    expect(answers).not.toContain('Elephant')
  })

  it('drops a case-insensitive exact duplicate answer', () => {
    const reply = {
      questions: [
        { question: 'Which animal is the king of the jungle?', correct: 'Lion', incorrect: ['Tiger', 'Bear', 'Wolf'] },
        { question: 'Which animal roars the loudest?', correct: 'lion', incorrect: ['Tiger', 'Bear', 'Wolf'] },
        { question: 'Which animal is the fastest on land?', correct: 'Cheetah', incorrect: ['Lion', 'Horse', 'Gazelle'] },
      ],
    }
    const items = parseGroqQuestions(reply, 'Make a quiz about animals')
    expect(items.length).toBe(2)
    expect(items.map((i) => i.answer)).toEqual(['Lion', 'Cheetah'])
  })

  it('keeps "Sun" and "Sunflower" — sharing letters is not the same answer', () => {
    const reply = {
      questions: [
        { question: 'What is the closest star to Earth?', correct: 'Sun', incorrect: ['Moon', 'Mars', 'Venus'] },
        { question: 'Which flower turns to follow the sun?', correct: 'Sunflower', incorrect: ['Rose', 'Tulip', 'Daisy'] },
      ],
    }
    const items = parseGroqQuestions(reply, 'Make a quiz about the sun')
    expect(items.length).toBe(2)
  })

  it('keeps repeated numeric answers — the same number answers different sums', () => {
    const reply = {
      questions: [
        { question: 'What is 2 + 3?', correct: '5', incorrect: ['4', '6', '7'] },
        { question: 'What is 1 + 4?', correct: '5', incorrect: ['4', '6', '7'] },
        { question: 'What is 5 + 4?', correct: '9', incorrect: ['8', '10', '7'] },
      ],
    }
    const items = parseGroqQuestions(reply, 'make a addition game')
    expect(items.length).toBe(3)
  })
})

describe('converted types also reach 10', () => {
  it('hangman: a 3-word reply plus a 10-word reply yields 10 words', async () => {
    const { fetchImpl, calls } = mockGroqFetch([HANGMAN_3_REPLY, HANGMAN_10_REPLY])
    const result = await buildGroqDraft('Make a hangman game about animals', fetchImpl, undefined, 'hangman')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items.length).toBe(10)
      expect(result.items[0].answer).toBe('Lion')
    }
    // No self-check call for hangman — every call is a draft call.
    expect(calls.length).toBe(2)
  })

  it('true-false: a 10-statement reply yields 10 mixed statements', async () => {
    const { fetchImpl } = mockGroqFetch([TRUE_FALSE_10_REPLY])
    const result = await buildGroqDraft('Make a quiz about animals', fetchImpl, undefined, 'true-false')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items.length).toBe(10)
      expect(result.items.some((i) => i.answer === 'True')).toBe(true)
      expect(result.items.some((i) => i.answer === 'False')).toBe(true)
    }
  })
})
