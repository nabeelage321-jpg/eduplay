/**
 * ACTIVITY TYPE META (single source of truth).
 *
 * Moved here from TypeSelector (2026-11-07, final 6): the icon +
 * name + description list must be importable from SERVER components
 * too (homepage type pills, popular cards). A 'use client' module
 * cannot be called from the server — importing the list from
 * TypeSelector broke the homepage build ("Attempted to call map()
 * from the server"). TypeSelector re-exports this, so every existing
 * import keeps working. Own emoji icons only, never copied art.
 */
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
  { slug: 'number-slider',    icon: '🎚️', name: 'Number Slider',    desc: 'Slide to the number on the line' },
  { slug: 'maze-chase',      icon: '👻', name: 'Maze Chase',      desc: 'Eat the right answer, dodge the ghost' },
  { slug: 'apple-snake',     icon: '🍎', name: 'Apple Snake',     desc: 'Eat the right apple and grow' },
  { slug: 'flutter-flight',  icon: '🐦', name: 'Flutter Flight',  desc: 'Flap through the gate with the right answer' },
  { slug: 'sweet-match',     icon: '🍬', name: 'Sweet Match',     desc: 'Swap sweets to match the word or sum' },
  { slug: 'star-shooter',    icon: '👾', name: 'Star Shooter',    desc: 'Shoot the invader with the right answer' },
  { slug: 'jump-blocks',     icon: '🧱', name: 'Jump Blocks',     desc: 'Run and jump to hit the block with the right answer' },
  { slug: 'fruit-slice',      icon: '🍉', name: 'Fruit Slice',      desc: 'Slice the fruit with the right answer' },
  { slug: 'river-hop',       icon: '🌊', name: 'River Hop',       desc: 'Hop the pads in counting order to cross the river' },
  { slug: 'lane-runner',      icon: '🏃', name: 'Lane Runner',      desc: 'Run the lanes and race through the gate with the right answer' },
  { slug: 'block-drop',       icon: '🧱', name: 'Block Drop',       desc: 'Drop falling blocks to spell the word or make the sum' },
  { slug: 'slingshot-aim',    icon: '🎯', name: 'Slingshot Aim',    desc: 'Aim the slingshot and knock down the tower with the right answer' },
  { slug: 'brick-bounce',     icon: '🧱', name: 'Brick Bounce',     desc: 'Bounce the ball off the paddle to smash the bricks with the right answer' },
]
