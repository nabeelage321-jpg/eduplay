// src/lib/game/modes/types.ts

export type GameModeType =
  | 'classic'
  | 'team-battle'
  | 'tower-defense'
  | 'battle-royale'
  | 'racing'
  | 'speed-mode'
  | 'economy'
  | 'survival'
  | 'relay-race'
  | 'blind-mode';

export interface GameModeConfig {
  id: GameModeType;
  name: string;
  description: string;
  maxPlayers: number;
  minPlayers: number;
  timePerQuestion: number; // seconds
  supportsTeams: boolean;
  supportsLives: boolean;
  supportsPowerUps: boolean;
}

export interface PlayerScore {
  playerId: string;
  nickname: string;
  totalScore: number;
  rank: number;
  questionsAnswered: number;
  correctAnswers: number;
  lives?: number;
  coins?: number;
  teamId?: string;
  isEliminated?: boolean;
  joinedAt: number;
}

export interface ScoringResult {
  points: number;
  bonus: number;
  multiplier: number;
  speedBonus: number;
  feedback: string;
}

export interface GameQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  imageUrl?: string;
  hint?: string;
  timeToDisplay: number;
}

export interface GameSession {
  id: string;
  roomCode: string;
  activityId: string;
  teacherId: string;
  mode: GameModeType;
  status: 'waiting' | 'active' | 'paused' | 'ended';
  currentQuestionIndex: number;
  totalQuestions: number;
  players: PlayerScore[];
  teams?: Map<string, string[]>;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
}

export interface AnswerSubmission {
  playerId: string;
  questionId: string;
  answer: string;
  timeTaken: number; // milliseconds
  isCorrect: boolean;
  pointsEarned: number;
}

export interface TeamScore {
  teamId: string;
  teamName: string;
  score: number;
  members: PlayerScore[];
}

export interface TournamentBracket {
  id: string;
  name: string;
  format: 'single-elimination' | 'round-robin';
  rounds: TournamentRound[];
  createdAt: number;
}

export interface TournamentRound {
  roundNumber: number;
  matches: TournamentMatch[];
}

export interface TournamentMatch {
  id: string;
  player1Id?: string;
  player2Id?: string;
  winner?: string;
  roomCode?: string;
  status: 'pending' | 'active' | 'completed';
}

export interface GameSessionResult {
  sessionId: string;
  activityId: string;
  mode: GameModeType;
  totalPlayers: number;
  questionsPlayed: number;
  finalLeaderboard: PlayerScore[];
  playedAt: number;
  duration: number;
}
