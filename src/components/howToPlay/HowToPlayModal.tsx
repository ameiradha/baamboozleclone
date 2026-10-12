import React from 'react';
import { X, Play, Zap, HelpCircle, Shield, Award, Users } from 'lucide-react';
import { sound } from '../../services/soundService';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold font-fun">How to Play QuizBattle Classroom</h2>
              <p className="text-xs text-indigo-100">Step-by-step game rules and power-up guide</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body with scrolling */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Section 1: Gameplay Overview */}
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Play className="w-4 h-4 text-indigo-600" />
              1. The Classroom Game Board
            </h3>
            <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
              The teacher displays a grid of numbered cards on the interactive whiteboard or projector. Teams take turns selecting a numbered card to reveal a question or a surprise power-up!
            </p>
          </div>

          {/* Section 2: Team Turn Flow */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              2. Teams & Answering
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
              <li>Classes can be split into <strong>2 to 10 teams</strong> (Team Alpha, Team Beta, etc.).</li>
              <li>Students can join live via tablets/smartphones using the <strong>6-digit PIN</strong>.</li>
              <li>Questions feature countdown timers. Once an answer is clicked, it locks automatically.</li>
              <li>The teacher or auto-scoring awards points for correct answers.</li>
            </ul>
          </div>

          {/* Section 3: Power-ups & Special Cards */}
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              3. Mystery Special Cards & Power-Ups
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  ⚡ STEAL POINTS
                </span>
                <p className="text-slate-600 mt-1">
                  Steal 5, 10, 15, 20 or custom points from an opposing team.
                </p>
              </div>
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <span className="font-bold text-blue-900 flex items-center gap-1">
                  🔄 SWAP POINTS
                </span>
                <p className="text-slate-600 mt-1">
                  Two chosen teams trade their entire current score totals!
                </p>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <span className="font-bold text-emerald-900 flex items-center gap-1">
                  🎁 BONUS POINTS
                </span>
                <p className="text-slate-600 mt-1">
                  Instantly receive free bonus points for your team.
                </p>
              </div>
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                <span className="font-bold text-purple-900 flex items-center gap-1">
                  ✨ DOUBLE POINTS
                </span>
                <p className="text-slate-600 mt-1">
                  The selected question awards 2x its standard points value!
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Teacher Superpowers */}
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
            <h3 className="text-base font-bold text-indigo-950 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              4. Teacher Controls & Undo Protection
            </h3>
            <p className="text-xs text-indigo-900 leading-relaxed">
              Every score adjustment is tracked in the action audit log. Made a mistake? Hit <strong>UNDO LAST ACTION</strong> to restore previous team scores instantly!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors"
          >
            Got It! Let's Play
          </button>
        </div>
      </div>
    </div>
  );
};
