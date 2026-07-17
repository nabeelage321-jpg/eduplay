// src/lib/game/modes/scoring.ts

import type {
  GameModeType,
  ScoringResult,
  PlayerScore,
  AnswerSubmission,
  TeamScore,
} from './types';

const BASE_POINTS = 100;
const MAX_SPEED_BONUS = 50;
const QUESTION_TIME_MS = 30000; // 30 seconds default

/**
 * Classic Mode: Standard points for correct answer, speed bonus
 * - Correct: 100 base points
 * - Speed bonus: up to 50 points based on answer time
 * - Wrong: 0 points
 */
export function scoreClassic(
  isCorrect: boolean,
  timeTaken: number,
  timeLimit: number
): ScoringResult {
  if (!isCorrect) {
    return {
      points: 0,
      bonus: 0,
      multiplier: 1,
      speedBonus: 0,
      feedback: 'Incorrect. No points awarded.',
    };
  }

  const speedRatio = Math.max(0, 1 - timeTaken / timeLimit);
  const speedBonus = Math.floor(speedRatio * MAX_SPEED_BONUS);
  const points = BASE_POINTS + speedBonus;

  return {
    points,
    bonus: speedBonus,
    multiplier: 1,
    speedBonus,
    feedback: `Correct! +${points} points (${speedBonus}pt speed bonus)`,
  };
}

/**
 * Team Battle: Points go to team, shown on team score
 * - Same base scoring as classic
 * - Team multiplier: +0.2x if team size > 3 (morale bonus)
 */
export function scoreTeamBattle(
  isCorrect: boolean,
  timeTaken: number,
  timeLimit: number,
  teamSize: number
): ScoringResult {
  const classic = scoreClassic(isCorrect, timeTaken, timeLimit);
  const teamMultiplier = teamSize > 3 ? 1.2 : 1;
  const finalPoints = Math.floor(classic.points * teamMultiplier);

  return {
    ...classic,
    points: finalPoints,
    multiplier: teamMultiplier,
    feedback: `Team gets +${finalPoints} points (${teamSize} members)`,
  };
}

/**
 * Tower Defense: Correct answers add height to tower, wrong damage it
 * - Correct: +20 height per answer, +5 bonus per second remaining
 * - Wrong: -15 height (tower takes damage)
 * - Tower health ranges 0-300
 */
export function scoreTowerDefense(
  isCorrect: boolean,
  timeTaken: number,
  timeLimit: number,
  currentTowerHeight: number
): ScoringResult {
  if (isCorrect) {
    const speedBonus = Math.max(0, Math.floor((timeLimit - timeTaken) / 1000) * 5);
    const points = 20 + speedBonus;
    const newHeight = Math.min(300, currentTowerHeight + points);
    return {
      points,
      bonus: speedBonus,
      multiplier: 1,
      speedBonus,
      feedback: `Tower grows! +${points}m height. Total: ${newHeight}m`,
    };
  }

  return {
    points: -15,
    bonus: 0,
    multiplier: 1,
    speedBonus: 0,
    feedback: 'Wrong! Tower takes damage -15m',
  };
}

/**
 * Battle Royale: Wrong answer = eliminated, last player wins
 * - Correct: 100 points, stay alive
 * - Wrong: Eliminated (removed from game)
 * - Winner: 500 bonus points
 */
export function scoreBattleRoyale(
  isCorrect: boolean,
  timeTaken: number,
  timeLimit: number
): ScoringResult {
  if (isCorrect) {
    const speedBonus = Math.floor((1 - timeTaken / timeLimit) * MAX_SPEED_BONUS);
    const points = BASE_POINTS + speedBonus;
    return {
      points,
      bonus: speedBonus,
      multiplier: 1,
      speedBonus,
      feedback: `Correct! Survive +${points}pt`,
    };
  }

  return {
    points: 0,
    bonus: 0,
    multiplier: 0,
    speedBonus: 0,
    feedback: 'Eliminated! Game over for you.',
  };
}

/**
 * Racing: Correct answer moves racer forward
 * - Correct: Move 10m forward + 5m bonus per second under limit
 * - Wrong: No movement, car pauses
 * - First to finish (10 questions/3km) wins 500 bonus
 */
export function scoreRacing(
  isCorrect: boolean,
  timeTaken: number,
  timeLimit: number
): ScoringResult {
  if (isCorrect) {
    const speedBonus = Math.max(0, Math.floor((timeLimit - timeTaken) / 1000) * 5);
    const distance = 10 + speedBonus; // in 0.1km increments
    return {
      points: distance,
      bonus: speedBonus,
      multiplier: 1,
      speedBonus,
      feedback: `Car moves ${(distance / 10).toFixed(1)}km! +${distance}`,
    };
  }

  return {
    points: 0,
    bonus: 0,
    multiplier: 1,
    speedBonus: 0,
    feedback: 'Wrong answer, car pauses.',
  };
}

/**
 * Speed Mode: 5 second timer per question, all points doubled
 * - Correct: 200 points (2x multiplier)
 * - Speed bonus: up to 50 points
 * - Wrong: 0 points
 */
export function scoreSpeedMode(
  isCorrect: boolean,
  timeTaken: number,
  timeLimit: number
): ScoringResult {
  if (!isCorrect) {
    return {
      points: 0,
      bonus: 0,
      multiplier: 2,
      speedBonus: 0,
      feedback: 'Incorrect. No points in Speed Mode.',
    };
  }

  const speedRatio = Math.max(0, 1 - timeTaken / timeLimit);
  const speedBonus = Math.floor(speedRatio * MAX_SPEED_BONUS);
  const basePoints = BASE_POINTS * 2; // 200 points
  const points = basePoints + speedBonus;

  return {
    points,
    bonus: speedBonus,
    multiplier: 2,
    speedBonus,
    feedback: `Correct! +${points} points (Speed Mode 2x)`,
  };
}

