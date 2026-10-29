/**
 * EduPlay AI Prompts (Phase 4)
 * All prompts are locale-aware and output strict JSON only.
 * Designed for children's educational content — safe by default.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityPromptParams {
  topic: string
  type: string
  count: number
  locale: string
  grade: string
  curriculum?: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

interface QuestionsPromptParams {
  topic: string
  count: number
  difficulty: 'easy' | 'medium' | 'hard'
  locale: string
}

// ─── Language display names ───────────────────────────────────────────────────

const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  ur: 'Urdu (اردو)',
  ar: 'Arabic (العربية)',
  hi: 'Hindi (हिंदी)',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  bn: 'Bengali (বাংলা)',
  pt: 'Portuguese (Português)',
  ru: 'Russian (Русский)',
  id: 'Indonesian (Bahasa Indonesia)',
  zh: 'Chinese (中文)',
}

function getLangName(locale: string): string {
  return LOCALE_NAMES[locale] ?? locale
}

// ─── Activity type descriptions ───────────────────────────────────────────────

const ACTIVITY_TYPE_SCHEMAS: Record<string, string> = {
  quiz: `{"items": [{"prompt": "question text", "answer": "correct answer text", "hint": "optional hint"}]}`,
  'match-up': `{"items": [{"prompt": "left side term", "answer": "right side match"}]}`,
  anagram: `{"items": [{"prompt": "SCRAMBLED", "answer": "ORIGINAL WORD", "hint": "category hint"}]}`,
  flashcards: `{"items": [{"prompt": "front of card (question/term)", "answer": "back of card (answer/definition)"}]}`,
  'true-false': `{"items": [{"prompt": "statement that is true or false", "answer": "true" or "false", "hint": "explanation"}]}`,
  'fill-blank': `{"items": [{"prompt": "sentence with ___ for blank", "answer": "word that fills blank"}]}`,
  wordsearch: `{"items": [{"prompt": "definition or clue", "answer": "WORD (uppercase, no spaces)"}]}`,
  crossword: `{"items": [{"prompt": "clue", "answer": "ANSWER (uppercase, no spaces, max 12 chars)"}]}`,
  categorize: `{"items": [{"prompt": "item to categorize", "answer": "category name"}]}`,
  order: `{"items": [{"prompt": "item", "answer": "number representing correct position (1-based)"}]}`,
  hangman: `{"items": [{"prompt": "clue or category", "answer": "WORD (uppercase, max 12 chars)"}]}`,
  'missing-word': `{"items": [{"prompt": "full sentence", "answer": "the missing word"}]}`,
  unjumble: `{"items": [{"prompt": "jumbled word order sentence", "answer": "correct sentence"}]}`,
  // Batch 4 — schemas for every remaining type. All still use the same
  // prompt/answer item model the game engines already accept, so no
  // new database fields are needed. How each engine maps the pair:
  // spin-wheel / random-wheel: prompt = wheel item, answer = same item
  // (the wheel shows prompts); balloon-pop / whack-a-mole: prompt =
  // question, answer = correct label to pop/hit; labelled-diagram:
  // prompt = part name, answer = part name (image supplied by creator);
  // gameshow-quiz: prompt = question, answer = correct answer, hint =
  // lifeline hint; open-box: prompt = box label/question, answer =
  // hidden item; memory-match: prompt/answer = matching pair;
  // typing-race: prompt = question/word, answer = exact text to type;
  // bingo: prompt = clue/call, answer = cell value.
  'spin-wheel': `{"items": [{"prompt": "wheel item", "answer": "wheel item"}]}`,
  'random-wheel': `{"items": [{"prompt": "wheel item", "answer": "wheel item"}]}`,
  'balloon-pop': `{"items": [{"prompt": "question", "answer": "correct answer"}]}`,
  'whack-a-mole': `{"items": [{"prompt": "question", "answer": "correct answer"}]}`,
  'labelled-diagram': `{"items": [{"prompt": "part name", "answer": "part name", "hint": "where it is"}]}`,
  'gameshow-quiz': `{"items": [{"prompt": "question", "answer": "correct answer", "hint": "lifeline hint"}]}`,
  'open-box': `{"items": [{"prompt": "box question or label", "answer": "hidden answer"}]}`,
  'memory-match': `{"items": [{"prompt": "first half of pair", "answer": "matching second half"}]}`,
  'typing-race': `{"items": [{"prompt": "question or word to type", "answer": "exact answer text to type"}]}`,
  bingo: `{"items": [{"prompt": "clue to call out", "answer": "bingo cell value"}]}`,
}

function getActivitySchema(type: string): string {
  return ACTIVITY_TYPE_SCHEMAS[type] ?? ACTIVITY_TYPE_SCHEMAS['quiz']
}

// ─── System prompts ───────────────────────────────────────────────────────────

export function buildActivitySystemPrompt(locale: string): string {
  const lang = getLangName(locale)
  return `You are an expert educational content creator for EduPlay, a children's learning platform.

LANGUAGE: All content MUST be written in ${lang}. Every word in your output must be in ${lang}.

SAFETY RULES (mandatory):
- Content must be 100% child-safe (ages 5–18)
- No violence, weapons, or scary content
- No sexual or romantic content
- No political or religious controversy
- No personal information
- No brand names or trademarks

OUTPUT FORMAT: Return ONLY valid JSON. No markdown fences. No preamble. No explanation.
The JSON must be parseable by JSON.parse() with zero modification.

QUALITY RULES:
- Make content engaging and age-appropriate
- Vary difficulty naturally across items
- Ensure all answers are unambiguous and factually correct
- Keep prompts clear and concise`
}

export function buildActivityUserPrompt(params: ActivityPromptParams): string {
  const { topic, type, count, locale, grade, curriculum, difficulty = 'medium' } = params
  const lang = getLangName(locale)
  const schema = getActivitySchema(type)
  const curriculumNote = curriculum ? `Curriculum: ${curriculum}.` : ''
  const difficultyGuide: Record<string, string> = {
    easy: 'basic recall, straightforward concepts, simple vocabulary',
    medium: 'understanding and application, moderate vocabulary, some inference',
    hard: 'analysis, evaluation, advanced vocabulary, multi-step reasoning',
  }

  return `Create a "${type}" activity about "${topic}" for grade ${grade} students.
Language: ${lang}. ${curriculumNote}
Difficulty: ${difficulty} (${difficultyGuide[difficulty] ?? difficultyGuide.medium}).
Generate exactly ${count} items.

Required JSON schema:
${schema}

Rules for this activity type:
${getTypeSpecificRules(type)}

Return ONLY the JSON object. Nothing else.`
}

function getTypeSpecificRules(type: string): string {
  const rules: Record<string, string> = {
    quiz: '- Each item is a question with a clear single answer\n- Vary question formats (what, why, how, which)',
    'match-up': '- Left and right sides must pair logically\n- Make pairs clearly connected',
    anagram:
      '- Scramble the letters of real words\n- Words should relate to the topic\n- SCRAMBLED field should have all same letters in different order',
    flashcards: '- Front is a term or concept\n- Back is the clear definition or explanation',
    'true-false':
      '- Mix of true and false statements\n- Statements must be clearly true OR false, not ambiguous',
    'fill-blank': '- Blank (___) should replace a key vocabulary word\n- The sentence should provide enough context to guess',
    wordsearch: '- Words must be relevant to the topic\n- All uppercase, no spaces or hyphens',
    crossword: '- Clues should be clear but slightly challenging\n- Answers: uppercase, no spaces, 3-12 characters',
    categorize: '- Have 2-4 distinct categories\n- Items should clearly belong to one category',
    hangman: '- Choose topic-relevant words\n- 5-10 letter words work best',
    'missing-word': '- Remove the most important word from a meaningful sentence\n- The removed word tests vocabulary knowledge',
    unjumble: '- Jumble word order in a grammatically correct sentence\n- Result should be a natural, meaningful sentence',
    'spin-wheel': '- Each item is one wheel entry; prompt and answer are the same text',
    'random-wheel': '- Each item is one wheel entry; prompt and answer are the same text',
    'balloon-pop': '- Prompt is a question, answer is the single correct label',
    'whack-a-mole': '- Prompt is a question, answer is the single correct label',
    'labelled-diagram': '- Prompt/answer are part names the creator will attach to an image',
    'gameshow-quiz': '- Prompt is a dramatic quiz question, answer is correct, hint is a lifeline hint',
    'open-box': '- Prompt is the box question/label, answer is the hidden item',
    'memory-match': '- Prompt and answer must form a clear matching pair (term/definition, word/meaning, question/answer)',
    'typing-race': '- Answer must be short and exactly typable (one word or short phrase, no punctuation surprises)',
    bingo: '- Prompt is a clue, answer is the bingo cell value; answers must all be distinct',
  }
  return rules[type] ?? '- Create clear, educationally valuable items'
}

// ─── Questions prompts ────────────────────────────────────────────────────────

export function buildQuestionsSystemPrompt(locale: string): string {
  const lang = getLangName(locale)
  return `You are an expert quiz creator for EduPlay, a children's educational platform.

LANGUAGE: All content MUST be written in ${lang}.

SAFETY: Content must be child-safe, factually accurate, and educationally valuable.

OUTPUT FORMAT: Return ONLY valid JSON — no markdown, no preamble:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

correctIndex is 0-based (0=A, 1=B, 2=C, 3=D).
Always provide exactly 4 options.
Only one option should be correct.`
}

export function buildQuestionsUserPrompt(params: QuestionsPromptParams): string {
  const { topic, count, difficulty, locale } = params
  const lang = getLangName(locale)

  const difficultyGuide: Record<string, string> = {
    easy: 'basic recall, straightforward concepts, simple vocabulary',
    medium: 'understanding and application, moderate vocabulary, some inference',
    hard: 'analysis, evaluation, advanced vocabulary, multi-step reasoning',
  }

  return `Create ${count} multiple-choice questions about "${topic}".
Language: ${lang}.
Difficulty: ${difficulty} (${difficultyGuide[difficulty] ?? 'medium level'}).

Rules:
- Questions should progress naturally
- Wrong options (distractors) should be plausible but clearly incorrect on reflection
- Explanations should be educational and reinforce learning
- Do not repeat similar questions

Return ONLY the JSON object.`
}

// ─── Urdu-specific prompt for direct use ─────────────────────────────────────

export const URDU_ACTIVITY_SYSTEM = `آپ EduPlay کے لیے ایک ماہر تعلیمی مواد تخلیق کار ہیں۔
تمام مواد اردو میں لکھیں۔ بچوں کے لیے محفوظ اور تعلیمی ہونا ضروری ہے۔
صرف JSON واپس کریں — کوئی اور متن نہیں۔`

// ─── Arabic-specific prompt ───────────────────────────────────────────────────

export const ARABIC_ACTIVITY_SYSTEM = `أنت منشئ محتوى تعليمي خبير لمنصة EduPlay.
اكتب جميع المحتوى باللغة العربية. يجب أن يكون آمناً ومناسباً للأطفال.
أعد JSON فقط — لا نص آخر.`
