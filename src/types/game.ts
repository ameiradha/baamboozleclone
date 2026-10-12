export type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'short_answer'
  | 'text'
  | 'image'
  | 'special';

export type SpecialCardType =
  | 'steal'
  | 'swap'
  | 'bonus'
  | 'double'
  | 'lose_points'
  | 'reset'
  | 'random_bonus'
  | 'skip'
  | 'free_choice'
  | 'rival_penalty';

export interface McqOption {
  id: string; // e.g., 'opt_1', 'opt_2'
  text: string;
  imageUrl?: string;
}

export interface Question {
  id: string;
  gameId: string;
  order: number;
  question: string;
  type: QuestionType;
  points: number;
  timer: number; // in seconds, 0 = no timer
  imageUrl?: string;
  // MCQ & True/False
  options?: McqOption[];
  correctOptionId?: string; // option id that is correct
  // Short Answer
  correctAnswerText?: string;
  // Special card
  specialType?: SpecialCardType;
  specialValue?: number; // for bonus, steal default, etc.
  explanation?: string;
}

export interface GameSettings {
  enableTimer: boolean;
  defaultTimerSeconds: number;
  enablePowerUps: boolean;
  enableSpecialCards: boolean;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  enableSounds: boolean;
  allowNegativeScores: boolean;
  automaticScoring: boolean;
  enableConfetti: boolean;
  cardsPerTeamMultiplier?: 2 | 3 | 10;
  allowedSpecialTypes?: SpecialCardType[];
}

export interface Game {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  topic: string;
  ownerId: string;
  ownerName: string;
  visibility: 'public' | 'private';
  coverImage?: string;
  settings: GameSettings;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
  playsCount?: number;
}

export interface Team {
  id: string;
  name: string;
  color: string; // Hex or Tailwind class
  avatar: string; // Emoji or icon key
  score: number;
  lastScoreChange?: number;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  avatar: string;
  joinedAt: number;
  isHost?: boolean;
}

export type SessionStatus =
  | 'waiting'
  | 'lobby'
  | 'playing'
  | 'question_open'
  | 'answering'
  | 'answer_locked'
  | 'answer_revealed'
  | 'scoring'
  | 'board'
  | 'finished';

export interface PlayerAnswerSubmission {
  playerId: string;
  playerName: string;
  teamId: string;
  questionId?: string;
  selectedOptionId?: string;
  textAnswer?: string;
  submittedAt: number;
  isCorrect?: boolean;
}

export interface GameSession {
  id: string;
  pin: string;
  gameId: string;
  gameTitle: string;
  hostId: string;
  hostName: string;
  status: SessionStatus;
  currentQuestionId?: string | null;
  currentQuestionNumber?: number;
  currentTeamId?: string | null;
  answeredQuestionIds: string[];
  skippedQuestionIds: string[];
  teams: Team[];
  players: Player[];
  timerRemaining?: number;
  isTimerRunning?: boolean;
  answersRevealed?: boolean;
  currentQuestionDoublePoints?: boolean;
  playerAnswers?: Record<string, PlayerAnswerSubmission>; // keyed by playerId
  startedAt: number;
  updatedAt: number;
  settings: GameSettings;
}

export interface GameAction {
  id: string;
  sessionId: string;
  type:
    | 'question_score'
    | 'manual_score'
    | 'steal_points'
    | 'swap_points'
    | 'bonus_points'
    | 'lose_points'
    | 'reset_score'
    | 'random_bonus'
    | 'skip_question';
  teamId: string;
  teamName: string;
  targetTeamId?: string;
  targetTeamName?: string;
  amount: number;
  previousScore: number;
  newScore: number;
  description: string;
  questionId?: string;
  questionNumber?: number;
  timestamp: number;
}

export interface QuestionStat {
  questionId: string;
  questionText: string;
  type: QuestionType;
  attemptsCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracyPercentage: number;
  optionDistribution?: Record<string, number>;
}

export interface GameResult {
  id: string;
  sessionId: string;
  gameId: string;
  gameTitle: string;
  hostId: string;
  hostName: string;
  teams: Team[];
  playersCount: number;
  winnerTeam: Team;
  totalQuestions: number;
  questionsAnswered: number;
  totalPointsAwarded: number;
  totalPowerUpsUsed: number;
  questionStats: QuestionStat[];
  playedAt: string;
  durationMinutes: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'teacher' | 'admin';
  createdAt: string;
}