/**
 * Economy Mode: Earn coins, spend on power-ups between questions
 * - Correct: +50 coins
 * - Wrong: +10 coins (consolation for trying)
 * - Power-ups cost 20-50 coins (peek hint, skip, double next)
 */
export function scoreEconomy(isCorrect: boolean): ScoringResult {
  if (isCorrect) {
    return {
      points: 50,
      bonus: 0,
      multiplier: 1,
      speedBonus: 0,
      feedback: 'Correct! +50 coins earned.',
    };
  }

  return {
    points: 10,
    bonus: 0,
    multiplier: 1,
    speedBonus: 0,
    feedback: 'Incorrect, but +10 coins for trying!',
  };
}

/**
 * Survival Mode: 3 lives, lose one per wrong answer
 * - Correct: +100 points, keep lives
 * - Wrong: Lose 1 life, 0 points
 * - Game over at 0 lives
 */
export function scoreSurvival(isCorrect: boolean): ScoringResult {
  if (isCorrect) {
    return {
      points: BASE_POINTS,
      bonus: 0,
      multiplier: 1,
      speedBonus: 0,
      feedback: `Correct! +${BASE_POINTS}pt. Lives remaining: {lives}`,
    };
  }

  return {
    points: 0,
    bonus: 0,
    multiplier: 1,
    speedBonus: 0,
    feedback: 'Wrong! Lost 1 life. {livesRemaining} remaining.',
  };
}

/**
 * Relay Race: Each player answers 1 question in sequence
 * - Correct: 150 points, passes to next player
 * - Wrong: 0 points, passes to next player
 * - Order matters: first correct answer gets highest bonus
 */
export function scoreRelayRace(
  isCorrect: boolean,
  playerPosition: number, // 1-indexed position in relay
  totalPlayers: number
): ScoringResult {
  if (!isCorrect) {
    return {
      points: 0,
      bonus: 0,
      multiplier: 1,
      speedBonus: 0,
      feedback: `Wrong answer. Passing to player ${playerPosition + 1}.`,
    };
  }

  // Earlier players in relay get higher bonus
  const positionBonus = Math.max(0, (totalPlayers - playerPosition) * 10);
  const points = 150 + positionBonus;

  return {
    points,
    bonus: positionBonus,
    multiplier: 1,
    speedBonus: 0,
    feedback: `Correct! +${points}pt. Passing to player ${playerPosition + 1}.`,
  };
}

/**
 * Blind Mode: Scores hidden until end of game
 * - Correct: +100 points (hidden from player)
 * - Wrong: 0 points (hidden from player)
 * - Player sees only "Correct" or "Incorrect" until game ends
 */
export function scoreBlindMode(isCorrect: boolean): ScoringResult {
  if (isCorrect) {
    return {
      points: BASE_POINTS,
      bonus: 0,
      multiplier: 1,
      speedBonus: 0,
      feedback: 'Correct! (Score hidden until game ends)',
    };
  }

  return {
    points: 0,
    bonus: 0,
    multiplier: 1,
    speedBonus: 0,
    feedback: 'Incorrect. (Score hidden until game ends)',
  };
}

/**
 * Route to correct scoring function based on game mode
 */
export function calculateScore(
  mode: GameModeType,
  isCorrect: boolean,
  timeTaken: number,
  timeLimit: number,
  modeSpecificData?: Record<string, unknown>
): ScoringResult {
  switch (mode) {
    case 'classic':
      return scoreClassic(isCorrect, timeTaken, timeLimit);

    case 'team-battle':
      return scoreTeamBattle(
        isCorrect,
        timeTaken,
        timeLimit,
        (modeSpecificData?.teamSize as number) || 1
      );

    case 'tower-defense':
      return scoreTowerDefense(
        isCorrect,
        timeTaken,
        timeLimit,
        (modeSpecificData?.currentTowerHeight as number) || 0
      );

    case 'battle-royale':
      return scoreBattleRoyale(isCorrect, timeTaken, timeLimit);

    case 'racing':
      return scoreRacing(isCorrect, timeTaken, timeLimit);

    case 'speed-mode':
      return scoreSpeedMode(isCorrect, timeTaken, timeLimit);

    case 'economy':
      return scoreEconomy(isCorrect);

    case 'survival':
      return scoreSurvival(isCorrect);

    case 'relay-race':
      return scoreRelayRace(
        isCorrect,
        (modeSpecificData?.playerPosition as number) || 1,
        (modeSpecificData?.totalPlayers as number) || 2
      );

    case 'blind-mode':
      return scoreBlindMode(isCorrect);

    default:
      throw new Error(`Unknown game mode: ${mode}`);
  }
}

/**
 * Rank players by score
 */
export function rankPlayers(players: PlayerScore[]): PlayerScore[] {
  return players
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
}

/**
 * Rank teams by score
 */
export function rankTeams(teams: TeamScore[]): TeamScore[] {
  return teams.sort((a, b) => b.score - a.score);
}

/**
 * Determine game winner(s)
 */
export function determineWinner(players: PlayerScore[]): PlayerScore | null {
  if (players.length === 0) return null;
  const ranked = rankPlayers(players);
  return ranked[0];
}

/**
 * Generate room code (6 digit)
 */
export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
