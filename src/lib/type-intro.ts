/**
 * TYPE INTRO RULES (batch-1 shared build, final list item 4).
 *
 * Every game type gets a "How to play" screen BEFORE Start — Quiz is
 * the benchmark — with that type's REAL numbers and rules. The lines
 * below are the single source for the shared PlayIntro screen.
 *
 * HONESTY RULE for this file: a number (points, seconds, lives) is
 * stated ONLY where the player code proves it. Types whose scoring
 * or timer I did not verify get the generic scoring line ("correct
 * answers earn points — the end screen shows your total") and no
 * timer/lives line at all. Nothing here invents a rule, a timer, or
 * a life count: a missing line means "not verified", never "zero".
 *
 * Verified numbers (player code, 2026-11-07):
 *   quiz: 10 pts/correct, 30s/question (TIMER_DEFAULT).
 *   match-up: 10 pts per correct match, no timer, wrong costs nothing.
 *   anagram: 10 pts per word, no timer, no lives, wrong word = retry.
 *   crossword: 10 pts per solved word, no timer.
 *   wordsearch: 10 pts per found word, no timer.
 *   spin-wheel: 3 spins; each landing asks its question; 10 pts per
 *     correct answer (item 24 — the wheel picks the question, the
 *     answer earns the points).
 *   maze-run: 10 pts, 60s/round, 5 lives. speed-judge: 10 pts,
 *     10s/round, 3 lives. spell-it: +5 per word, 60s/word, 3 lives
 *     (lost only by time-up or Skip). picture-answer: 10 pts,
 *     30s/round, 3 lives. memory-recall: 10 pts, 30s/round, 3 lives.
 *   claim-line: 10 pts, 30s/question, 3 lives. opinion-cloud: NO
 *     lives, NO timer, NO wrong answers. number-slider: exact +10,
 *     near +5, far 0 and -1 life, 30s/round, 3 lives. maze-chase:
 *     10 pts, 45s/round, 3 lives (wrong ball, ghost catch, or
 *     time-up costs one). apple-snake: 10 pts, 45s/round, 3 lives
 *     (wrong apple, wall bump, tail bite, or time-up costs one).
 *     flutter-flight: 10 pts, 45s/round, 3 lives (wrong gate, gate
 *     hit, ground touch, or time-up costs one).
 *     sweet-match: 10 pts, 60s/round, 3 lives (only a time-up
 *     costs one — a wrong swap just swaps back; cascades +5).
 *     star-shooter: 10 pts, 3 lives (a wrong shot wastes the
 *     shot only — a landing costs one; invaders land after 4
 *     descent steps, one step every 3.5s).
 *     jump-blocks: 10 pts + 1 coin per correct block, 3 lives
 *     (a wrong block costs one life and cracks).
 *     fruit-slice: 10 pts, 3 lives (a wrong fruit or a bomb
 *     costs one life; a correct fruit escaping costs none).
 *     river-hop: 10 pts per crossing, 3 lives (a wrong pad, a
 *     splash, or a car hit costs one life and restarts the
 *     sequence from the start bank).
 *     lane-runner: 10 pts per correct gate, 3 lives (a wrong
 *     gate or a barrier crash costs one life and ends the round;
 *     coins earn no points).
 *     block-drop: 10 pts per completed row, 3 lives (a topped-out
 *     well costs one life and ends the round; running out of
 *     blocks costs no life).
 *     slingshot-aim: 10 pts per correct tower, 3 lives (a wrong
 *     tower or a miss wastes one of 3 stones; spending all 3
 *     stones without the correct tower costs one life and ends
 *     the round).
 *     brick-bounce: 10 pts per correct brick (3 per round), 3
 *     lives (a wrong brick or a fall past the paddle costs one
 *     of 3 balls; spending all 3 balls without smashing every
 *     correct brick costs one life and ends the round).
 *     rock-blaster: 10 pts per correct asteroid (1 per round), 3
 *     lives (a wrong asteroid wastes one of 6 bullets and a
 *     crash into any asteroid costs one life and ends the
 *     round; spending all 6 bullets without blasting the
 *     correct asteroid costs one life and ends the round).
 *     ladder-climb: 10 pts per correct ladder (1 per round), 3
 *     lives (a wrong ladder costs no life — climb back down
 *     and try another; a barrel hit costs one life and ends
 *     the round).
 *     beat-tap: 10 pts per correct on-beat tap (1 per round),
 *     3 lives (a wrong note or an off-beat tap breaks the
 *     streak but costs no life; letting the correct note pass
 *     the line untapped costs one life and ends the round).
 *     mine-logic: 10 pts per cleared grid (1 per round), 3
 *     lives (a wrong answer costs no life — the square stays
 *     covered; opening a mine or flagging a safe square costs
 *     one life and ends the round).
 *     number-merge: 10 pts per target reached (1 per round), 3
 *     lives (a slide that moves nothing costs no life; a stuck
 *     board costs one life and the round restarts with the same
 *     target).
 *     bounce-up: 10 pts per correct platform (6 per round, one
 *     in every row) + 10 for the star at the top, 3 lives (a
 *     wrong platform breaks but costs no life; falling off the
 *     bottom of the screen costs one life and ends the round).
 *     creature-catch: 10 pts per correct catch (one per round),
 *     3 lives (a wrong creature breaks free, costs one life,
 *     and ends the round; one throw per round).
 *     snooker-quiz: 10 pts per red potted (one per round) + 2-7
 *     for the colour ball picked after a red, 3 lives (a wrong
 *     ball is a miss, costs one life, and ends the round; one
 *     pot per round).
 *     pattern-echo: 10 pts per pattern repeated exactly (one
 *     per round), no lives (a wrong tap just replays the
 *     pattern; the pattern grows 3, 4, 5, … up to 8 steps).
 *     bomb-maze: 10 pts per reached goal (one per round), 3
 *     lives (a wrong star pops but costs no life; a sleepy
 *     bomb bounces the explorer back to the start and costs no
 *     life; only running out of time costs one life and ends
 *     the round).
 *     aster-quiz:
 *     5 lives. hangman: 10 pts per word, more points the fewer
 *     wrong guesses (MAX_WRONG - wrongCount, min 1x). flashcards:
 *     10 pts per card you know. random-wheel / open-box: 10 pts
 *     per item when the round completes. All other choice types
 *     use the shared SCORE_PER_CORRECT (+10).
 */

