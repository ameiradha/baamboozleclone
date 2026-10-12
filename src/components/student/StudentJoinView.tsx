import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  User,
  Users2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  HelpCircle,
  Trophy
} from 'lucide-react';
import { GameSession, Team, Player, Question, PlayerAnswerSubmission } from '../../types/game';
import { GameService } from '../../services/gameService';
import { sound } from '../../services/soundService';
import { triggerConfetti } from '../common/Confetti';
import { AnimatedScoreCounter } from '../common/AnimatedScoreCounter';

interface StudentJoinViewProps {
  initialPin?: string;
  onExit: () => void;
}

const AVATAR_OPTIONS = ['🦁', '🐬', '🦅', '🦊', '🐼', '🐯', '🦄', '🚀', '⭐', '🔥'];

export const StudentJoinView: React.FC<StudentJoinViewProps> = ({ initialPin = '', onExit }) => {
  // Step 1: PIN
  const [pin, setPin] = useState(initialPin);
  const [session, setSession] = useState<GameSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 2: Name & Team
  const [playerName, setPlayerName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦁');

  // Step 3: Joined Player state
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);

  // Subscribe to session updates once joined
  useEffect(() => {
    if (!session) return;

    const unsub = GameService.subscribeToSession(session.id, (updated) => {
      if (updated) {
        setSession(updated);

        // Reset answer submission if a new question is opened
        if (updated.status === 'question_open') {
          // If question changed or new
          if (!hasSubmittedAnswer && updated.currentQuestionId) {
            setSelectedOptionId(null);
          }
        } else if (updated.status === 'board') {
          setHasSubmittedAnswer(false);
          setSelectedOptionId(null);
        }

        // Confetti if game finished
        if (updated.status === 'finished') {
          triggerConfetti('fireworks');
        }
      }
    });

    return () => unsub();
  }, [session?.id, hasSubmittedAnswer]);

  // Lookup PIN
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanedPin = pin.trim().toUpperCase();
    if (cleanedPin.length < 6) {
      setError('Please enter a 6-digit Game PIN.');
      return;
    }

    setLoading(true);
    try {
      const found = await GameService.findSessionByPin(cleanedPin);
      if (!found) {
        sound.playIncorrect();
        setError('Game PIN not found. Please verify with your teacher.');
        return;
      }
      sound.playClick();
      setSession(found);
      if (found.teams.length > 0) {
        setSelectedTeamId(found.teams[0].id);
      }
    } catch {
      setError('Connection failed. Please check internet access.');
    } finally {
      setLoading(false);
    }
  };

  // Complete Join
  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!playerName.trim()) {
      setError('Please enter your nickname or student name.');
      return;
    }

    setLoading(true);
    sound.playVictory();

    const newPlayer: Player = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: playerName.trim(),
      teamId: selectedTeamId || session.teams[0]?.id || 'team_1',
      avatar: selectedAvatar,
      joinedAt: Date.now(),
    };

    try {
      const updated = await GameService.joinSession(session.id, newPlayer);
      setSession(updated);
      setCurrentPlayer(newPlayer);
    } catch (err: any) {
      setError(err?.message || 'Failed to join game.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Answer choice
  const handleSelectAnswer = async (optionId: string) => {
    if (!session || !currentPlayer || hasSubmittedAnswer || session.status === 'answer_locked' || session.answersRevealed) {
      return;
    }
    sound.playClick();
    setSelectedOptionId(optionId);
    setHasSubmittedAnswer(true);

    const submission: PlayerAnswerSubmission = {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      teamId: currentPlayer.teamId,
      questionId: session.currentQuestionId || '',
      selectedOptionId: optionId,
      submittedAt: Date.now(),
    };

    await GameService.submitPlayerAnswer(session.id, submission);
  };

  // ================= VIEW: STEP 1 - ENTER PIN =================
  if (!session) {
    return (
      <div className="h-full flex items-center justify-center p-3 sm:p-4 overflow-hidden">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-7 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <KeyRound className="w-6 h-6" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Join Classroom Quiz</h1>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Enter the 6-digit Game PIN displayed on your teacher's board.
          </p>

          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerifyPin} className="space-y-3">
            <div>
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center font-mono font-bold text-2xl tracking-widest p-2.5 rounded-xl border-2 border-slate-300 focus:border-indigo-600 focus:outline-hidden text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading || pin.length < 6}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Game</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <button
            onClick={onExit}
            className="mt-3 text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ================= VIEW: STEP 2 - ENTER NAME & TEAM =================
  if (!currentPlayer) {
    return (
      <div className="h-full max-h-full flex items-center justify-center p-3 sm:p-4 overflow-hidden">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 max-w-sm w-full">
          <div className="text-center mb-3">
            <span className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              PIN: {session.pin}
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1.5">
              Choose Name & Team
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your team and avatar for the quiz battle!
            </p>
          </div>

          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoinGame} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. Ali, Aminah, Daniel"
                  className="w-full pl-9 pr-3 py-2 text-sm font-bold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Avatar</label>
              <div className="flex gap-1.5 justify-center bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                {AVATAR_OPTIONS.slice(0, 8).map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                      selectedAvatar === av
                        ? 'bg-white shadow-xs scale-105 border-2 border-indigo-500'
                        : 'hover:bg-white/80'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Team</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                {session.teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`p-2 rounded-xl border-2 font-bold text-xs flex items-center gap-2 transition-all ${
                      selectedTeamId === team.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <span className="text-base">{team.avatar}</span>
                    <span className="truncate">{team.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !playerName.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Join Quiz Room</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ================= VIEW: STEP 3 - LIVE STUDENT SCREEN =================
  const myTeam = session.teams.find((t) => t.id === currentPlayer.teamId);
  const isQuestionOpen = session.status === 'question_open' || session.status === 'answer_revealed' || session.status === 'answer_locked';

  return (
    <div className="h-full max-h-full flex flex-col justify-between p-3 sm:p-4 max-w-lg mx-auto w-full overflow-hidden">
      {/* Student Badge & Team Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 sm:p-2.5 shadow-xs shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl p-1 bg-slate-100 rounded-xl shrink-0">{currentPlayer.avatar}</span>
          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{currentPlayer.name}</h3>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block truncate"
              style={{ backgroundColor: `${myTeam?.color}20`, color: myTeam?.color }}
            >
              Player
            </span>
          </div>
        </div>

        {/* Team Points: Team name, (below it) number of points without points word! */}
        {myTeam && (
          <div
            className="flex flex-col items-center justify-center px-3 py-1 rounded-xl border border-slate-200 bg-slate-50/80 shrink-0"
            style={{ borderTopColor: myTeam.color, borderTopWidth: '3px' }}
          >
            <span className="text-[10px] font-bold text-slate-600 truncate max-w-[100px]">
              {myTeam.name}
            </span>
            <AnimatedScoreCounter
              score={myTeam.score}
              className="font-mono font-black text-xl sm:text-2xl text-slate-900 tracking-tight"
            />
          </div>
        )}

        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">PIN</span>
          <span className="font-mono font-black text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{session.pin}</span>
        </div>
      </div>

      {/* Screen Body */}
      <div className="flex-1 min-h-0 my-2 sm:my-3 flex flex-col justify-center">
        {session.status === 'lobby' ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Users2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 font-fun">You're in the Lobby!</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Look up at your teacher's board. The quiz battle will begin shortly!
            </p>

            <div className="mt-4 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 inline-flex items-center gap-2.5">
              <span className="text-xl">{myTeam?.avatar}</span>
              <div className="text-left">
                <p className="text-xs font-bold text-indigo-950">Team {myTeam?.name}</p>
                <p className="text-[11px] text-indigo-700">Ready to buzz in with your teammates!</p>
              </div>
            </div>
          </div>
        ) : session.status === 'finished' ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 text-center shadow-xs">
            <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-2xl font-extrabold text-slate-900 font-fun">Quiz Complete!</h2>
            <p className="text-xs text-slate-600 mt-1">
              Check the big screen for the final champions celebration!
            </p>
            <div className="mt-4">
              <button
                onClick={onExit}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Exit to Home
              </button>
            </div>
          </div>
        ) : isQuestionOpen && session.currentQuestionId?.startsWith('spec_') ? (
          /* Surprise Power-Up Card Active Screen for Students */
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-6 sm:p-8 text-white text-center shadow-md flex flex-col items-center justify-center h-full max-h-[460px] animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-3xl mb-3 shadow-inner">
              ⚡
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-200">
              KAD KUASA DIBUKA! / POWER-UP ACTIVE!
            </span>
            <h3 className="text-xl sm:text-2xl font-black mt-1 leading-snug">
              Surprise Power-Up!
            </h3>
            <p className="text-xs text-white/90 mt-2 max-w-xs leading-relaxed">
              Lihat ke skrin kelas hadapan untuk aksi kad kuasa pasukan!
            </p>
            <div className="mt-4 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-xs text-xs font-mono font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Perhatikan markah pasukan berubah!</span>
            </div>
          </div>
        ) : isQuestionOpen ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full max-h-[460px]">
            {/* Status banner */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <span className="text-xs font-bold text-slate-500">
                Question Card Active
              </span>
              {hasSubmittedAnswer && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Answer Submitted
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 my-2 text-center">
              Lock in your answer choice:
            </h3>

            {/* 4 Large Choice Buttons (A, B, C, D) that flex fit nicely */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 flex-1 min-h-0">
              {['opt_1', 'opt_2', 'opt_3', 'opt_4'].map((optId, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isSelected = selectedOptionId === optId;

                const colors = [
                  'bg-red-500 hover:bg-red-600 border-red-600 active:bg-red-700',
                  'bg-blue-500 hover:bg-blue-600 border-blue-600 active:bg-blue-700',
                  'bg-amber-500 hover:bg-amber-600 border-amber-600 active:bg-amber-700',
                  'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 active:bg-emerald-700',
                ];

                return (
                  <button
                    key={optId}
                    onClick={() => handleSelectAnswer(optId)}
                    disabled={hasSubmittedAnswer || session.answersRevealed}
                    className={`rounded-xl border-b-4 text-white font-black text-2xl sm:text-3xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-xs ${
                      colors[idx]
                    } ${
                      isSelected ? 'ring-4 ring-offset-2 ring-indigo-600 scale-98 opacity-100' : ''
                    } ${
                      hasSubmittedAnswer && !isSelected ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <span>{letter}</span>
                    {isSelected && <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Locked In</span>}
                  </button>
                );
              })}
            </div>

            {hasSubmittedAnswer && !session.answersRevealed && (
              <p className="text-center text-xs text-slate-500 mt-2 shrink-0 animate-pulse">
                Waiting for teacher to reveal the correct answer...
              </p>
            )}

            {session.answersRevealed && (
              <div className="mt-2 p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-center shrink-0">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Answer Revealed on Board!
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Board view on student device */
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 text-center shadow-xs">
            <HelpCircle className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
            <h3 className="text-lg font-extrabold text-slate-900">
              Look up at the Classroom Board!
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              A team is currently picking the next numbered question card.
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-xs font-bold text-slate-400">Team Score:</span>
              <span className={`text-sm font-black font-mono ${(myTeam?.score ?? 0) < 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                {myTeam?.score ?? 0}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom exit quiet link */}
      <div className="text-center shrink-0 pt-1">
        <button
          onClick={onExit}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          Leave Session
        </button>
      </div>
    </div>
  );
};
