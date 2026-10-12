import React from 'react';
import {
  Sparkles,
  KeyRound,
  Globe,
  Flame,
  ArrowRight,
  Gamepad2,
  Users2,
  Trophy,
} from 'lucide-react';
import { sound } from '../../services/soundService';
import { DEMO_GAME } from '../../services/demoData';

interface HomePageProps {
  onNavigate: (view: string, extraData?: any) => void;
  onStartDemoGame: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onStartDemoGame }) => {
  return (
    <div className="h-full max-h-full overflow-hidden flex flex-col justify-between p-3 sm:p-6 max-w-4xl mx-auto w-full text-center">
      {/* Top Hero Header */}
      <div className="pt-2 sm:pt-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Interactive Classroom Revision</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
          QuizBattle <span className="text-indigo-600">Classroom</span>
        </h1>

        <p className="mt-1.5 text-sm sm:text-lg font-medium text-slate-600">
          Make classroom revision fun with dynamic team card battles.
        </p>
      </div>

      {/* 3 Core Action Cards (Responsive Grid: 1 col on mobile, 3 cols on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2 sm:my-4">
        {/* Card 1: Create */}
        <button
          onClick={() => {
            sound.playClick();
            onNavigate('create_game');
          }}
          className="p-3.5 sm:p-5 rounded-2xl bg-white border-2 border-indigo-200 hover:border-indigo-600 hover:shadow-md transition-all text-left flex sm:flex-col justify-between items-center sm:items-start group cursor-pointer"
        >
          <div className="flex sm:flex-col items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-snug">Create Quiz</h3>
              <p className="text-xs text-slate-500 hidden sm:block mt-1">
                Build custom questions or generate up to 100 unique cards with AI.
              </p>
            </div>
          </div>
          <span className="text-indigo-600 font-bold text-xs flex items-center gap-1 sm:mt-3">
            Launch <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>

        {/* Card 2: Join */}
        <button
          onClick={() => {
            sound.playClick();
            onNavigate('join');
          }}
          className="p-3.5 sm:p-5 rounded-2xl bg-white border-2 border-emerald-200 hover:border-emerald-600 hover:shadow-md transition-all text-left flex sm:flex-col justify-between items-center sm:items-start group cursor-pointer"
        >
          <div className="flex sm:flex-col items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-snug">Join Game</h3>
              <p className="text-xs text-slate-500 hidden sm:block mt-1">
                Enter your teacher's 6-digit PIN on any device.
              </p>
            </div>
          </div>
          <span className="text-emerald-600 font-bold text-xs flex items-center gap-1 sm:mt-3">
            Enter PIN <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>

        {/* Card 3: Library */}
        <button
          onClick={() => {
            sound.playClick();
            onNavigate('public_games');
          }}
          className="p-3.5 sm:p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-sky-500 hover:shadow-md transition-all text-left flex sm:flex-col justify-between items-center sm:items-start group cursor-pointer"
        >
          <div className="flex sm:flex-col items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-snug">Public Quizzes</h3>
              <p className="text-xs text-slate-500 hidden sm:block mt-1">
                Browse ready-to-host primary & secondary games.
              </p>
            </div>
          </div>
          <span className="text-sky-600 font-bold text-xs flex items-center gap-1 sm:mt-3">
            Browse <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>

      {/* Instant 1-Click Demo Game Bar */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 text-left shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-2xs">
            🦁
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm truncate">
                {DEMO_GAME.title}
              </h4>
              <span className="text-[10px] font-mono font-bold bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded">
                DEMO
              </span>
            </div>
            <p className="text-xs text-slate-600 truncate">
              Instant test session · 3 Teams · Steal Points & Bonus Cards
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playVictory();
            onStartDemoGame();
          }}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Quick Play</span>
        </button>
      </div>

      {/* Bottom Quiet Feature Strip */}
      <div className="pt-2 pb-1 border-t border-slate-200/80 flex items-center justify-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Gamepad2 className="w-3.5 h-3.5 text-indigo-600" /> Whiteboard & Projector Ready
        </span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span className="flex items-center gap-1">
          <Users2 className="w-3.5 h-3.5 text-emerald-600" /> 2-10 Classroom Teams
        </span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span className="flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5 text-amber-500" /> Surprise Power-Ups
        </span>
      </div>
    </div>
  );
};
