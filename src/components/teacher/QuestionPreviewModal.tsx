import React, { useState } from 'react';
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Clock,
  Award,
  Sparkles,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { Game, Question } from '../../types/game';
import { sound } from '../../services/soundService';

interface QuestionPreviewModalProps {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
}

export const QuestionPreviewModal: React.FC<QuestionPreviewModalProps> = ({
  game,
  isOpen,
  onClose,
}) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealAnswer, setRevealAnswer] = useState(false);

  if (!isOpen) return null;

  const questions = game.questions || [];
  const currentQ: Question | undefined = questions[currentIndex];

  const nextQuestion = () => {
    sound.playClick();
    setRevealAnswer(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const prevQuestion = () => {
    sound.playClick();
    setRevealAnswer(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Device width wrappers
  const containerWidthClass = {
    desktop: 'max-w-4xl w-full',
    tablet: 'max-w-xl w-full',
    mobile: 'max-w-sm w-full',
  }[deviceMode];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-800 overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Teacher Question Preview
            </span>
            <h3 className="text-base font-extrabold text-white truncate max-w-md">
              {game.title}
            </h3>
          </div>

          {/* Device Switcher (Desktop, Tablet, Mobile) */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => {
                sound.playClick();
                setDeviceMode('desktop');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                deviceMode === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setDeviceMode('tablet');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                deviceMode === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setDeviceMode('mobile');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                deviceMode === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 bg-slate-900/60 p-4 sm:p-8 overflow-y-auto flex items-center justify-center">
          {questions.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              <p className="font-bold">No questions added yet.</p>
            </div>
          ) : (
            <div className={`${containerWidthClass} transition-all duration-300`}>
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 text-slate-900 flex flex-col justify-between min-h-[420px]">
                <div>
                  {/* Question header info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center">
                        {currentIndex + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Type: {currentQ?.type?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <Award className="w-3.5 h-3.5" />
                        {currentQ?.points} pts
                      </span>
                      {currentQ?.timer ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                          <Clock className="w-3.5 h-3.5" />
                          {currentQ.timer}s
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Question image if present */}
                  {currentQ?.imageUrl && (
                    <div className="mb-4 max-h-48 rounded-2xl overflow-hidden border border-slate-200">
                      <img
                        src={currentQ.imageUrl}
                        alt="Question"
                        className="w-full h-full object-cover max-h-48"
                      />
                    </div>
                  )}

                  {/* Question prompt */}
                  <h4 className="text-lg sm:text-2xl font-extrabold text-slate-900 leading-snug mb-6">
                    {currentQ?.question}
                  </h4>

                  {/* Multiple Choice / True False choices */}
                  {(currentQ?.type === 'mcq' || currentQ?.type === 'true_false') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {currentQ.options?.map((opt, oIdx) => {
                        const isCorrect = opt.id === currentQ.correctOptionId;
                        const letter = String.fromCharCode(65 + oIdx);
                        return (
                          <div
                            key={opt.id}
                            className={`p-4 rounded-2xl border-2 font-bold text-sm flex items-center gap-3 transition-all ${
                              revealAnswer && isCorrect
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                                revealAnswer && isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white text-slate-700 border border-slate-300'
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="flex-1">{opt.text}</span>
                            {revealAnswer && isCorrect && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer */}
                  {currentQ?.type === 'short_answer' && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-4">
                      <p className="text-xs text-slate-500 font-semibold mb-1">Expected Answer:</p>
                      <p className="text-base font-extrabold text-slate-900">
                        {revealAnswer ? currentQ.correctAnswerText || 'Not specified' : '•••••••••••• (Hidden until revealed)'}
                      </p>
                    </div>
                  )}

                  {/* Special Card */}
                  {currentQ?.type === 'special' && (
                    <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl mb-4 text-center">
                      <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <h5 className="font-extrabold text-amber-900 text-base uppercase">
                        Power-Up Card: {currentQ.specialType?.replace('_', ' ')}
                      </h5>
                      <p className="text-xs text-amber-800 mt-1">
                        {currentQ.explanation || 'Uncovers special power-up event during live classroom game.'}
                      </p>
                    </div>
                  )}

                  {/* Explanation */}
                  {revealAnswer && currentQ?.explanation && (
                    <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 mt-2">
                      <strong>Teacher Note:</strong> {currentQ.explanation}
                    </div>
                  )}
                </div>

                {/* Reveal Answer Toggle */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setRevealAnswer(!revealAnswer);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                      revealAnswer ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {revealAnswer ? 'Hide Correct Answer' : 'Reveal Correct Answer'}
                  </button>

                  <span className="text-xs text-slate-400 font-semibold">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Pagination */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={prevQuestion}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-xs font-bold text-slate-400">
            {currentIndex + 1} / {questions.length || 1}
          </span>

          <button
            onClick={nextQuestion}
            disabled={currentIndex >= questions.length - 1}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
