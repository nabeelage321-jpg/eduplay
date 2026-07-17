// src/lib/game/utils.ts

import type {
  GameSession,
  PlayerScore,
  GameModeType,
  GameModeConfig,
} from './types';

export const GAME_MODE_CONFIGS: Record<GameModeType, GameModeConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Standard quiz mode with speed bonus',
    maxPlayers: 200,
    minPlayers: 1,
    timePerQuestion: 30,
    supportsTeams: false,
    supportsLives: false,
    supportsPowerUps: false,
  },
  'team-battle': {
    id: 'team-battle',
    name: 'Team Battle',
    description: 'Split into teams and compete',
    maxPlayers: 200,
    minPlayers: 4,
    timePerQuestion: 30,
    supportsTeams: true,
    supportsLives: false,
    supportsPowerUps: false,
  },
  'tower-defense': {
    id: 'tower-defense',
    name: 'Tower Defense',
    description: 'Build tower with correct answers',
    maxPlayers: 50,
    minPlayers: 1,
    timePerQuestion: 30,
    supportsTeams: false,
    supportsLives: false,
    supportsPowerUps: false,
  },
  'battle-royale': {
    id: 'battle-royale',
    name: 'Battle Royale',
    description: 'Wrong answer = eliminated',
    maxPlayers: 50,
    minPlayers: 2,
    timePerQuestion: 20,
    supportsTeams: false,
    supportsLives: true,
    supportsPowerUps: false,
  },
  racing: {
    id: 'racing',
    name: 'Racing',
    description: 'Race to the finish with correct answers',
    maxPlayers: 50,
    minPlayers: 2,
    timePerQuestion: 25,
    supportsTeams: false,
    supportsLives: false,
    supportsPowerUps: false,
  },
  'speed-mode': {
    id: 'speed-mode',
    name: 'Speed Mode',
    description: '5 seconds per question, double points',
    maxPlayers: 100,
    minPlayers: 1,
    timePerQuestion: 5,
    supportsTeams: false,
    supportsLives: false,
    supportsPowerUps: false,
  },
  economy: {
    id: 'economy',
    name: 'Economy',
    description: 'Earn coins, buy power-ups',
    maxPlayers: 100,
    minPlayers: 1,
    timePerQuestion: 30,
    supportsTeams: false,
    supportsLives: false,
    supportsPowerUps: true,
  },
  survival: {
    id: 'survival',
    name: 'Survival',
    description: '3 lives, one wrong answer = lost life',
    maxPlayers: 50,
    minPlayers: 1,
    timePerQuestion: 30,
    supportsTeams: false,
    supportsLives: true,
    supportsPowerUps: false,
  },
  'relay-race': {
    id: 'relay-race',
    name: 'Relay Race',
    description: 'Each player answers 1 question in order',
    maxPlayers: 12,
    minPlayers: 2,
    timePerQuestion: 30,
    supportsTeams: true,
    supportsLives: false,
    supportsPowerUps: false,
  },
  'blind-mode': {
    id: 'blind-mode',
    name: 'Blind Mode',
    description: 'Scores hidden until game ends',
    maxPlayers: 100,
    minPlayers: 2,
    timePerQuestion: 30,
    supportsTeams: false,
    supportsLives: false,
    supportsPowerUps: false,
  },
};

/**
 * Check if enough players to start game
 */
export function canStartGame(
  players: PlayerScore[],
  mode: GameModeType
): boolean {
  const config = GAME_MODE_CONFIGS[mode];
  return (
    players.length >= config.minPlayers && players.length <= config.maxPlayers
  );
}

/**
 * Create empty player score record
 */
export function createPlayerScore(
  playerId: string,
  nickname: string
): PlayerScore {
  return {
    playerId,
    nickname,
    totalScore: 0,
    rank: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    lives: 3,
    coins: 0,
    isEliminated: false,
    joinedAt: Date.now(),
  };
}

/**
 * Split players into teams by round-robin
 */
export function splitIntoTeams(
  players: PlayerScore[],
  teamCount: number
): Map<string, PlayerScore[]> {
  const teams = new Map<string, PlayerScore[]>();

  // Create team IDs
  for (let i = 0; i < teamCount; i++) {
    teams.set(`team-${i}`, []);
  }

  // Round-robin distribution
  players.forEach((player, index) => {
    const teamKey = `team-${index % teamCount}`;
    teams.get(teamKey)?.push(player);
  });

  return teams;
}

/**
 * Calculate average accuracy for player
 */
export function calculateAccuracy(player: PlayerScore): number {
  if (player.questionsAnswered === 0) return 0;
  return (player.correctAnswers / player.questionsAnswered) * 100;
}

/**
 * Calculate accuracy for all players
 */
export function calculateLeaderboardStats(
  players: PlayerScore[]
): Array<PlayerScore & { accuracy: number }> {
  return players.map((player) => ({
    ...player,
    accuracy: calculateAccuracy(player),
  }));
}

/**
 * Validate answer selection
 */
export function isValidAnswer(
  answer: string,
  options: string[]
): boolean {
  return options.includes(answer);
}

/**
 * Export session results as CSV-compatible format
 */
export function formatSessionResultsForExport(
  players: PlayerScore[],
  sessionId: string,
  activityTitle: string
): string {
  const headers = [
    'Rank',
    'Nickname',
    'Total Score',
    'Correct Answers',
    'Accuracy %',
    'Questions Answered',
  ].join(',');

  const rows = players
    .sort((a, b) => a.rank - b.rank)
    .map((player) => {
      const accuracy = calculateAccuracy(player);
      return [
        player.rank,
        `"${player.nickname}"`,
        player.totalScore,
        player.correctAnswers,
        accuracy.toFixed(1),
        player.questionsAnswered,
      ].join(',');
    });

  const csv = [
    `Session ID: ${sessionId}`,
    `Activity: ${activityTitle}`,
    `Exported: ${new Date().toISOString()}`,
    '',
    headers,
    ...rows,
  ].join('\n');

  return csv;
}

/**
 * Check if all players in relay race have answered
 */
export function hasAllPlayersAnswered(
  currentIndex: number,
  totalPlayers: number
): boolean {
  // In relay race, only current player answers
  return currentIndex < totalPlayers;
}

/**
 * Get relay race current player
 */
export function getCurrentRelayPlayer(
  questionIndex: number,
  players: PlayerScore[]
): PlayerScore | null {
  if (questionIndex >= players.length) return null;
  return players[questionIndex];
}

/**
 * Validate room code format (6 digits)
 */
export function isValidRoomCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Get game mode name in locale (fallback to English)
 */
export function getGameModeName(
  mode: GameModeType,
  locale: string = 'en'
): string {
  const config = GAME_MODE_CONFIGS[mode];
  // In real implementation, would have i18n translations
  // For now, return English name
  return config.name;
}

/**
 * Check if player is eliminated (Battle Royale)
 */
export function isPlayerEliminated(player: PlayerScore): boolean {
  return player.isEliminated === true;
}

/**
 * Count active players (not eliminated)
 */
export function countActivePlayers(players: PlayerScore[]): number {
  return players.filter((p) => !isPlayerEliminated(p)).length;
}

/**
 * Get next question index
 */
export function getNextQuestionIndex(current: number, total: number): number {
  return Math.min(current + 1, total);
}

/**
 * Calculate time per question based on mode
 */
export function getTimePerQuestion(mode: GameModeType): number {
  return GAME_MODE_CONFIGS[mode].timePerQuestion * 1000; // Convert to milliseconds
}