import { ACTIVITY_TYPE_META } from './activity-type-meta'

export interface TypeIntroRules {
  /** What the kid DOES on one round/screen. */
  howTo: string
  /** How points are given — verified numbers only, else generic. */
  scoring: string
  /** What the kid is trying to do overall. */
  objective: string
  /** How the kid controls the game. */
  controls: string
  /** Timer rule, only when verified; null = no timer line shown. */
  timer: string | null
  /** Lives rule, only when verified; null = no lives line shown. */
  lives: string | null
  /** How the game ends. */
  finish: string
}

const GENERIC_SCORING =
  'Correct answers earn points — the end screen shows your total.'

function rules(r: Partial<TypeIntroRules> & Pick<TypeIntroRules, 'howTo' | 'objective' | 'controls'>): TypeIntroRules {
  return {
    scoring: GENERIC_SCORING,
    timer: null,
    lives: null,
    finish: 'Finish every round — the end screen shows your score and your time.',
    ...r,
  }
}

const RULES: Record<string, TypeIntroRules> = {
  'quiz': rules({
    howTo: 'Each screen asks one question with four answers. Tap the answer you think is right.',
    scoring: 'Each correct answer earns 10 points. Wrong answers and time-ups earn no points.',
    objective: 'Answer every question — get as many right as you can.',
    controls: 'Tap an answer on the screen. No keyboard needed.',
    timer: '30 seconds per question. The time at the top shows how long you have played.',
  }),
  'match-up': rules({
    howTo: 'Tap a question on the left, then tap its matching answer on the right.',
    scoring: 'Each correct match earns 10 points.',
    objective: 'Match every pair.',
    controls: 'Tap a left card, then tap the right card that goes with it.',
    finish: 'Match every pair — the end screen shows your score and your time.',
  }),
  'anagram': rules({
    howTo: 'The letters of a word are mixed up. Tap the letter tiles in the right order to spell the word.',
    scoring: 'Each word you spell earns 10 points. A wrong word costs no points — the letters shuffle and you try again.',
    objective: 'Unscramble every word.',
    controls: 'Tap letter tiles to place them. Tap a placed letter to take it back.',
    finish: 'Spell every word — the end screen shows your score.',
  }),
  'crossword': rules({
    howTo: 'Read the clue, then type the word into the grid — across or down. Letters that cross help you.',
    scoring: 'Each word you finish earns 10 points.',
    objective: 'Fill in every word in the grid.',
    controls: 'Tap a square and type the letter. Tap a clue to jump to that word.',
    finish: 'Solve every word — the end screen shows your score.',
  }),
  'wordsearch': rules({
    howTo: 'Find the hidden words in the letter grid. Drag across the letters of a word to select it.',
    scoring: 'Each word you find earns 10 points.',
    objective: 'Find every hidden word.',
    controls: 'Drag across letters (or tap the first and last letter). Words can go any way — across, down, or diagonal.',
    finish: 'Find every word — the end screen shows your score.',
  }),
  'spin-wheel': rules({
    howTo: 'Spin the wheel! It lands on a topic — then answer the question about that topic.',
    scoring: 'Each correct answer earns 10 points. The wheel only picks the question — the answer earns the points.',
    objective: 'Answer the question after each of your 3 spins.',
    controls: 'Tap Spin, wait for the wheel to stop, then tap your answer.',
    finish: 'Answer after all 3 spins — the end screen shows your score.',
  }),
  'balloon-pop': rules({
    howTo: 'Balloons float up with answers on them. Pop the balloon that shows the correct answer.',
    scoring: 'Each correct pop earns 10 points.',
    objective: 'Pop the right balloon every round.',
    controls: 'Tap the balloon with the correct answer.',
  }),
  'whack-a-mole': rules({
    howTo: 'Moles pop up with answers on them. Hit the mole that shows the correct answer.',
    scoring: 'Each correct hit earns 10 points.',
    objective: 'Hit the right mole every round.',
    controls: 'Tap the mole with the correct answer.',
  }),
  'true-false': rules({
    howTo: 'Read each statement and judge it: true or false?',
    scoring: 'Each correct judgement earns 10 points.',
    objective: 'Judge every statement correctly.',
    controls: 'Tap True or False.',
  }),
  'categorize': rules({
    howTo: 'Sort each item into the right group.',
    scoring: 'Each correctly sorted item earns 10 points. A hint costs 5 marks (2 hints per game).',
    objective: 'Sort every item into its group.',
    controls: 'Tap an item, then tap its group — or drag it in.',
  }),
  'order': rules({
    howTo: 'Put the items in order — the game tells you the rule on the screen (A to Z, oldest to newest, or smallest to largest). Look for the clue on each item.',
    scoring: 'Each item in the right place earns 10 points. A hint costs 5 marks (2 hints per game).',
    objective: 'Put every item in its right place.',
    controls: 'Drag the items into order, then tap Check Order.',
  }),
  'fill-blank': rules({
    howTo: 'Read the sentence with a missing word, then type it or tap the word that completes it. A wrong answer moves on to the next sentence with no points — so think before you answer!',
    scoring: 'Each correct blank earns 10 points.',
    objective: 'Complete every sentence.',
    controls: 'Type the missing word and tap Submit — or tap a choice below.',
  }),
  'labelled-diagram': rules({
    howTo: 'Look at the picture, then label each part with the right name.',
    scoring: 'Each correct label earns 10 points.',
    objective: 'Label every part of the picture.',
    controls: 'Tap a label spot, then pick the right name.',
  }),
  'flashcards': rules({
    howTo: 'Flip each card to see the answer, then say if you knew it.',
    scoring: 'Each card you know earns 10 points.',
    objective: 'Learn every card — then test yourself.',
    controls: 'Tap a card to flip it.',
  }),
  'missing-word': rules({
    howTo: 'A word is missing from the sentence. Pick the word that belongs there.',
    scoring: 'Each correct word earns 10 points.',
    objective: 'Find the missing word every round.',
    controls: 'Tap the word that fits.',
  }),
  'unjumble': rules({
    howTo: 'The words of a sentence are jumbled. Put them back in the right order.',
    scoring: 'Each correctly ordered sentence earns 10 points.',
    objective: 'Unjumble every sentence.',
    controls: 'Tap or drag the words into order.',
  }),
  'gameshow-quiz': rules({
    howTo: 'Answer quiz questions on the big stage — with lifelines to help you.',
    scoring: 'Each correct answer earns 10 points.',
    objective: 'Answer every question and win the show.',
    controls: 'Tap your answer. Use a lifeline when you are stuck.',
  }),
  'hangman': rules({
    howTo: 'Read the 3 clues first, then guess the hidden word, one letter at a time. Wrong guesses draw the hangman.',
    scoring: 'Each word earns up to 60 points — 10 for every wrong guess you did NOT use.',
    objective: 'Guess every word before the drawing is finished.',
    controls: 'Tap a letter to guess it.',
    lives: 'Wrong guesses add to the drawing — too many and the word is lost.',
  }),
  'random-wheel': rules({
    howTo: 'Spin the wheel — it lands on a question. Read it and pick the right answer.',
    scoring: 'Each correct answer earns 10 points. Spinning alone earns nothing.',
    objective: 'Answer every question the wheel picks for you.',
    controls: 'Tap Spin, then tap your answer.',
  }),
  'open-box': rules({
    howTo: 'One question at a time — read it, then tap the box hiding the correct answer.',
    scoring: 'Each correct box earns 10 points. A wrong tap moves on with no points.',
    objective: 'Answer every question by opening the right box.',
    controls: 'Tap a box to open it.',
  }),
  'memory-match': rules({
    howTo: 'Flip two tiles. If they match, they stay open — if not, they flip back.',
    scoring: 'Each matched pair earns 10 points.',
    objective: 'Match every pair.',
    controls: 'Tap tiles to flip them.',
  }),
  'typing-race': rules({
    howTo: 'Type the word you see as fast as you can — before the race ends.',
    scoring: 'Correct words earn points — faster typing earns bonus points.',
    objective: 'Type every word correctly.',
    controls: 'Type on your keyboard.',
  }),
  'bingo': rules({
    howTo: 'Mark the answers on your card as they are called.',
    scoring: 'Correct marks earn points — completing a line scores big.',
    objective: 'Complete a line on your card.',
    controls: 'Tap the right square to mark it.',
  }),
  'jump-path': rules({
    howTo: 'Answer questions to jump along the path — a right answer jumps you forward.',
    scoring: 'Correct answers earn points and move you along the path.',
    objective: 'Reach the end of the path.',
    controls: 'Tap your answer to jump.',
    timer: 'Answer before the time runs out to keep jumping.',
  }),
  'riddle': rules({
    howTo: 'Read the riddle and type the answer it is asking for.',
    scoring: 'Each riddle you solve earns points.',
    objective: 'Solve every riddle.',
    controls: 'Type your answer.',
  }),
  'aster-quiz': rules({
    howTo: 'Answer questions to fly your ship through the asteroids.',
    scoring: 'Correct answers earn points and keep you flying.',
    objective: 'Answer your way through the asteroids.',
    controls: 'Tap your answer.',
    lives: 'You have 5 lives — a wrong answer costs one.',
  }),
  'dictation': rules({
    howTo: 'Listen carefully, then type exactly what you hear.',
    scoring: 'Words you type correctly earn points.',
    objective: 'Write down everything you hear.',
    controls: 'Tap to listen again, then type.',
  }),
  'dialogue': rules({
    howTo: 'Follow the conversation, line by line, and answer when it is your turn.',
    scoring: 'Finish the conversation to see your score.',
    objective: 'Finish the whole conversation.',
    controls: 'Tap to continue, then answer your lines.',
    finish: 'Read every line to finish — the end screen shows your score.',
  }),
  'map-quiz': rules({
    howTo: 'Read the question, then tap the right place on the map.',
    scoring: 'Each place you find earns points.',
    objective: 'Find every place on the map.',
    controls: 'Tap the map where you think the answer is.',
  }),
  'jigsaw-puzzle': rules({
    howTo: 'Put the jigsaw pieces together to rebuild the picture, then answer about it.',
    scoring: 'Pieces you place earn points.',
    objective: 'Rebuild the whole picture.',
    controls: 'Drag pieces into place.',
  }),
  'video-quiz': rules({
    howTo: 'Watch the video — questions pop up as it plays. Answer before it moves on.',
    scoring: 'Each correct answer earns points.',
    objective: 'Answer every question the video asks.',
    controls: 'Tap your answer when a question appears.',
  }),
  'letter-wheel': rules({
    howTo: 'Spin the letter wheel — answer the definition for the letter it lands on.',
    scoring: 'Each correct letter answer earns points.',
    objective: 'Answer a definition for every letter.',
    controls: 'Tap to spin, then type your answer.',
  }),
  'maze-run': rules({
    howTo: 'Run through the maze — answer each question to move to the correct tile.',
    scoring: 'Each correct answer earns 10 points.',
    objective: 'Reach the end of the maze.',
    controls: 'Tap the tile with the correct answer.',
    timer: '60 seconds per round.',
    lives: 'You have 5 lives.',
  }),
  'speed-judge': rules({
    howTo: 'A claim appears — judge it fast: true or false?',
    scoring: 'Each correct judgement earns 10 points.',
    objective: 'Judge every claim before time runs out.',
    controls: 'Tap ✅ or ❌.',
    timer: '10 seconds per round.',
    lives: 'You have 3 lives.',
  }),
  'spell-it': rules({
    howTo: 'Spell the word, letter by letter.',
    scoring: 'Each word you spell earns a 5-point bonus.',
    objective: 'Spell every word.',
    controls: 'Tap the letters in order.',
    timer: '60 seconds per word.',
    lives: 'You have 3 lives — lost only when time runs out or you skip a word.',
  }),
  'picture-answer': rules({
    howTo: 'Look at the picture, then answer the question about it.',
    scoring: 'Each correct answer earns 10 points.',
    objective: 'Answer every picture question.',
    controls: 'Tap your answer.',
    timer: '30 seconds per round.',
    lives: 'You have 3 lives.',
  }),
  'memory-recall': rules({
    howTo: 'First STUDY all the pairs — then RECALL them from memory, with only the question to help you.',
    scoring: 'Each correct recall earns 10 points.',
    objective: 'Remember every pair.',
    controls: 'Study, then tap your answer from memory.',
    timer: '30 seconds per round.',
    lives: 'You have 3 lives.',
  }),
  'claim-line': rules({
    howTo: 'Answer questions to claim squares on the board — get 3 in a line to win. The computer claims a square after every one of your answers.',
    scoring: 'Each square you claim earns 10 points.',
    objective: 'Claim a line of 3 squares before the computer does.',
    controls: 'Tap your answer to claim a square.',
    timer: '30 seconds per question.',
    lives: 'You have 3 lives.',
  }),
  'opinion-cloud': rules({
    howTo: 'There is no right or wrong here — share what YOU think about each card.',
    scoring: 'Your score is the opinions you share.',
    objective: 'Share your opinion on every card.',
    controls: 'Tap 👍, 👎, or 🤔.',
    finish: 'Share your opinion on every card — the end screen shows your cloud.',
  }),
  'number-slider': rules({
    howTo: 'Slide to the number on the line — land exactly on it for full points.',
    scoring: 'Exactly right earns 10 points, close earns 5, far earns 0.',
    objective: 'Hit the number every round.',
    controls: 'Drag the slider, then lock it in.',
    timer: '30 seconds per round.',
    lives: 'You have 3 lives — a far miss costs one.',
  }),
  'maze-chase': rules({
    howTo: 'Steer your chaser through the maze — eat the ball with the correct answer, dodge the ghost.',
    scoring: 'Each correct ball earns 10 points.',
    objective: 'Eat the right ball in every maze without the ghost catching you.',
    controls: 'Arrow keys or WASD, or the on-screen arrow pad.',
    timer: '45 seconds per round.',
    lives: 'You have 3 lives — a wrong ball, a ghost catch, or a time-up costs one.',
  }),
  'apple-snake': rules({
    howTo: 'Steer your snake through the garden — it moves on its own, so guide it to the apple with the correct answer.',
    scoring: 'Each correct apple earns 10 points, and your snake grows by one segment.',
    objective: 'Eat the right apple in every garden and grow the longest snake you can.',
    controls: 'Arrow keys or WASD, or the on-screen arrow pad.',
    timer: '45 seconds per round.',
    lives: 'You have 3 lives — a wrong apple, a wall bump, a tail bite, or a time-up costs one.',
  }),
  'flutter-flight': rules({
    howTo: 'Tap to flap your bird through the sky — fly through the gate with the correct answer.',
    scoring: 'Each correct gate earns 10 points.',
    objective: 'Fly through the right gate in every sky without running out of lives.',
    controls: 'Tap the sky, click it, or press Space to flap.',
    timer: '45 seconds per round.',
    lives: 'You have 3 lives — a wrong gate, a gate hit, a ground touch, or a time-up costs one.',
  }),
  'sweet-match': rules({
    howTo: 'Swap the sweets on the board to line up the word or the sum shown above it.',
    scoring: 'Each correct match earns 10 points, and each cascade after it earns 5 bonus points.',
    objective: 'Match the target on every board without running out of lives.',
    controls: 'Tap a sweet, then tap a sweet next to it to swap — or drag one sweet onto its neighbour.',
    timer: '60 seconds per round.',
    lives: 'You have 3 lives — only a time-up costs one; a wrong swap just swaps back.',
  }),
  'star-shooter': rules({
    howTo: 'Move your ship under the invader carrying the correct answer and shoot it before the invaders land.',
    scoring: 'Each correct invader earns 10 points.',
    objective: 'Shoot the right invader in every sky without running out of lives.',
    controls: 'Arrow keys or A/D to move, Space to shoot — or the on-screen arrows and FIRE button; tap the sky to move your ship.',
    timer: 'The invaders step down every few seconds and land after 4 steps.',
    lives: 'You have 3 lives — a wrong shot only wastes the shot; an invader landing costs one.',
  }),
  'jump-blocks': rules({
    howTo: 'Run under the block carrying the correct answer and jump to hit it from below.',
    scoring: 'Each correct block earns 10 points and one coin.',
    objective: 'Hit the right block in every level without running out of lives.',
    controls: 'Hold the arrow keys or A/D to run, Space, Arrow Up, or W to jump — or hold the on-screen arrows and tap JUMP.',
    timer: 'No timer — look before you leap.',
    lives: 'You have 3 lives — a wrong block costs one life and cracks so you cannot hit it again.',
  }),
  'fruit-slice': rules({
    howTo: 'Swipe across the fruit carrying the correct answer to slice it — or tap the fruit. Never slice the bomb.',
    scoring: 'Each correct fruit earns 10 points.',
    objective: 'Slice the right fruit in every round without running out of lives.',
    controls: 'Swipe across a fruit with your finger or mouse, or tap a fruit to slice it.',
    timer: 'No timer — watch the arcs and slice at the right moment.',
    lives: 'You have 3 lives — a wrong fruit or a bomb costs one life; a correct fruit flying away costs none.',
  }),
  'river-hop': rules({
    howTo: 'Hop across the road, then across the river on the pads with the next number in the counting order — and reach the far bank.',
    scoring: 'Each completed crossing earns 10 points; hops earn none.',
    objective: 'Cross to the far bank in every round without running out of lives.',
    controls: 'Arrow keys or W/A/S/D to hop — or the on-screen hop buttons.',
    timer: 'No timer — but the pads and cars keep moving, so time your hops.',
    lives: 'You have 3 lives — a wrong pad, a splash, or a car hit costs one life and sends you back to the start bank.',
  }),
  'lane-runner': rules({
    howTo: 'Run down the 3-lane track and race through the gate with the right answer — follow the coins, they run down the right gate’s lane.',
    scoring: 'Each right gate earns 10 points; coins earn none.',
    objective: 'Run through the right gate in every round without running out of lives.',
    controls: 'Left/right arrow keys or A/D to switch lanes, up arrow, W, or Space to jump — or the on-screen lane and JUMP buttons, or tap a lane.',
    timer: 'No timer — but the gates take about 3 seconds to reach you, so read the question and pick a lane.',
    lives: 'You have 3 lives — a wrong gate or a barrier crash costs one life and ends the round.',
  }),
  'block-drop': rules({
    howTo: 'Move, turn, and drop the falling blocks so one full row spells the target word or adds up to the target number — a wrong full row stays and piles up.',
    scoring: 'Each completed row earns 10 points.',
    objective: 'Complete the target row in every round without running out of lives.',
    controls: 'Left/right arrow keys or A/D to move, up arrow or X to turn, down arrow or S to drop one row, Space to drop it all the way — or the on-screen move, turn, and DROP buttons.',
    timer: 'No timer — but a piece falls one row about every second, so aim it before it lands.',
    lives: 'You have 3 lives — if the blocks pile up to the top so the next piece cannot fall, you lose one life and the round ends. Running out of blocks costs no life.',
  }),
  'slingshot-aim': rules({
    howTo: 'Drag back on the slingshot and release to launch a stone at the towers — knock down the tower with the right answer. The dotted path shows where the stone will fly.',
    scoring: 'Each correct tower knocked down earns 10 points.',
    objective: 'Knock down the correct tower in every round without running out of lives.',
    controls: 'Drag back on the slingshot with your mouse or finger and release to fire — or use the up/down arrow keys for angle, left/right for power, and Space to fire.',
    timer: 'No timer — take your time to aim, but you only get 3 stones per round.',
    lives: 'You have 3 lives — a wrong tower or a miss only wastes a stone, but spending all 3 stones without the correct tower costs one life and ends the round.',
  }),
  'brick-bounce': rules({
    howTo: 'Slide the paddle along the bottom to bounce the ball up into the wall of bricks — smash the bricks with the right answer. Where the ball hits the paddle decides where it goes next.',
    scoring: 'Each correct brick smashed earns 10 points — 3 right-answer bricks per round.',
    objective: 'Smash every right-answer brick in every round without running out of lives.',
    controls: 'Move your mouse or drag your finger across the field to slide the paddle — or use the left/right arrow keys. Press Space, tap the field, or press LAUNCH to send the ball up.',
    timer: 'No timer — take your time to aim, but you only get 3 balls per round.',
    lives: 'You have 3 lives — a wrong brick or a ball falling past the paddle only costs a ball, but spending all 3 balls without smashing every right-answer brick costs one life and ends the round.',
  }),
  'rock-blaster': rules({
    howTo: 'Fly your ship through space — turn with the arrow keys, thrust to drift, and blast the asteroid with the right answer. Or tap an asteroid to shoot straight at it. Dodge the rocks you are not shooting.',
    scoring: 'Each correct asteroid blasted earns 10 points — one right-answer asteroid per round.',
    objective: 'Blast the correct asteroid in every round without running out of lives.',
    controls: 'Hold the left/right arrow keys to turn, hold up to thrust, and press Space to fire — or use the on-screen turn, thrust, and FIRE buttons. Tap an asteroid to shoot straight at it.',
    timer: 'No timer — take your time to aim, but you only get 6 bullets per round.',
    lives: 'You have 3 lives — a wrong asteroid only wastes a bullet, but crashing into any asteroid costs one life and ends the round, and spending all 6 bullets without blasting the correct asteroid costs one life and ends the round.',
  }),
  'ladder-climb': rules({
    howTo: 'Climb the ladders between the platforms to the top — the ladder with the right answer at its top wins the round. Barrels roll along the platforms and drop down a level at each edge, so time your climb between them. Or tap a ladder and the kid walks to it and climbs it on his own.',
    scoring: 'Each correct ladder climbed earns 10 points — one right-answer ladder per round.',
    objective: 'Climb the correct ladder in every round without running out of lives.',
    controls: 'Hold the left/right arrow keys to walk, hold up/down to climb a ladder, and press Space to jump over a barrel — or use the on-screen walk, climb, and JUMP buttons. Tap a ladder to climb it.',
    timer: 'No timer — take your time to climb, but the barrels keep rolling.',
    lives: 'You have 3 lives — a wrong ladder costs no life, just the climb back down, but a barrel hit costs one life and ends the round.',
  }),
  'beat-tap': rules({
    howTo: 'Notes fall down the track, one per beat, and every note carries an answer — tap the drum the moment the note with the right answer crosses the line. The drum thumps on every beat and the line flashes with it, so feel the rhythm. Or tap a note on the track, or press Space.',
    scoring: 'Each correct on-beat tap earns 10 points — one right-answer note per round. A tap right on the beat is PERFECT, a slightly wider one is GOOD — both earn the same 10 points.',
    objective: 'Tap the right note on the beat in every round without running out of lives — and keep your streak going.',
    controls: 'Tap the big drum, press Space, or tap a note on the track — the moment it crosses the line.',
    timer: 'No timer — the notes set the pace, one per beat, and the right note falls in a different place every round.',
    lives: 'You have 3 lives — a wrong note or an off-beat tap only breaks your streak, but letting the right-answer note pass the line untapped costs one life and ends the round.',
  }),
  'mine-logic': rules({
    howTo: 'A 6 by 6 grid hides 6 mines. Tap a covered square and answer the quick question to open it — a number tells you how many mines touch that square, so a 3 means 3 mines touch it. Use the numbers to work out where the mines are, then flag them.',
    scoring: 'Each cleared grid earns 10 points — one grid per round, so a cleared grid is the only thing that scores.',
    objective: 'Clear every grid by opening all its safe squares and flagging the mines, without running out of lives.',
    controls: 'Tap a square to open it (a question appears first). Tap the Flag button — or press F, or hold a square down — to switch to flagging, then tap the squares you are sure hide a mine.',
    timer: 'No timer — take your time to read the numbers and work out where the mines are.',
    lives: 'You have 3 lives — a wrong answer costs no life, just the streak, but opening a mine or flagging a safe square costs one life and ends the round.',
  }),
  'number-merge': rules({
    howTo: 'Slide the numbered tiles on a 4 by 4 board — two equal tiles that meet merge into their sum, so 4 + 4 = 8. Each round gives you a target number to make, starting at 8 and doubling every round. Every merge shows its own sum, so you always see the maths you just did.',
    scoring: 'Making the target number earns 10 points — one target per round, so the game is scored out of 100. Merging smaller tiles earns no points on its own — only the target does.',
    objective: 'Make every round’s target — 8, then 16, then 32, all the way to 4096 — without running out of lives, and keep your streak of rounds won in a row going.',
    controls: 'Swipe the board, press the arrow keys (W A S D works too), or tap the arrow buttons under the board. A slide that moves nothing does nothing — no new tile appears and no life is lost.',
    timer: 'No timer — take your time to line up the tiles you want to merge.',
    lives: 'You have 3 lives — a slide that moves nothing costs no life, but a board that is full with no two equal neighbours is stuck, and that costs one life and restarts the round with the same target.',
  }),
  'bounce-up': rules({
    howTo: 'Your little bouncer bounces all by itself — you only steer it left and right in the air. Read the question — for example, “10−3 = ?” — and steer onto the platforms that say 7. The platforms climb higher and higher, and a star platform waits at the top.',
    scoring: 'Landing on a platform with the right answer earns 10 points — one right-answer platform in every row (6 in every climb), plus the star at the top, so 70 points a round at most and the game is scored out of 700. A right-answer platform only pays the first time you land on it.',
    objective: 'Reach the star at the top of every climb without falling off the bottom of the screen, and keep your streak of climbs won in a row going.',
    controls: 'Hold the left or right arrow key (A and D work too) to steer in the air, hold the ◀ ▶ buttons under the scene, or hold the left or right side of the scene itself. The bounce is automatic — you never press anything to jump.',
    timer: 'No timer — take your time to steer onto the right platform.',
    lives: 'You have 3 lives — landing on a wrong platform breaks it but costs no life, yet falling below the bottom of the screen costs one life and ends the climb.',
  }),
  'creature-catch': rules({
    howTo: 'Three wild creatures wait in the meadow, and each one holds an answer. Read the question — for example, “2+6 = ?” — and throw your catch ball at the creature holding 8. Tap (or click) the creature, or press 1, 2, or 3. The creatures bob and wander while you aim, but the ball always flies to the creature you tapped.',
    scoring: 'Catching the creature with the right answer earns 10 points — one catch per round, so 10 points a round at most and the game is scored out of 100. Every creature you catch joins your collection.',
    objective: 'Catch the right creature in every round — and find all 12 creatures for your collection! Every creature you catch stays in your collection on this device, so come back and play again to find the ones you are still missing.',
    controls: 'Tap (or click) a creature to throw the ball at it, or press 1, 2, or 3 for the first, second, or third creature. You get one throw per round — choose carefully!',
    timer: 'No timer — take your time to pick the creature holding the right answer.',
    lives: 'You have 3 lives — a creature that breaks free costs 1 life and ends the round.',
  }),
  'paddle-goal': rules({
    howTo: 'Three goal mouths open across the top of the field, and every goal has an answer on it. Read the question — for example, “10−3 = ?” — then bounce the ball up into the goal that says the right answer, 7. Slide the paddle along the bottom to keep the ball up. A ball that reaches the top between the goals bounces back down off the wall, so you keep rallying until the ball finds a mouth.',
    scoring: 'Scoring in the goal with the right answer earns 10 points — one goal per round, so 10 points a round at most and the game is scored out of 100.',
    objective: 'Score in the right-answer goal in every round without running out of lives.',
    controls: 'Move your mouse or drag your finger across the field to slide the paddle — or use the left/right arrow keys (A and D work too). Press Space, tap the field, or press the LAUNCH button to send the ball up. The ◀ ▶ buttons slide the paddle too.',
    timer: 'No timer — take your time to aim the ball at the right goal.',
    lives: 'You have 3 lives — a ball that falls past the paddle is lost, but costs no life; spending all 3 balls in a round without scoring the right goal costs one life and ends the round.',
  }),
  'snooker-quiz': rules({
    howTo: 'Four balls sit on the green snooker table, and each one holds an answer. Read the question — for example, “2+6 = ?” — and pot the ball holding 8. Tap (or click) the ball, or press 1, 2, 3, or 4. The white cue ball rolls to the ball you tapped.',
    scoring: 'Potting the ball with the right answer is a red and earns 10 points. Then you pick any colour ball for bonus points — yellow 2, green 3, brown 4, blue 5, pink 6, black 7 — so 17 points a round at most and the game is scored out of 170. The colour pick is a reward, never a test: it can only add points.',
    objective: 'Pot the right ball in every round — and pick the black ball (worth 7) whenever you can for the biggest bonus!',
    controls: 'Tap (or click) a ball to pot it, or press 1, 2, 3, or 4 for the first, second, third, or fourth ball. After a red, tap a colour ball — or press 1 to 6 — to pot it for bonus points. You get one pot per round — choose carefully!',
    timer: 'No timer — take your time to pick the ball holding the right answer.',
    lives: 'You have 3 lives — potting a wrong ball is a miss: it costs 1 life and ends the round.',
  }),
  'pattern-echo': rules({
    howTo: 'First, read the question — for example, “2+6 = ?” — and tap the pad holding the right answer (8). Answering correctly reveals the pattern: the four pads light up one by one, each with its own sound — Ruby is low, Sunny a little higher, Leafy higher still, and Sky the highest. Watch and listen, then tap the pads back in the same order.',
    scoring: 'Repeating a round’s pattern exactly earns 10 points — one pattern per round, so 10 points a round at most and the game is scored out of 100.',
    objective: 'Echo every pattern, exactly as it played — and listen as the patterns grow longer!',
    controls: 'Tap (or click) a pad, or press 1, 2, 3, or 4 for the first, second, third, or fourth pad.',
    timer: 'No timer — take your time to watch the pattern and tap it back.',
    lives: 'There are no lives to lose in this game — a wrong tap just replays the pattern, with no points lost.',
  }),
  'bomb-maze': rules({
    howTo: 'Steer your explorer through the maze to the golden goal at the far end. Gold stars in the maze show answers — read the question, for example, “2+6 = ?”, and collect the star with 8. That opens the golden goal, and then you run to the big gold star to win the maze. Sleepy bombs sit in the maze too — tiptoe around them, because touching one bounces you gently back to the start.',
    scoring: 'Reaching the open golden goal earns 10 points — one goal per round, so 10 points a round at most and the game is scored out of 100. Wrong stars and sleepy bombs earn no points — and cost no lives either.',
    objective: 'Collect the right star in every round, reach the golden goal, and keep your lives — all while tiptoeing around the sleepy bombs.',
    controls: 'Arrow keys or WASD on a keyboard, or the on-screen arrow pad below the maze on a phone or tablet. Dark squares are walls — you cannot walk through them, and bumping one costs nothing. The golden goal stays locked until you collect the right star.',
    timer: '45 seconds per maze — you hear one warning when 5 seconds are left. The timer pauses when you pause the game or re-read these instructions.',
    lives: 'You have 3 lives — a wrong star just pops with a gentle “oops” and costs no life, and a sleepy bomb just bounces you back to the start with no life lost. Only running out of time costs 1 life and ends the round.',
  }),
}

