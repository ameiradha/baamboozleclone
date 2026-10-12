import React, { useEffect } from 'react';
import {
  Trophy,
  Award,
  Sparkles,
  RotateCcw,
  Home,
  Printer,
  Crown,
  Medal,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { GameResult } from '../../types/game';
import { sound } from '../../services/soundService';
import { triggerConfetti } from '../common/Confetti';

interface GameResultsViewProps {
  result: GameResult;
  onPlayAgain: () => void;
  onReturnToDashboard: () => void;
  onNewGame: () => void;
}

export const GameResultsView: React.FC<GameResultsViewProps> = ({
  result,
  onPlayAgain,
  onReturnToDashboard,
  onNewGame,
}) => {
  useEffect(() => {
    sound.playVictory();
    triggerConfetti('fireworks');
  }, []);

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  const sortedTeams = [...result.teams].sort((a, b) => b.score - a.score);
  const winner = sortedTeams[0] || result.winnerTeam;
  const secondPlace = sortedTeams[1];
  const thirdPlace = sortedTeams[2];

  return (
    <div className="h-full max-h-full flex flex-col justify-between p-2.5 sm:p-4 max-w-5xl mx-auto w-full overflow-hidden">
      {/* Top Banner: Champion Announcement + Action Buttons */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 rounded-2xl p-3 sm:p-4 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 text-center sm:text-left min-w-0">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shrink-0 shadow-2xs border border-white/30">
            {winner?.avatar || '🏆'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-100">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>1st Place Champion</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black truncate leading-tight">
              {winner?.name} · {winner?.score}
            </h1>
            <p className="text-xs text-white/80 truncate">
              {result.gameTitle} · {result.questionsAnswered} questions completed
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              onPlayAgain();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs uppercase tracking-wider shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
            <span>Play Again</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onNewGame();
            }}
            className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">New Game</span>
          </button>

          <button
            onClick={onReturnToDashboard}
            className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-xs transition-colors flex items-center gap-1 cursor-pointer"
            title="Dashboard"
          >
            <Home className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePrint}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-xs transition-colors cursor-pointer"
            title="Print Report"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Center Area: Split between Podium and Full Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 flex-1 min-h-0 my-2">
        {/* Left Column: Podium Stage (5 cols on md) */}
        <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Victory Podium
            </h2>
            <span className="text-[10px] font-bold text-slate-400 font-mono">Top 3 Teams</span>
          </div>

          {/* Podium Visual Steps */}
          <div className="flex items-end justify-center gap-2 sm:gap-3 py-3 flex-1">
            {/* 2nd Place */}
            {secondPlace && (
              <div className="flex-1 flex flex-col items-center">
                <span className="text-2xl sm:text-3xl mb-0.5">{secondPlace.avatar}</span>
                <span className="font-bold text-xs text-slate-900 truncate max-w-[80px] sm:max-w-[100px] text-center">
                  {secondPlace.name}
                </span>
                <span className="text-xs font-mono font-bold text-slate-600 mb-1">
                  {secondPlace.score}
                </span>
                <div className="w-full bg-slate-200 rounded-t-xl h-16 sm:h-20 flex flex-col items-center justify-center border-t-2 border-slate-300">
                  <span className="text-sm">🥈</span>
                  <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider">2nd</span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {winner && (
              <div className="flex-1 flex flex-col items-center">
                <Crown className="w-4 h-4 text-amber-500 animate-bounce mb-0.5" />
                <span className="text-3xl sm:text-4xl mb-0.5">{winner.avatar}</span>
                <span className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[90px] sm:max-w-[110px] text-center">
                  {winner.name}
                </span>
                <span className="text-xs font-mono font-black text-amber-600 mb-1">
                  {winner.score}
                </span>
                <div className="w-full bg-amber-400 rounded-t-xl h-24 sm:h-28 flex flex-col items-center justify-center border-t-2 border-amber-500 shadow-2xs">
                  <span className="text-base">🥇</span>
                  <span className="text-[10px] font-black uppercase text-amber-950 tracking-wider">1st</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {thirdPlace && (
              <div className="flex-1 flex flex-col items-center">
                <span className="text-2xl sm:text-3xl mb-0.5">{thirdPlace.avatar}</span>
                <span className="font-bold text-xs text-slate-900 truncate max-w-[80px] sm:max-w-[100px] text-center">
                  {thirdPlace.name}
                </span>
                <span className="text-xs font-mono font-bold text-slate-600 mb-1">
                  {thirdPlace.score}
                </span>
                <div className="w-full bg-amber-100 rounded-t-xl h-12 sm:h-14 flex flex-col items-center justify-center border-t-2 border-amber-300">
                  <span className="text-sm">🥉</span>
                  <span className="text-[9px] font-black uppercase text-amber-900 tracking-wider">3rd</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-500">
            Great job by all participants in today's classroom revision!
          </div>
        </div>

        {/* Right Column: Full Standings List (7 cols on md) */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-500" />
              Final Rankings ({sortedTeams.length} Teams)
            </h2>
            <span className="text-[10px] font-bold text-slate-400 font-mono">Scores</span>
          </div>

          {/* Standings List - Contained with clean scrolling if more than 5 teams */}
          <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1 py-2">
            {sortedTeams.map((team, idx) => {
              const rank = idx + 1;
              const medals = ['🥇', '🥈', '🥉'];
              const isFirst = rank === 1;

              return (
                <div
                  key={team.id}
                  className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2.5 transition-colors ${
                    isFirst
                      ? 'border-amber-300 bg-amber-50/60'
                      : rank === 2
                      ? 'border-slate-200 bg-slate-50/70'
                      : rank === 3
                      ? 'border-amber-200 bg-amber-50/30'
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-xs font-black flex items-center justify-center shrink-0">
                      {medals[idx] || `#${rank}`}
                    </span>
                    <span className="text-xl shrink-0">{team.avatar}</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {team.name}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-sm text-slate-900">
                      {team.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini Session Stats */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Points Awarded: <strong className="text-slate-800">{result.totalPointsAwarded}</strong></span>
            <span>Duration: <strong className="text-slate-800">~{result.durationMinutes || 10} min</strong></span>
            <span>Date: <strong className="text-slate-800">{new Date(result.playedAt).toLocaleDateString()}</strong></span>
          </div>
        </div>
      </div>

      {/* Bottom Quiet Footer */}
      <div className="text-center pt-1 shrink-0 text-[11px] text-slate-400">
        QuizBattle Classroom · All team cards and scores saved to dashboard
      </div>
    </div>
  );
};
