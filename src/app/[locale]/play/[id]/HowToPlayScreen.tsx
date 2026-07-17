'use client'

interface HowToPlayScreenProps {
  gameType: string
  gameName: string
  gameEmoji: string
  onStart: () => void
  onBack: () => void
}

const GAME_INSTRUCTIONS: Record<string, { steps: Array<{ emoji: string; text: string }> }> = {
  quiz: {
    steps: [
      { emoji: '👀', text: 'Read the question carefully' },
      { emoji: '🤔', text: 'Pick the correct answer' },
      { emoji: '⚡', text: 'Answer fast for more points' },
    ],
  },
  flashcards: {
    steps: [
      { emoji: '👀', text: 'Look at the card carefully' },
      { emoji: '🔄', text: 'Click card to flip it' },
      { emoji: '✅', text: 'Press I Knew It or I Didnt' },
    ],
  },
  'true-false': {
    steps: [
      { emoji: '👀', text: 'Read the statement' },
      { emoji: '🤔', text: 'Is it TRUE or FALSE' },
      { emoji: '⚡', text: 'Answer fast for more points' },
    ],
  },
  hangman: {
    steps: [
      { emoji: '👀', text: 'Read the hint carefully' },
      { emoji: '🔤', text: 'Click letters to guess word' },
      { emoji: '⚠️', text: 'Only 6 wrong guesses allowed' },
    ],
  },
  'match-up': {
    steps: [
      { emoji: '👀', text: 'Look at both columns' },
      { emoji: '👆', text: 'Click one from each side' },
      { emoji: '✅', text: 'Match all pairs to win' },
    ],
  },
  anagram: {
    steps: [
      { emoji: '👀', text: 'Look at the scrambled word' },
      { emoji: '🔤', text: 'Click letters in right order' },
      { emoji: '✅', text: 'Press Check when done' },
    ],
  },
  'balloon-pop': {
    steps: [
      { emoji: '👀', text: 'Read the question at top' },
      { emoji: '🎈', text: 'Find the correct balloon' },
      { emoji: '👆', text: 'Pop it fast for more points' },
    ],
  },
  'whack-a-mole': {
    steps: [
      { emoji: '👀', text: 'Read the question at top' },
      { emoji: '🐭', text: 'Find the correct mole' },
      { emoji: '👆', text: 'Whack it fast for points' },
    ],
  },
  'fill-blank': {
    steps: [
      { emoji: '👀', text: 'Read the sentence carefully' },
      { emoji: '🤔', text: 'Find the missing word' },
      { emoji: '👆', text: 'Click the correct answer' },
    ],
  },
  'missing-word': {
    steps: [
      { emoji: '👀', text: 'Read the sentence carefully' },
      { emoji: '🤔', text: 'What word is missing' },
      { emoji: '👆', text: 'Click the correct answer' },
    ],
  },
  order: {
    steps: [
      { emoji: '👀', text: 'Read the instruction' },
      { emoji: '🔢', text: 'Click items in correct order' },
      { emoji: '✅', text: 'Get them all right to win' },
    ],
  },
  crossword: {
    steps: [
      { emoji: '👀', text: 'Read the clues carefully' },
      { emoji: '🔤', text: 'Click boxes to type letters' },
      { emoji: '✅', text: 'Fill all words to win' },
    ],
  },
  'word-search': {
    steps: [
      { emoji: '👀', text: 'Look at words to find' },
      { emoji: '👆', text: 'Click first and last letter' },
      { emoji: '✅', text: 'Find all words to win' },
    ],
  },
  categorize: {
    steps: [
      { emoji: '👀', text: 'Read each item carefully' },
      { emoji: '👆', text: 'Click item then category' },
      { emoji: '✅', text: 'Sort all items correctly' },
    ],
  },
  unjumble: {
    steps: [
      { emoji: '👀', text: 'Look at the mixed words' },
      { emoji: '👆', text: 'Click words in right order' },
      { emoji: '✅', text: 'Press Check when done' },
    ],
  },
  'gameshow-quiz': {
    steps: [
      { emoji: '👀', text: 'Read question carefully' },
      { emoji: '💡', text: 'Use 50/50 if stuck' },
      { emoji: '⚡', text: 'Answer for big points' },
    ],
  },
  'random-wheel': {
    steps: [
      { emoji: '👀', text: 'Watch the wheel spin' },
      { emoji: '🎯', text: 'See where it lands' },
      { emoji: '🎉', text: 'Do the fun challenge' },
    ],
  },
  'spin-wheel': {
    steps: [
      { emoji: '🌀', text: 'Press spin to start' },
      { emoji: '👀', text: 'See your question' },
      { emoji: '⚡', text: 'Answer fast for points' },
    ],
  },
  'open-box': {
    steps: [
      { emoji: '🎁', text: 'Click any mystery box' },
      { emoji: '👀', text: 'See what is inside' },
      { emoji: '✅', text: 'Answer the question' },
    ],
  },
  'labelled-diagram': {
    steps: [
      { emoji: '👀', text: 'Look at the diagram' },
      { emoji: '👆', text: 'Click the hotspot circles' },
      { emoji: '✅', text: 'Label all parts correctly' },
    ],
  },
}

export function HowToPlayScreen({
  gameType,
  gameName,
  gameEmoji,
  onStart,
  onBack,
}: HowToPlayScreenProps) {
  const instructions = GAME_INSTRUCTIONS[gameType] || GAME_INSTRUCTIONS.quiz

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4">
      <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-6 text-2xl text-gray-600 hover:text-gray-800 transition-colors"
          aria-label="Back"
        >
          ← Back
        </button>

        {/* Game Emoji */}
        <div className="text-7xl text-center mb-6">{gameEmoji}</div>

        {/* Game Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-8">
          {gameName}
        </h1>

        {/* Instructions */}
        <div className="space-y-6 mb-10">
          {instructions.steps.map((step, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="text-4xl flex-shrink-0">{step.emoji}</div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-gray-800">
                  Step {index + 1}: {step.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Lets Play Button */}
        <button
          onClick={onStart}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-6 px-6 rounded-2xl text-2xl md:text-3xl transition-colors transform hover:scale-105 active:scale-95 mb-4"
        >
          Lets Play 🎮
        </button>
      </div>
    </div>
  )
}
