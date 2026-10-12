import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Clock,
  Zap,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Eye,
  Maximize,
  Minimize,
  History,
  Volume2,
  VolumeX,
  Play,
  Pause,
  HelpCircle,
  X,
  Check,
  Flame,
  Gift,
  Bomb,
  Dices,
  Swords,
  Shield,
  Crown,
} from 'lucide-react';
import {
  Game,
  GameSession,
  Question,
  Team,
  GameAction,
  GameResult,
  SpecialCardType,
} from '../../types/game';
import { GameService } from '../../services/gameService';
import { ScoreService } from '../../services/scoreService';
import { sound } from '../../services/soundService';
import { triggerConfetti } from '../common/Confetti';
import { ConfirmModal } from '../common/ConfirmModal';
import { AnimatedScoreCounter } from '../common/AnimatedScoreCounter';

interface LiveGameHostProps {
  session: GameSession;
  game: Game;
  onGameFinished: (result: GameResult) => void;
  onExitGame: () => void;
}

// Helper to shuffle cards and randomly insert/intersperse special/power cards across any card numbers
// Strictly doubles or triples the cards according to the number of teams
function buildMysteryDeck(
  rawQuestions: Question[],
  teamCount: number = 4,
  multiplier: number = 3
): Question[] {
  if (!rawQuestions || rawQuestions.length === 0) return [];

  // Support playing full custom or AI-generated quiz decks (up to 100 questions)
  const validMultiplier = multiplier === 10 ? 10 : multiplier === 2 ? 2 : 3;
  const targetCount = Math.max(rawQuestions.length, teamCount * validMultiplier, 4);

  // If questions are fewer than targetCount, clone questions so every card position has a question
  const pool: Question[] = [];
  let cycle = 1;
  while (pool.length < targetCount) {
    for (const q of rawQuestions) {
      if (pool.length >= targetCount) break;
      pool.push({
        ...q,
        id: cycle === 1 ? q.id : `${q.id}_c${cycle}`,
      });
    }
    cycle++;
  }

  // Shuffle the pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Take exact targetCount cards
  let deck = pool.slice(0, targetCount);

  // High-Energy Surprise Power-Up Cards Pool
  // Diverse, high-stakes game-changing abilities to make the quiz thrilling and unpredictable!
  const powerUpsPool: {
    type: SpecialCardType;
    question: string;
    explanation: string;
    pts: number;
  }[] = [
    {
      type: 'steal',
      question: '⚡ STEAL 20 POINTS! Choose a rival team and steal 20 points!',
      explanation: 'Take 20 points directly from any opponent team! (Can subtract into negative numbers!)',
      pts: 20,
    },
    {
      type: 'steal',
      question: '⚡ MEGA STEAL 25 POINTS! Strike a rival team for 25 points!',
      explanation: 'A devastating strike! Steal 25 points from any rival to rocket up the leaderboard.',
      pts: 25,
    },
    {
      type: 'swap',
      question: '🔄 SCORE SWAP! Trade score totals between any two teams!',
      explanation: 'Pick two teams to exchange their total scores. A complete game changer!',
      pts: 0,
    },
    {
      type: 'bonus',
      question: '🎁 LUCKY BONUS! Free +25 points awarded directly to your team!',
      explanation: 'Lady luck smiles on your team! Collect 25 free points instantly.',
      pts: 25,
    },
    {
      type: 'bonus',
      question: '🎉 JACKPOT WIN! Huge +35 points prize straight to your team!',
      explanation: 'Maximum excitement! An instant +35 points massive boost.',
      pts: 35,
    },
    {
      type: 'double',
      question: '✨ 2X DOUBLE POINTS ACTIVATED! Next turn awards double points!',
      explanation: 'High stakes mode! The next card or answer will award double points.',
      pts: 0,
    },
    {
      type: 'lose_points',
      question: '💣 TRAP BOMB! Boom! Your team gets a 15-point penalty!',
      explanation: 'Oh no! A trap was triggered! Your team loses 15 points (negative scores allowed).',
      pts: -15,
    },
    {
      type: 'rival_penalty',
      question: '💥 RIVAL STRIKE! Target any rival team to slash 20 points off their score!',
      explanation: 'Choose a threatening opponent and deduct 20 points from their balance.',
      pts: -20,
    },
    {
      type: 'random_bonus',
      question: '🎲 MYSTERY CRATE! Roll the dice for surprise bonus points (up to +50)!',
      explanation: 'Open the mystery crate to see what fortune awaits your team (10 to 50 points)!',
      pts: 0,
    },
    {
      type: 'free_choice',
      question: '🌟 WILD CARD! Choose: Claim free +30 points OR steal 20 points from a rival!',
      explanation: 'Ultimate freedom! Pick the winning move that helps your team the most.',
      pts: 30,
    },
    {
      type: 'bonus',
      question: '🛡️ SHIELD BOOST! Safe defense power-up +15 points bonus!',
      explanation: 'Fortify your team with an automatic +15 bonus points.',
      pts: 15,
    },
    {
      type: 'steal',
      question: '⚡ SNEAK ATTACK! Steal 15 points from any rival team!',
      explanation: 'A quick sneak strike! Steal 15 points to boost your lead.',
      pts: 15,
    },
  ];

  // User Request: "perbanyakkan kad powerups supaya lebih seronok berbanding kad soalan"
  // Make power-ups the strong majority (~60% of all cards on the board!) so power-up cards
  // distinctly outnumber plain question cards!
  const powersCount = Math.min(
    targetCount - 1,
    Math.max(Math.ceil(targetCount * 0.6), Math.floor(targetCount / 2) + 1)
  );

  // Randomize the powerups pool so each game gets an unpredictable varied selection
  const shuffledPowers = [...powerUpsPool].sort(() => Math.random() - 0.5);

  for (let p = 0; p < powersCount; p++) {
    const pInfo = shuffledPowers[p % shuffledPowers.length];
    deck[p] = {
      id: `spec_${pInfo.type}_${Date.now()}_${p}_${Math.random().toString(36).substring(2, 6)}`,
      gameId: deck[0]?.gameId || 'game',
      order: 0,
      question: pInfo.question,
      type: 'special',
      specialType: pInfo.type,
      points: pInfo.pts,
      timer: 0,
      explanation: pInfo.explanation,
    };
  }

  // Fisher-Yates shuffle: thoroughly randomize card positions so special/power cards
  // appear at completely unpredictable card numbers!
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Re-number 1 to N so all cards show standard sequential numbers
  return deck.map((card, idx) => ({
    ...card,
    order: idx + 1,
  }));
}