export interface TypeIntro {
  slug: string
  name: string
  icon: string
  desc: string
  rules: TypeIntroRules
}

/** The intro for a type: name + icon + desc from the shared meta,
 *  rules from the table above. An unknown slug falls back to the
 *  generic lines — never a crash, never an invented rule. */
export function typeIntro(slug: string, itemCount: number): TypeIntro {
  const meta = ACTIVITY_TYPE_META.find((t) => t.slug === slug) ?? {
    slug,
    icon: '🎮',
    name: 'Game',
    desc: 'Play and learn',
  }
  const found = RULES[slug]
  const base = found ?? rules({
    howTo: meta.desc,
    objective: 'Play every round and do your best.',
    controls: 'Follow what the screen shows — tap, drag, or type.',
  })
  const count = Math.max(1, itemCount)
  // Quiz is the only type whose scoring line names the total: the
  // game is scored out of 10 points per question, so the total is
  // 10 x the real question count — never a guessed number.
  const scoring =
    slug === 'quiz'
      ? `Each correct answer earns 10 points. The game is scored out of ${count * 10} (${count} ${count === 1 ? 'question' : 'questions'}). Wrong answers and time-ups earn no points.`
      : base.scoring
  return {
    slug,
    name: meta.name,
    icon: meta.icon,
    desc: meta.desc,
    rules: { ...base, scoring },
  }
}