export const LiveGameHost: React.FC<LiveGameHostProps> = ({
  session: initialSession,
  game,
  onGameFinished,
  onExitGame,
}) => {
  const [session, setSession] = useState<GameSession>(initialSession);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [currentTurnTeamId, setCurrentTurnTeamId] = useState<string>(
    initialSession.teams[0]?.id || ''
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPowerUpsModal, setShowPowerUpsModal] = useState(false);
  const [showRandomBonusAnim, setShowRandomBonusAnim] = useState<number | null>(null);
  const [isMobileScreen, setIsMobileScreen] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Deck of cards with count strictly double or triple by the number of teams
  const [boardCards] = useState<Question[]>(() =>
    buildMysteryDeck(
      game.questions || [],
      initialSession.teams.length,
      initialSession.settings?.cardsPerTeamMultiplier || 3
    )
  );

  // Timer states
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerIntervalRef = useRef<any>(null);

  // Power-up confirmation modals
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmVariant?: 'danger' | 'warning' | 'primary' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Action history for undo
  const [actionHistory, setActionHistory] = useState<GameAction[]>([]);

  // Selected option & outcome for active question (direct click scoring for MCQ/True-False)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [optionOutcome, setOptionOutcome] = useState<'correct' | 'wrong' | null>(null);
  const [earnedPoints, setEarnedPoints] = useState<number>(0);

  // In-card special power execution state
  const [specialExecuted, setSpecialExecuted] = useState(false);
  const [specialStealTarget, setSpecialStealTarget] = useState<string>('');
  const [specialSwapTargetA, setSpecialSwapTargetA] = useState<string>('');
  const [specialSwapTargetB, setSpecialSwapTargetB] = useState<string>('');

  // Shuffled options map for questions with randomizeAnswers enabled
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState<Record<string, Question['options']>>({});

  // Realtime subscription to session updates
  useEffect(() => {
    const unsub = GameService.subscribeToSession(session.id, (updated) => {
      if (updated) {
        setSession((prev) => ({
          ...updated,
          currentQuestionId: prev.currentQuestionId ?? updated.currentQuestionId,
        }));
      }
    });

    GameService.getSessionActions(session.id).then((acts) => {
      setActionHistory(acts);
    });

    return () => {
      unsub();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [session.id]);

  // Timer tick effect
  useEffect(() => {
    if (isTimerActive && timerSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 6 && prev > 1) {
            sound.playTimerWarning();
          }
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerActive(false);
            sound.playTimesUp();
            updateSessionState({ status: 'answer_locked' });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerActive, timerSeconds]);

  // Synchronize session state helper
  const updateSessionState = async (patch: Partial<GameSession>) => {
    const updated = { ...session, ...patch, updatedAt: Date.now() };
    setSession(updated);
    await GameService.updateSession(updated);
  };

  // Open Question from board
  const handleOpenCard = async (q: Question) => {
    sound.playCardSelect();

    // Check if randomize answers is enabled
    let displayOptions = q.options;
    if (session.settings?.randomizeAnswers && q.options && q.options.length > 2) {
      if (!shuffledOptionsMap[q.id]) {
        const shuffled = [...q.options].sort(() => Math.random() - 0.5);
        displayOptions = shuffled;
        setShuffledOptionsMap((prev) => ({ ...prev, [q.id]: shuffled }));
      } else {
        displayOptions = shuffledOptionsMap[q.id];
      }
    }

    setActiveQuestion(q);
    setSelectedOptionId(null);
    setOptionOutcome(null);
    setEarnedPoints(0);
    setSpecialExecuted(false);

    // Default target teams for special cards
    const otherTeams = session.teams.filter((t) => t.id !== currentTurnTeamId);
    setSpecialStealTarget(otherTeams[0]?.id || session.teams[0]?.id || '');
    setSpecialSwapTargetA(currentTurnTeamId);
    setSpecialSwapTargetB(otherTeams[0]?.id || session.teams[1]?.id || session.teams[0]?.id || '');

    // If it is a special card, surprise sound + confetti!
    if (q.type === 'special') {
      sound.playBonus();
      if (session.settings?.enableConfetti) {
        triggerConfetti('cannon');
      }
    }

    const qTimer =
      q.type === 'special'
        ? 0
        : q.timer ||
          (session.settings?.enableTimer ? session.settings?.defaultTimerSeconds || 25 : 0);
    setTimerSeconds(qTimer);
    setIsTimerActive(qTimer > 0);

    const updated: Partial<GameSession> = {
      status: 'question_open',
      currentQuestionId: q.id,
      currentQuestionNumber: q.order || 1,
      currentTeamId: currentTurnTeamId,
      answersRevealed: q.type === 'special',
      timerRemaining: qTimer,
      isTimerRunning: qTimer > 0,
      playerAnswers: {},
    };

    await updateSessionState(updated);
  };

  // Timer controls
  const handleStartTimer = () => {
    sound.playClick();
    setIsTimerActive(true);
    updateSessionState({ isTimerRunning: true });
  };

  const handlePauseTimer = () => {
    sound.playClick();
    setIsTimerActive(false);
    updateSessionState({ isTimerRunning: false });
  };

  const handleResetTimer = () => {
    sound.playClick();
    const orig = activeQuestion?.timer || 30;
    setTimerSeconds(orig);
    setIsTimerActive(false);
    updateSessionState({ timerRemaining: orig, isTimerRunning: false });
  };

  // Reveal Answer
  const handleRevealAnswer = async () => {
    sound.playClick();
    setIsTimerActive(false);
    await updateSessionState({
      answersRevealed: true,
      status: 'answer_revealed',
    });
  };

  // Score Awarding (for manual types: short answer, text)
  const handleAwardScore = async (isCorrect: boolean, overridePoints?: number) => {
    if (!activeQuestion) return;

    setIsTimerActive(false);
    let points = overridePoints !== undefined ? overridePoints : activeQuestion.points;
    if (session.currentQuestionDoublePoints) {
      points *= 2;
    }

    if (isCorrect) {
      sound.playCorrect();
      if (session.settings?.enableConfetti) {
        triggerConfetti('cannon');
      }
    } else {
      sound.playIncorrect();
      points = session.settings?.allowNegativeScores ? -points : 0;
    }

    setOptionOutcome(isCorrect ? 'correct' : 'wrong');
    setEarnedPoints(points);

    const { updatedSession, recordedActions } = ScoreService.modifyPoints(
      session,
      currentTurnTeamId,
      points,
      'question_score',
      `Card ${activeQuestion.order || 1}: ${isCorrect ? 'Correct (+' + points + ')' : 'Incorrect (0)'}`,
      activeQuestion.id,
      activeQuestion.order || 1
    );

    const nextAnswered = Array.from(new Set([...session.answeredQuestionIds, activeQuestion.id]));
    const updated: Partial<GameSession> = {
      ...updatedSession,
      answeredQuestionIds: nextAnswered,
      answersRevealed: true,
      status: 'answer_revealed',
      isTimerRunning: false,
      timerRemaining: 0,
    };

    setSession(updated as GameSession);
    await GameService.updateSession(updated as GameSession);

    if (recordedActions[0]) {
      await GameService.recordAction(recordedActions[0]);
      setActionHistory((prev) => [...prev, recordedActions[0]]);
    }
  };

  // Direct Option Click Scoring for MCQ & True/False
  const handleSelectOption = async (optId: string) => {
    if (!activeQuestion) return;
    if (session.answersRevealed || selectedOptionId) return;

    setIsTimerActive(false);
    setSelectedOptionId(optId);

    const isCorrect = optId === activeQuestion.correctOptionId;
    setOptionOutcome(isCorrect ? 'correct' : 'wrong');

    let points = activeQuestion.points;
    if (session.currentQuestionDoublePoints) {
      points *= 2;
    }

    if (isCorrect) {
      sound.playCorrect();
      if (session.settings?.enableConfetti) {
        triggerConfetti('cannon');
      }
      setEarnedPoints(points);
    } else {
      sound.playIncorrect();
      points = session.settings?.allowNegativeScores ? -points : 0;
      setEarnedPoints(points);
    }

    const { updatedSession, recordedActions } = ScoreService.modifyPoints(
      session,
      currentTurnTeamId,
      points,
      'question_score',
      `Card ${activeQuestion.order || 1}: ${isCorrect ? 'Correct (+' + points + ')' : 'Incorrect (0)'}`,
      activeQuestion.id,
      activeQuestion.order || 1
    );

    const nextAnswered = Array.from(new Set([...session.answeredQuestionIds, activeQuestion.id]));
    const updated: Partial<GameSession> = {
      ...updatedSession,
      answeredQuestionIds: nextAnswered,
      answersRevealed: true,
      status: 'answer_revealed',
      isTimerRunning: false,
      timerRemaining: 0,
    };

    setSession(updated as GameSession);
    await GameService.updateSession(updated as GameSession);

    if (recordedActions[0]) {
      await GameService.recordAction(recordedActions[0]);
      setActionHistory((prev) => [...prev, recordedActions[0]]);
    }
  };

  // Continue to Board after answer or special card
  const handleContinueToBoard = async () => {
    sound.playClick();
    if (!activeQuestion) return;

    const nextAnswered = Array.from(new Set([...session.answeredQuestionIds, activeQuestion.id]));

    // Check if entire board is finished: if all cards played, finalize and show final podium/rankings!
    if (nextAnswered.length >= boardCards.length) {
      await finalizeGame();
      return;
    }

    const currentTeamIdx = session.teams.findIndex((t) => t.id === currentTurnTeamId);
    const nextTeam = session.teams[(currentTeamIdx + 1) % session.teams.length];
    const nextTeamId = nextTeam ? nextTeam.id : currentTurnTeamId;

    const finalSession: GameSession = {
      ...session,
      answeredQuestionIds: nextAnswered,
      status: 'board',
      currentQuestionId: null,
      currentQuestionDoublePoints: false,
      answersRevealed: false,
      currentTeamId: nextTeamId,
    };

    setCurrentTurnTeamId(nextTeamId);
    setActiveQuestion(null);
    setSelectedOptionId(null);
    setOptionOutcome(null);
    setEarnedPoints(0);
    setSpecialExecuted(false);

    setSession(finalSession);
    await GameService.updateSession(finalSession);
  };

  // Skip Question
  const handleSkipQuestion = async () => {
    if (!activeQuestion) return;
    sound.playClick();

    const nextSkipped = Array.from(new Set([...session.skippedQuestionIds, activeQuestion.id]));
    const nextAnswered = Array.from(new Set([...session.answeredQuestionIds, activeQuestion.id]));

    const currentTeamIdx = session.teams.findIndex((t) => t.id === currentTurnTeamId);
    const nextTeam = session.teams[(currentTeamIdx + 1) % session.teams.length];
    if (nextTeam) setCurrentTurnTeamId(nextTeam.id);

    const finalSession: GameSession = {
      ...session,
      skippedQuestionIds: nextSkipped,
      answeredQuestionIds: nextAnswered,
      status: 'board',
      currentQuestionId: null,
      currentTeamId: nextTeam?.id || null,
      currentQuestionDoublePoints: false,
      answersRevealed: false,
    };

    setSelectedOptionId(null);
    setOptionOutcome(null);
    setEarnedPoints(0);
    setSpecialExecuted(false);
    setSession(finalSession);
    setActiveQuestion(null);
    await GameService.updateSession(finalSession);
  };

  // Return to board without marking answered
  const handleBackToBoard = async () => {
    sound.playClick();
    setIsTimerActive(false);
    setActiveQuestion(null);
    setSelectedOptionId(null);
    setOptionOutcome(null);
    setEarnedPoints(0);
    setSpecialExecuted(false);
    await updateSessionState({
      status: 'board',
      currentQuestionId: null,
      answersRevealed: false,
    });
  };

  // Execute Special Card: Steal Points
  const handleExecuteInCardSteal = async () => {
    if (!specialStealTarget || specialStealTarget === currentTurnTeamId) {
      alert('Please choose an opponent team to steal from.');
      return;
    }
    const amount = activeQuestion?.points || 20;
    await executeStealPoints(currentTurnTeamId, specialStealTarget, amount);
    setSpecialExecuted(true);
  };

  // Execute Special Card: Swap Points
  const handleExecuteInCardSwap = async () => {
    if (specialSwapTargetA === specialSwapTargetB) {
      alert('Please choose two different teams to swap.');
      return;
    }
    await executeSwapPoints(specialSwapTargetA, specialSwapTargetB);
    setSpecialExecuted(true);
  };

  // Execute Special Card: Bonus Points
  const handleExecuteInCardBonus = async () => {
    const amount = activeQuestion?.points || 25;
    await executeBonusPoints(currentTurnTeamId, amount);
    setSpecialExecuted(true);
  };

  // Execute Special Card: Double Points
  const handleExecuteInCardDouble = async () => {
    sound.playBonus();
    await updateSessionState({ currentQuestionDoublePoints: true });
    setSpecialExecuted(true);
  };

  // Execute Special Card: Trap Bomb (-15 or question points)
  const handleExecuteInCardTrap = async () => {
    const penalty = Math.abs(activeQuestion?.points || 15);
    sound.playIncorrect();
    const { updatedSession, recordedActions } = ScoreService.modifyPoints(
      session,
      currentTurnTeamId,
      -penalty,
      'lose_points',
      `💣 Trap Bomb triggered! -${penalty} points to ${currentTurnTeam?.name}`
    );
    setSession(updatedSession);
    await GameService.updateSession(updatedSession);
    if (recordedActions[0]) {
      await GameService.recordAction(recordedActions[0]);
      setActionHistory((prev) => [...prev, recordedActions[0]]);
    }
    setEarnedPoints(-penalty);
    setSpecialExecuted(true);
  };

  // Execute Special Card: Rival Strike (-20 to selected rival)
  const handleExecuteInCardRivalPenalty = async () => {
    if (!specialStealTarget || specialStealTarget === currentTurnTeamId) {
      alert('Please choose an opponent team to strike.');
      return;
    }
    const penalty = Math.abs(activeQuestion?.points || 20);
    sound.playIncorrect();
    const targetTeam = session.teams.find((t) => t.id === specialStealTarget);
    const { updatedSession, recordedActions } = ScoreService.modifyPoints(
      session,
      specialStealTarget,
      -penalty,
      'lose_points',
      `💥 Rival Strike by ${currentTurnTeam?.name}! -${penalty} points to ${targetTeam?.name}`
    );
    setSession(updatedSession);
    await GameService.updateSession(updatedSession);
    if (recordedActions[0]) {
      await GameService.recordAction(recordedActions[0]);
      setActionHistory((prev) => [...prev, recordedActions[0]]);
    }
    setSpecialExecuted(true);
  };

  // Execute Special Card: Mystery Crate (Roll 10-50 points)
  const handleExecuteInCardMystery = async () => {
    const roll = (Math.floor(Math.random() * 5) + 1) * 10;
    sound.playBonus();
    if (session.settings?.enableConfetti) triggerConfetti('cannon');
    const { updatedSession, recordedActions } = ScoreService.modifyPoints(
      session,
      currentTurnTeamId,
      roll,
      'random_bonus',
      `🎲 Mystery Crate rolled +${roll} points for ${currentTurnTeam?.name}!`
    );
    setSession(updatedSession);
    await GameService.updateSession(updatedSession);
    if (recordedActions[0]) {
      await GameService.recordAction(recordedActions[0]);
      setActionHistory((prev) => [...prev, recordedActions[0]]);
    }
    setEarnedPoints(roll);
    setSpecialExecuted(true);
  };

  // Execute Special Card: Free Choice Bonus (+30)
  const handleExecuteInCardFreeChoiceBonus = async () => {
    await executeBonusPoints(currentTurnTeamId, 30);
    setSpecialExecuted(true);
  };

  // Execute Special Card: Free Choice Steal (20 from rival)
  const handleExecuteInCardFreeChoiceSteal = async () => {
    if (!specialStealTarget || specialStealTarget === currentTurnTeamId) {
      alert('Please choose an opponent team to steal from.');
      return;
    }
    await executeStealPoints(currentTurnTeamId, specialStealTarget, 20);
    setSpecialExecuted(true);
  };

  // Power-Up: Steal Points
  const executeStealPoints = async (sourceTeamId: string, targetTeamId: string, amount: number) => {
    const { updatedSession, recordedActions } = ScoreService.stealPoints(
      session,
      sourceTeamId,
      targetTeamId,
      amount
    );
    sound.playSteal();
    setSession(updatedSession);
    await GameService.updateSession(updatedSession);
    if (recordedActions[0]) {
      await GameService.recordAction(recordedActions[0]);
      setActionHistory((prev) => [...prev, recordedActions[0]]);
    }
  };

  // Power-Up: Swap Points
  const executeSwapPoints = async (teamAId: string, teamBId: string) => {
    const { updatedSession, recordedActions } = ScoreService.swapPoints(session, teamAId, teamBId);
    sound.playBonus();
    setSession(updatedSession);
    await GameService.updateSession(updatedSession);
    if (recordedActions[0]) {
      await GameService.recordAction(recordedActions[0]);
      setActionHistory((prev) => [...prev, recordedActions[0]]);
    }
  };

  // Power-Up: Bonus Points
  const executeBonusPoints = async (teamId: string, amount: number) => {
    const team = session.teams.find((t) => t.id === teamId);
    const { updatedSession, recordedActions } = ScoreService.modifyPoints(
      session,
      teamId,
      amount,
      'bonus_points',
      `Bonus points awarded to ${team?.name || 'Team'}`
    );
    sound.playBonus();
    if (session.settings?.enableConfetti) triggerConfetti('cannon');
    setSession(updatedSession);
    await GameService.updateSession(updatedSession);
    if (recordedActions[0]) {
      await GameService.recordAction(recordedActions[0]);
      setActionHistory((prev) => [...prev, recordedActions[0]]);
    }
  };

  // Power-Up: Random Bonus
  const executeRandomBonus = async (teamId: string) => {
    const amount = Math.floor(Math.random() * 9 + 1) * 5; // 5 to 50
    setShowRandomBonusAnim(amount);
    sound.playBonus();
    if (session.settings?.enableConfetti) triggerConfetti('cannon');

    setTimeout(async () => {
      setShowRandomBonusAnim(null);
      const team = session.teams.find((t) => t.id === teamId);
      const { updatedSession, recordedActions } = ScoreService.modifyPoints(
        session,
        teamId,
        amount,
        'random_bonus',
        `Random Mystery Bonus of +${amount} points for ${team?.name || 'Team'}`
      );
      setSession(updatedSession);
      await GameService.updateSession(updatedSession);
      if (recordedActions[0]) {
        await GameService.recordAction(recordedActions[0]);
        setActionHistory((prev) => [...prev, recordedActions[0]]);
      }
    }, 2000);
  };

  // Power-Up: Reset Score
  const executeResetScore = async (teamId: string) => {
    const { updatedSession, recordedActions } = ScoreService.resetScore(session, teamId);
    sound.playIncorrect();
    setSession(updatedSession);
    await GameService.updateSession(updatedSession);
    if (recordedActions[0]) {
      await GameService.recordAction(recordedActions[0]);
      setActionHistory((prev) => [...prev, recordedActions[0]]);
    }
  };

  // Quick manual point adjustment (+/-) for any team
  const handleQuickTeamAdjust = async (e: React.MouseEvent, teamId: string, delta: number) => {
    e.stopPropagation();
    const team = session.teams.find((t) => t.id === teamId);
    if (!team) return;
    if (delta > 0) sound.playBonus();
    else sound.playIncorrect();

    const { updatedSession, recordedActions } = ScoreService.modifyPoints(
      session,
      teamId,
      delta,
      'bonus_points',
      `Manual score adjustment (${delta > 0 ? '+' : ''}${delta}) for ${team.name}`
    );
    setSession(updatedSession);
    await GameService.updateSession(updatedSession);
    if (recordedActions[0]) {
      await GameService.recordAction(recordedActions[0]);
      setActionHistory((prev) => [...prev, recordedActions[0]]);
    }
  };

  // UNDO LAST ACTION
  const handleUndo = async () => {
    if (actionHistory.length === 0) {
      alert('No previous actions to undo.');
      return;
    }
    sound.playClick();
    const lastAction = actionHistory[actionHistory.length - 1];
    const restored = ScoreService.undoLastAction(session, lastAction);

    setSession(restored);
    setActionHistory((prev) => prev.slice(0, -1));
    await GameService.updateSession(restored);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    sound.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // End Game Prompt
  const handleEndGamePrompt = () => {
    sound.playClick();
    setConfirmModalConfig({
      isOpen: true,
      title: 'End Classroom Quiz?',
      message: 'Are you sure you want to end the game? Final team rankings and statistics will be saved.',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        await finalizeGame();
      },
    });
  };

  // Finalize Game
  const finalizeGame = async () => {
    sound.playVictory();
    if (session.settings?.enableConfetti) triggerConfetti('fireworks');

    const sortedTeams = [...session.teams].sort((a, b) => b.score - a.score);
    const winner = sortedTeams[0] || session.teams[0];

    const questionStats = boardCards.map((q) => {
      const isAnswered = session.answeredQuestionIds.includes(q.id);
      return {
        questionId: q.id,
        questionText: q.question,
        type: q.type,
        attemptsCount: isAnswered ? 1 : 0,
        correctCount: isAnswered ? 1 : 0,
        incorrectCount: 0,
        accuracyPercentage: isAnswered ? 100 : 0,
      };
    });

    const result: GameResult = {
      id: `res_${Date.now()}`,
      sessionId: session.id,
      gameId: game.id,
      gameTitle: game.title,
      hostId: session.hostId,
      hostName: session.hostName,
      teams: sortedTeams,
      playersCount: session.players.length,
      winnerTeam: winner,
      totalQuestions: boardCards.length,
      questionsAnswered: session.answeredQuestionIds.length,
      totalPointsAwarded: session.teams.reduce((acc, t) => acc + t.score, 0),
      totalPowerUpsUsed: actionHistory.filter((a) => a.type !== 'question_score').length,
      questionStats,
      playedAt: new Date().toISOString(),
      durationMinutes: Math.max(1, Math.round((Date.now() - session.startedAt) / 60000)),
    };

    await updateSessionState({ status: 'finished' });
    await GameService.saveGameResult(result);
    onGameFinished(result);
  };

  const currentTurnTeam =
    session.teams.find((t) => t.id === currentTurnTeamId) || session.teams[0];

  return (
    <div
      className={`h-screen max-h-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-indigo-500 selection:text-white ${
        isFullscreen ? 'p-2 sm:p-4' : 'p-4 sm:p-6'
      }`}
    >
      {/* Top Header Section */}
      <div className="flex flex-col gap-2 shrink-0">
        {/* Compact Utility Header Bar */}
        <div className="bg-white rounded-xl border border-slate-200/90 px-3 py-1.5 shadow-2xs flex items-center justify-between gap-3">
          {/* Game Title & Metadata */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-2xs shrink-0">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="font-bold text-xs sm:text-sm text-slate-900 truncate tracking-tight">
                {game.title}
              </h2>
              <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold border border-slate-200 shrink-0">
                PIN: {session.pin}
              </span>
              <span className="hidden sm:inline-block text-xs text-indigo-600 font-semibold shrink-0">
                {session.answeredQuestionIds.length}/{boardCards.length} Played
              </span>
            </div>
          </div>

          {/* Global Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowPowerUpsModal(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
              title="Open Power-Up Menu"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span className="hidden sm:inline">Power-Ups</span>
            </button>

            <button
              onClick={handleUndo}
              disabled={actionHistory.length === 0}
              className="p-1 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-30 text-slate-700 transition-colors border border-slate-200 cursor-pointer"
              title="Undo Last Action"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowHistoryModal(true)}
              className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 transition-colors border border-slate-200 cursor-pointer"
              title="Action Audit History"
            >
              <History className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 transition-colors border border-slate-200 cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleEndGamePrompt}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              End Game
            </button>
          </div>
        </div>

        {/* Big Classroom Team Points Display at Top */}
        <div className="flex items-stretch justify-center gap-2 sm:gap-3 overflow-x-auto max-w-full pb-0.5">
          {session.teams.map((team) => {
            const isTurn = team.id === currentTurnTeamId;
            return (
              <div
                key={team.id}
                onClick={() => setCurrentTurnTeamId(team.id)}
                className={`relative flex-1 min-w-[110px] sm:min-w-[140px] max-w-[240px] px-2.5 py-1.5 sm:py-2 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-between select-none shadow-xs ${
                  isTurn
                    ? 'border-indigo-600 bg-amber-50/80 shadow-md ring-2 ring-indigo-500/20 -translate-y-0.5'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                }`}
                style={{ borderTopColor: team.color, borderTopWidth: '4px' }}
                title={`Click to set turn to ${team.name}`}
              >
                {/* Team Name at top: team 1 */}
                <div className="flex items-center justify-center gap-1.5 w-full">
                  <span className="text-base sm:text-lg leading-none shrink-0">{team.avatar}</span>
                  <span className="font-extrabold text-xs sm:text-sm text-slate-800 truncate text-center">
                    {team.name}
                  </span>
                  {isTurn && (
                    <span className="text-[9px] font-mono font-black uppercase bg-indigo-600 text-white px-1.5 py-0.2 rounded-full shrink-0 shadow-2xs">
                      TURN
                    </span>
                  )}
                </div>

                {/* Below it: Number of points WITHOUT points word behind it! Big at top with animation! */}
                <div className="w-full flex items-center justify-between pt-0.5 px-1 gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleQuickTeamAdjust(e, team.id, -5)}
                    className="w-5 h-5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0 opacity-40 hover:opacity-100"
                    title={`Tolak -5 markah (${team.name}) - boleh jatuh negatif`}
                  >
                    -
                  </button>
                  <AnimatedScoreCounter
                    score={team.score}
                    className="font-mono font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900 tracking-tight"
                  />
                  <button
                    type="button"
                    onClick={(e) => handleQuickTeamAdjust(e, team.id, 5)}
                    className="w-5 h-5 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0 opacity-40 hover:opacity-100"
                    title={`Tambah +5 markah (${team.name})`}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main View Area: Either Question Board or Active Question */}
      <div className="flex-1 min-h-0 my-2 sm:my-3 flex items-center justify-center">
        {!activeQuestion ? (
          /* ================= QUESTION BOARD ================= */
          <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-center">
            {/* Board Subheader: Current Turn prompt */}
            <div className="mb-2 sm:mb-3 flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="text-lg leading-none">{currentTurnTeam?.avatar}</span>
                  <span>{currentTurnTeam?.name}'s Turn</span>
                </span>
                <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Power-Up Blitz! (Lebih Banyak Kad Kuasa)</span>
                </span>
                <span aria-hidden="true" className="text-slate-300 hidden md:inline">·</span>
                <span className="text-slate-500 font-medium hidden md:inline">
                  Select any card to reveal surprise power or question
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span>Progress:</span>
                <span className="font-mono font-bold text-slate-800">
                  {session.answeredQuestionIds.length} / {boardCards.length}
                </span>
              </div>
            </div>

            {/* Grid of Numbered Cards: 100% UNIFORM APPEARANCE (Special/Power cards are secretly masked!) */}
            {(() => {
              const totalCards = boardCards.length;
              let cols = 6;
              if (isMobileScreen) {
                if (totalCards <= 4) cols = totalCards;
                else if (totalCards <= 9) cols = 3;
                else if (totalCards <= 16) cols = 4;
                else cols = 5;
              } else {
                if (totalCards <= 4) cols = totalCards;
                else if (totalCards <= 8) cols = 4;
                else if (totalCards <= 15) cols = 5;
                else if (totalCards <= 24) cols = 6;
                else if (totalCards <= 35) cols = 8;
                else if (totalCards <= 48) cols = 10;
                else if (totalCards <= 80) cols = 12;
                else cols = 14;
              }

              const rows = Math.ceil(totalCards / cols);

              // Responsive scaling factors to prevent vertical overflow
              const paddingClass = isMobileScreen 
                ? 'p-1' 
                : totalCards <= 16 ? 'p-2 sm:p-3' : totalCards <= 36 ? 'p-1.5 sm:p-2' : 'p-1';
              const numberSizeClass = isMobileScreen
                ? (totalCards <= 12 ? 'text-lg' : 'text-sm')
                : (totalCards <= 16 ? 'text-2xl sm:text-3xl lg:text-4xl' : totalCards <= 36 ? 'text-lg sm:text-xl' : totalCards <= 64 ? 'text-base' : 'text-xs');
              const showSubDetails = !isMobileScreen && totalCards <= 36;

              return (
                <div
                  className="grid gap-1.5 sm:gap-2 w-full flex-1 min-h-0"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
                  }}
                >
                  {boardCards.map((q, idx) => {
                    const isAnswered = session.answeredQuestionIds.includes(q.id);
                    const isSkipped = session.skippedQuestionIds.includes(q.id);

                    return (
                      <button
                        key={q.id}
                        onClick={() => !isAnswered && handleOpenCard(q)}
                        disabled={isAnswered}
                        className={`relative h-full w-full min-h-0 min-w-0 rounded-xl sm:rounded-2xl border ${paddingClass} flex flex-col items-center justify-between transition-all duration-150 transform select-none cursor-pointer ${
                          isAnswered
                            ? 'border-slate-200/70 bg-slate-100/70 text-slate-400 cursor-not-allowed opacity-50 scale-95'
                            : 'border-slate-200/90 hover:border-indigo-600 bg-white text-slate-900 shadow-2xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      >
                        {/* Top: Points badge - Uniform style for every card */}
                        {showSubDetails && (
                          <div className="w-full flex items-center justify-between text-xs font-medium text-slate-400">
                            <span className="font-mono text-[10px] text-slate-500 font-semibold">
                              {q.points || 15}
                            </span>
                            {q.timer > 0 && (
                              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {q.timer}s
                              </span>
                            )}
                          </div>
                        )}

                        {/* Giant Card Number */}
                        <div className={`${numberSizeClass} font-mono font-bold text-slate-900 tracking-tight my-auto`}>
                          {isAnswered ? (
                            isSkipped ? '⏭️' : '✓'
                          ) : (
                            String(idx + 1).padStart(2, '0')
                          )}
                        </div>

                        {/* Bottom Label: Uniform for ALL cards */}
                        {showSubDetails && (
                          <div className="w-full text-center">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              {isAnswered
                                ? isSkipped
                                  ? 'Skipped'
                                  : 'Done'
                                : `Card ${idx + 1}`}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : (
          /* ================= ACTIVE QUESTION VIEW (Crisp, High Contrast & Viewport-Fitting) ================= */
          <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-md animate-in zoom-in-95 duration-200 text-slate-900 max-h-[calc(100vh-140px)] flex flex-col justify-between overflow-hidden">
            {/* Top Question Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-indigo-600 text-white font-mono font-bold text-base flex items-center justify-center shadow-2xs shrink-0">
                  {activeQuestion.order || 1}
                </span>
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-indigo-700">
                      Playing for {currentTurnTeam?.avatar} {currentTurnTeam?.name}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-600 font-medium">
                      Value: <strong className="font-mono font-bold text-slate-900">
                        {session.currentQuestionDoublePoints ? activeQuestion.points * 2 : activeQuestion.points} pts
                      </strong>
                    </span>
                    {session.currentQuestionDoublePoints && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-purple-700 font-bold flex items-center gap-1">
                          ✨ 2X Double Points
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Timer Controls */}
              {activeQuestion.timer > 0 && activeQuestion.type !== 'special' && (
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Clock
                    className={`w-4 h-4 ${
                      timerSeconds <= 5 ? 'text-rose-500 animate-pulse' : 'text-indigo-600'
                    }`}
                  />
                  <span
                    className={`font-mono font-bold text-xl ${
                      timerSeconds <= 5 ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {timerSeconds}s
                  </span>
                  <div className="flex items-center gap-0.5 ml-1">
                    {isTimerActive ? (
                      <button
                        onClick={handlePauseTimer}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                        title="Pause"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={handleStartTimer}
                        className="p-1 hover:bg-slate-200 rounded text-emerald-600 cursor-pointer"
                        title="Resume"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={handleResetTimer}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 cursor-pointer"
                      title="Reset"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable Center Body */}
            <div className="flex-1 overflow-y-auto pr-1 my-3 space-y-4 min-h-0">
              {/* Question visual if available */}
              {activeQuestion.imageUrl && (
                <div className="max-h-40 sm:max-h-48 rounded-xl overflow-hidden border border-slate-200 flex justify-center bg-slate-50 p-2">
                  <img
                    src={activeQuestion.imageUrl}
                    alt="Question visual"
                    className="max-h-40 sm:max-h-48 object-contain"
                  />
                </div>
              )}

              {/* Question Text */}
              {activeQuestion.type !== 'special' && (
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-snug tracking-tight select-text">
                  {activeQuestion.question}
                </h3>
              )}

              {/* SPECIAL / POWER-UP CARD REVEAL VIEW */}
              {activeQuestion.type === 'special' && (
                <div className="p-5 sm:p-7 rounded-2xl bg-amber-50/60 border border-amber-300 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto mb-2 shadow-xs">
                    <Sparkles className="w-6 h-6 fill-slate-950" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    Surprise Power-Up Card
                  </span>
                  <h4 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                    {activeQuestion.question}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 max-w-md mx-auto">
                    {activeQuestion.explanation || 'An unexpected surprise has turned the tide of the quiz battle!'}
                  </p>

                  {/* Direct Action for Special Card */}
                  {!specialExecuted ? (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-amber-200 max-w-md mx-auto text-left shadow-2xs">
                      {/* Steal Power */}
                      {(activeQuestion.specialType === 'steal' ||
                        activeQuestion.question.toLowerCase().includes('steal')) && (
                        <div className="space-y-3">
                          <label className="text-xs font-semibold text-slate-700 block">
                            Choose team to steal {activeQuestion.points || 20} points from:
                          </label>
                          <select
                            value={specialStealTarget}
                            onChange={(e) => setSpecialStealTarget(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs"
                          >
                            {session.teams
                              .filter((t) => t.id !== currentTurnTeamId)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.avatar} {t.name} ({t.score})
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={handleExecuteInCardSteal}
                            className="w-full py-2.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer"
                          >
                            ⚡ Steal {activeQuestion.points || 20} Points Now
                          </button>
                        </div>
                      )}

                      {/* Swap Power */}
                      {(activeQuestion.specialType === 'swap' ||
                        activeQuestion.question.toLowerCase().includes('swap')) && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                                Team 1:
                              </label>
                              <select
                                value={specialSwapTargetA}
                                onChange={(e) => setSpecialSwapTargetA(e.target.value)}
                                className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 font-bold text-xs"
                              >
                                {session.teams.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({t.score})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                                Team 2:
                              </label>
                              <select
                                value={specialSwapTargetB}
                                onChange={(e) => setSpecialSwapTargetB(e.target.value)}
                                className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 font-bold text-xs"
                              >
                                {session.teams.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({t.score})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <button
                            onClick={handleExecuteInCardSwap}
                            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer"
                          >
                            🔄 Swap Team Scores Now
                          </button>
                        </div>
                      )}

                      {/* Bonus Power */}
                      {(activeQuestion.specialType === 'bonus' ||
                        activeQuestion.question.toLowerCase().includes('bonus')) && (
                        <button
                          onClick={handleExecuteInCardBonus}
                          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer"
                        >
                          🎁 Award +{activeQuestion.points || 25} Points to {currentTurnTeam?.name}
                        </button>
                      )}

                      {/* Double Power */}
                      {(activeQuestion.specialType === 'double' ||
                        activeQuestion.question.toLowerCase().includes('double')) && (
                        <button
                          onClick={handleExecuteInCardDouble}
                          className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer"
                        >
                          ✨ Activate 2X Double Points
                        </button>
                      )}

                      {/* Trap Bomb */}
                      {activeQuestion.specialType === 'lose_points' && (
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-center">
                            <Bomb className="w-8 h-8 text-rose-600 mx-auto mb-1 animate-bounce" />
                            <span className="text-xs font-bold text-rose-900 block">
                              Penalty: -{Math.abs(activeQuestion.points || 15)} Points
                            </span>
                            <span className="text-[11px] text-rose-700">
                              Points will subtract directly (negative scores allowed).
                            </span>
                          </div>
                          <button
                            onClick={handleExecuteInCardTrap}
                            className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Bomb className="w-3.5 h-3.5" />
                            <span>Trigger -{Math.abs(activeQuestion.points || 15)} Penalty for {currentTurnTeam?.name}</span>
                          </button>
                        </div>
                      )}

                      {/* Rival Strike */}
                      {activeQuestion.specialType === 'rival_penalty' && (
                        <div className="space-y-3">
                          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                            <Swords className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Target an opponent to subtract {Math.abs(activeQuestion.points || 20)} points:</span>
                          </div>
                          <select
                            value={specialStealTarget}
                            onChange={(e) => setSpecialStealTarget(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs"
                          >
                            {session.teams
                              .filter((t) => t.id !== currentTurnTeamId)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.avatar} {t.name} ({t.score})
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={handleExecuteInCardRivalPenalty}
                            className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Swords className="w-3.5 h-3.5" />
                            <span>💥 Strike Rival for -{Math.abs(activeQuestion.points || 20)} Points</span>
                          </button>
                        </div>
                      )}

                      {/* Mystery Crate */}
                      {activeQuestion.specialType === 'random_bonus' && (
                        <div className="space-y-3 text-center">
                          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                            <Dices className="w-8 h-8 text-indigo-600 mx-auto mb-1 animate-pulse" />
                            <span className="text-xs font-bold text-indigo-900 block">
                              Mystery Crate of Fortune
                            </span>
                            <span className="text-[11px] text-indigo-700">
                              Roll for surprise bonus between +10 and +50 points!
                            </span>
                          </div>
                          <button
                            onClick={handleExecuteInCardMystery}
                            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Dices className="w-3.5 h-3.5" />
                            <span>🎲 Roll Mystery Crate Now</span>
                          </button>
                        </div>
                      )}

                      {/* Wild Card / Free Choice */}
                      {activeQuestion.specialType === 'free_choice' && (
                        <div className="space-y-3">
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Choose Your Winning Advantage:</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              onClick={handleExecuteInCardFreeChoiceBonus}
                              className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer flex flex-col items-center justify-center gap-1"
                            >
                              <Gift className="w-5 h-5 text-emerald-200" />
                              <span>Option A: Free +30 Points</span>
                            </button>
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-amber-900">Option B: Steal 20 from Rival:</label>
                              <select
                                value={specialStealTarget}
                                onChange={(e) => setSpecialStealTarget(e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-white border border-amber-200 font-bold text-slate-900 text-xs"
                              >
                                {session.teams
                                  .filter((t) => t.id !== currentTurnTeamId)
                                  .map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name} ({t.score})
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={handleExecuteInCardFreeChoiceSteal}
                                className="py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer"
                              >
                                ⚡ Steal 20 Points
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl max-w-md mx-auto flex items-center justify-between gap-3 animate-in zoom-in-95">
                      <div className="flex items-center gap-2 text-emerald-950">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="font-bold text-xs">
                          Power-Up applied successfully!
                        </span>
                      </div>
                      <button
                        onClick={handleContinueToBoard}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Continue ➔
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MCQ / True-False Choices */}
              {(activeQuestion.type === 'mcq' || activeQuestion.type === 'true_false') && (
                <div className="space-y-3">
                  {/* Status banner before answering */}
                  {!session.answersRevealed && (
                    <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
                      <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                        Click the answer chosen by {currentTurnTeam?.avatar} {currentTurnTeam?.name}:
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Direct Click to Score
                      </span>
                    </div>
                  )}

                  {/* Outcome result card when answered */}
                  {session.answersRevealed && optionOutcome && (
                    <div
                      className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
                        optionOutcome === 'correct'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                          : 'bg-rose-50 border-rose-300 text-rose-950'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            optionOutcome === 'correct'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {optionOutcome === 'correct' ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <XCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm sm:text-base leading-tight">
                            {optionOutcome === 'correct'
                              ? `Correct! +${earnedPoints} Points for ${currentTurnTeam?.name}`
                              : `Incorrect! 0 Points for ${currentTurnTeam?.name}`}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {optionOutcome === 'correct'
                              ? `Points added to ${currentTurnTeam?.name}'s total.`
                              : 'The correct answer is highlighted in green below.'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleContinueToBoard}
                        className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <span>Continue</span>
                        <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                      </button>
                    </div>
                  )}

                  {/* Option Choice Buttons (High Contrast, Crisp Borders, Responsive Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(shuffledOptionsMap[activeQuestion.id] || activeQuestion.options || []).map(
                      (opt, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        const isCorrect = opt.id === activeQuestion.correctOptionId;
                        const isRevealed = session.answersRevealed;
                        const isSelected = selectedOptionId === opt.id;

                        let cardStyles =
                          'border-slate-200/90 bg-white text-slate-900 hover:border-indigo-600 hover:bg-indigo-50/30 active:scale-[0.99] cursor-pointer shadow-2xs';
                        let badgeStyles = 'bg-slate-100 text-slate-700 border border-slate-200';

                        if (isRevealed) {
                          if (isCorrect) {
                            cardStyles =
                              'border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-1 ring-emerald-500 shadow-2xs';
                            badgeStyles = 'bg-emerald-600 text-white font-bold';
                          } else if (isSelected) {
                            cardStyles =
                              'border-rose-400 bg-rose-50/80 text-rose-950 ring-1 ring-rose-400 shadow-2xs';
                            badgeStyles = 'bg-rose-600 text-white font-bold';
                          } else {
                            cardStyles =
                              'border-slate-200/60 bg-slate-50/50 text-slate-400 opacity-40 cursor-not-allowed';
                            badgeStyles = 'bg-slate-100 text-slate-400 border border-slate-200';
                          }
                        }

                        return (
                          <button
                            type="button"
                            key={opt.id}
                            disabled={isRevealed}
                            onClick={() => handleSelectOption(opt.id)}
                            className={`p-3 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 text-left w-full ${cardStyles}`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 transition-colors ${badgeStyles}`}
                              >
                                {letter}
                              </span>
                              <span className="font-semibold text-base sm:text-lg text-slate-900 leading-snug">
                                {opt.text}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isRevealed && isCorrect && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  CORRECT
                                </span>
                              )}

                              {isRevealed && isSelected && !isCorrect && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  WRONG
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {/* Short Answer / Text Questions Outcome Display */}
              {(activeQuestion.type === 'short_answer' || activeQuestion.type === 'text') && (
                <div className="space-y-3">
                  {session.answersRevealed && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center">
                      <span className="text-[11px] font-bold uppercase text-emerald-800 tracking-wider">
                        Reference Answer
                      </span>
                      <h4 className="text-lg sm:text-xl font-bold text-emerald-950 mt-0.5">
                        {activeQuestion.correctAnswerText || 'Answer accepted'}
                      </h4>
                    </div>
                  )}

                  {session.answersRevealed && optionOutcome && (
                    <>
                      <div
                        className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200 ${
                          optionOutcome === 'correct'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                            : 'bg-rose-50 border-rose-300 text-rose-950'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              optionOutcome === 'correct'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {optionOutcome === 'correct' ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <XCircle className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base leading-tight">
                              {optionOutcome === 'correct'
                                ? `Correct! +${earnedPoints} Points for ${currentTurnTeam?.name}`
                                : `Incorrect! 0 Points for ${currentTurnTeam?.name}`}
                            </h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {optionOutcome === 'correct'
                                ? `Points added to ${currentTurnTeam?.name}'s total.`
                                : 'Scored as incorrect by host.'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={handleContinueToBoard}
                          className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                        >
                          <span>Continue</span>
                          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Teacher explanation if revealed */}
              {session.answersRevealed && activeQuestion.explanation && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs sm:text-sm text-indigo-950 font-normal">
                  <strong className="text-indigo-800 font-bold">Classroom Note:</strong>{' '}
                  {activeQuestion.explanation}
                </div>
              )}
            </div>

            {/* Teacher Host Control Panel for this question - Docked at bottom */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToBoard}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Board
                </button>
                <button
                  onClick={handleSkipQuestion}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors border border-slate-200 cursor-pointer"
                >
                  Skip
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {activeQuestion.type === 'mcq' || activeQuestion.type === 'true_false' ? (
                  session.answersRevealed ? (
                    <button
                      onClick={handleContinueToBoard}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Continue to Board</span>
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Click an answer card above to score</span>
                    </div>
                  )
                ) : activeQuestion.type === 'special' ? (
                  <button
                    onClick={handleContinueToBoard}
                    className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Continue to Board</span>
                    <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                  </button>
                ) : session.answersRevealed && optionOutcome ? (
                  <button
                    onClick={handleContinueToBoard}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Continue to Board</span>
                    <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                  </button>
                ) : (
                  // Non-MCQ: Manual scoring
                  <>
                    {!session.answersRevealed && (
                      <button
                        onClick={handleRevealAnswer}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Reveal Answer
                      </button>
                    )}

                    <button
                      onClick={() => handleAwardScore(false)}
                      className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Incorrect (0)
                    </button>

                    <button
                      onClick={() => handleAwardScore(true)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Correct (+
                      {session.currentQuestionDoublePoints
                        ? activeQuestion.points * 2
                        : activeQuestion.points}
                      )
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Random Bonus Celebration Overlay */}
      {showRandomBonusAnim !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in zoom-in-75 duration-300">
          <div className="text-center bg-white p-8 rounded-3xl border-2 border-amber-300 shadow-2xl">
            <Sparkles className="w-16 h-16 text-amber-500 mx-auto mb-3 animate-spin" />
            <h2 className="text-5xl sm:text-6xl font-black text-slate-900 font-fun drop-shadow-sm animate-bounce">
              +{showRandomBonusAnim} BONUS!
            </h2>
            <p className="text-base font-extrabold text-indigo-600 mt-2">Classroom Mystery Reward</p>
          </div>
        </div>
      )}

      {/* Power-Ups Modal (Clean White UI) */}
      {showPowerUpsModal && (
        <PowerUpsModal
          session={session}
          onClose={() => setShowPowerUpsModal(false)}
          onSteal={executeStealPoints}
          onSwap={executeSwapPoints}
          onBonus={executeBonusPoints}
          onRandomBonus={executeRandomBonus}
          onResetScore={executeResetScore}
          onDoublePoints={() => {
            updateSessionState({ currentQuestionDoublePoints: true });
            setShowPowerUpsModal(false);
          }}
        />
      )}

      {/* Action Audit History Modal (Clean White UI) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-lg w-full shadow-xl flex flex-col max-h-[80vh] text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Score Audit History
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {actionHistory.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">
                  No score actions recorded yet.
                </p>
              ) : (
                actionHistory
                  .slice()
                  .reverse()
                  .map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{act.description}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {act.teamName} ({act.previousScore} → {act.newScore})
                        </p>
                      </div>
                      <span
                        className={`font-mono font-bold text-sm ${
                          act.amount > 0
                            ? 'text-emerald-600'
                            : act.amount < 0
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {act.amount > 0 ? `+${act.amount}` : act.amount}
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3">
              <button
                onClick={handleUndo}
                disabled={actionHistory.length === 0}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Undo Last Action
              </button>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmVariant={confirmModalConfig.confirmVariant}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

// Power-Ups Modal sub-component with crisp White Theme
interface PowerUpsModalProps {
  session: GameSession;
  onClose: () => void;
  onSteal: (sourceId: string, targetId: string, amount: number) => void;
  onSwap: (teamAId: string, teamBId: string) => void;
  onBonus: (teamId: string, amount: number) => void;
  onRandomBonus: (teamId: string) => void;
  onResetScore: (teamId: string) => void;
  onDoublePoints: () => void;
}

const PowerUpsModal: React.FC<PowerUpsModalProps> = ({
  session,
  onClose,
  onSteal,
  onSwap,
  onBonus,
  onRandomBonus,
  onResetScore,
  onDoublePoints,
}) => {
  const [activeTab, setActiveTab] = useState<'steal' | 'swap' | 'bonus' | 'double' | 'reset'>('steal');

  const [stealSource, setStealSource] = useState(session.teams[0]?.id || '');
  const [stealTarget, setStealTarget] = useState(
    session.teams[1]?.id || session.teams[0]?.id || ''
  );
  const [stealAmount, setStealAmount] = useState(15);

  const [swapTeamA, setSwapTeamA] = useState(session.teams[0]?.id || '');
  const [swapTeamB, setSwapTeamB] = useState(
    session.teams[1]?.id || session.teams[0]?.id || ''
  );

  const [bonusTeam, setBonusTeam] = useState(session.teams[0]?.id || '');
  const [bonusAmount, setBonusAmount] = useState(20);

  const [resetTeam, setResetTeam] = useState(session.teams[0]?.id || '');

  const handleStealClick = () => {
    if (stealSource === stealTarget) {
      alert('Source and target teams must be different.');
      return;
    }
    const source = session.teams.find((t) => t.id === stealSource);
    const target = session.teams.find((t) => t.id === stealTarget);
    if (!window.confirm(`Steal ${stealAmount} points from ${target?.name} for ${source?.name}?`))
      return;
    onSteal(stealSource, stealTarget, stealAmount);
    onClose();
  };

  const handleSwapClick = () => {
    if (swapTeamA === swapTeamB) {
      alert('Please choose two different teams to swap.');
      return;
    }
    const a = session.teams.find((t) => t.id === swapTeamA);
    const b = session.teams.find((t) => t.id === swapTeamB);
    if (!window.confirm(`Swap scores between ${a?.name} (${a?.score}) and ${b?.name} (${b?.score})?`))
      return;
    onSwap(swapTeamA, swapTeamB);
    onClose();
  };

  const handleBonusClick = () => {
    onBonus(bonusTeam, bonusAmount);
    onClose();
  };

  const handleRandomBonusClick = () => {
    onRandomBonus(bonusTeam);
    onClose();
  };

  const handleResetClick = () => {
    const t = session.teams.find((x) => x.id === resetTeam);
    if (!window.confirm(`Reset ${t?.name} score to zero?`)) return;
    onResetScore(resetTeam);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-md w-full shadow-xl text-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">
              Classroom Power-Ups
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('steal')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'steal'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Steal
          </button>
          <button
            onClick={() => setActiveTab('swap')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'swap'
                ? 'bg-blue-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Swap
          </button>
          <button
            onClick={() => setActiveTab('bonus')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'bonus'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bonus
          </button>
          <button
            onClick={() => setActiveTab('double')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'double'
                ? 'bg-purple-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Double
          </button>
          <button
            onClick={() => setActiveTab('reset')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'reset'
                ? 'bg-rose-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reset
          </button>
        </div>

        {/* Tab 1: Steal */}
        {activeTab === 'steal' && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Beneficiary Team:</label>
              <select
                value={stealSource}
                onChange={(e) => setStealSource(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium"
              >
                {session.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.score})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Victim Team (to steal from):</label>
              <select
                value={stealTarget}
                onChange={(e) => setStealTarget(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium"
              >
                {session.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.score})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Points to Steal:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[10, 15, 20, 25].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStealAmount(amt)}
                    className={`py-1.5 rounded-lg font-mono font-bold cursor-pointer transition-colors ${
                      stealAmount === amt
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStealClick}
              className="w-full py-2.5 mt-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer"
            >
              Execute Steal
            </button>
          </div>
        )}

        {/* Tab 2: Swap */}
        {activeTab === 'swap' && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Team 1:</label>
              <select
                value={swapTeamA}
                onChange={(e) => setSwapTeamA(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium"
              >
                {session.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.score})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Team 2:</label>
              <select
                value={swapTeamB}
                onChange={(e) => setSwapTeamB(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium"
              >
                {session.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.score})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSwapClick}
              className="w-full py-2.5 mt-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer"
            >
              Swap Team Scores
            </button>
          </div>
        )}

        {/* Tab 3: Bonus */}
        {activeTab === 'bonus' && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Choose Team:</label>
              <select
                value={bonusTeam}
                onChange={(e) => setBonusTeam(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium"
              >
                {session.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.score})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Bonus Points Amount:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[10, 20, 25, 50].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setBonusAmount(amt)}
                    className={`py-1.5 rounded-lg font-mono font-bold cursor-pointer transition-colors ${
                      bonusAmount === amt
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={handleBonusClick}
                className="py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                Award Bonus
              </button>
              <button
                onClick={handleRandomBonusClick}
                className="py-2.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                🎲 Random Bonus
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Double Points */}
        {activeTab === 'double' && (
          <div className="space-y-4 text-xs text-center py-3">
            <Sparkles className="w-8 h-8 text-purple-600 mx-auto" />
            <p className="text-slate-600 leading-relaxed font-medium">
              Activate <strong className="text-slate-900">2X DOUBLE POINTS</strong> on the active question card. The winning team will receive twice the standard points value.
            </p>
            <button
              onClick={onDoublePoints}
              className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer"
            >
              Activate Double Points Now
            </button>
          </div>
        )}

        {/* Tab 5: Reset */}
        {activeTab === 'reset' && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Choose Team to Reset:</label>
              <select
                value={resetTeam}
                onChange={(e) => setResetTeam(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium"
              >
                {session.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.score})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleResetClick}
              className="w-full py-2.5 mt-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors cursor-pointer"
            >
              Reset Team Score to 0
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
