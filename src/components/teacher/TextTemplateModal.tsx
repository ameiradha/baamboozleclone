import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  FileText,
  Sparkles,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { Question, QuestionType, McqOption } from '../../types/game';
import { sound } from '../../services/soundService';

interface TextTemplateModalProps {
  isOpen: boolean;
  gameId: string;
  existingQuestions: Question[];
  onImportSuccess: (importedQuestions: Question[]) => void;
  onClose: () => void;
}

export const TextTemplateModal: React.FC<TextTemplateModalProps> = ({
  isOpen,
  gameId,
  existingQuestions,
  onImportSuccess,
  onClose,
}) => {
  const [copiedSampleFormat, setCopiedSampleFormat] = useState(false);

  // Paste / Import state
  const [pastedText, setPastedText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  if (!isOpen) return null;

  const sampleKeyValueText = `QUESTION: Which planet is known as the Red Planet?
TYPE: MCQ
A: Earth
B: Mars
C: Jupiter
D: Venus
ANSWER: B
DIFFICULTY: Easy
EXPLANATION: Mars appears reddish because of iron-rich minerals on its surface.

QUESTION: Water freezes at 0 degrees Celsius.
TYPE: TRUE_FALSE
ANSWER: TRUE
DIFFICULTY: Easy
EXPLANATION: Freezing point of water is 0°C at sea level.

QUESTION: What is the capital of Malaysia?
TYPE: SHORT_ANSWER
ANSWER: Kuala Lumpur
DIFFICULTY: Medium
EXPLANATION: Kuala Lumpur is the federal capital of Malaysia.`;

  const handleCopySampleFormat = async () => {
    try {
      await navigator.clipboard.writeText(sampleKeyValueText);
      setCopiedSampleFormat(true);
      sound.playClick();
      setTimeout(() => setCopiedSampleFormat(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Helper parser for Key-Value text format
  const parseKeyValueFormat = (raw: string): Question[] => {
    const lines = raw.split(/\r?\n/);
    const blocks: Record<string, string>[] = [];
    let currentBlock: Record<string, string> | null = null;
    let currentKey = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match KEY: VALUE (e.g. QUESTION: ..., TYPE: ..., A: ..., B: ..., ANSWER: ..., EXPLANATION: ...)
      const match = trimmed.match(/^(QUESTION|TYPE|A|B|C|D|ANSWER|CORRECT ANSWER|CORRECT|DIFFICULTY|EXPLANATION|POINTS|TIMER):\s*(.*)$/i);
      if (match) {
        const keyUpper = match[1].toUpperCase().replace(/\s+/g, '_');
        const val = match[2].trim();

        if (keyUpper === 'QUESTION') {
          if (currentBlock && currentBlock.QUESTION) {
            blocks.push(currentBlock);
          }
          currentBlock = { QUESTION: val };
          currentKey = 'QUESTION';
        } else if (currentBlock) {
          currentBlock[keyUpper] = val;
          currentKey = keyUpper;
        }
      } else if (currentBlock && currentKey) {
        // Multi-line continuation (e.g. long explanation)
        currentBlock[currentKey] = (currentBlock[currentKey] || '') + ' ' + trimmed;
      }
    }

    if (currentBlock && currentBlock.QUESTION) {
      blocks.push(currentBlock);
    }

    if (blocks.length === 0) return [];

    return blocks.map((b, idx) => {
      const qId = `q_text_${Date.now()}_${idx}`;
      const questionText = b.QUESTION || `Soalan ${idx + 1}`;

      let type: QuestionType = 'mcq';
      const typeStr = (b.TYPE || '').toUpperCase();
      if (typeStr.includes('TRUE') || typeStr.includes('BENAR') || typeStr.includes('PALSU')) {
        type = 'true_false';
      } else if (typeStr.includes('SHORT') || typeStr.includes('PENDEK')) {
        type = 'short_answer';
      }

      const points = Number(b.POINTS) || 10;
      const timer = Number(b.TIMER) || (type === 'true_false' ? 20 : 30);
      const explanation = b.EXPLANATION || '';

      let options: McqOption[] | undefined;
      let correctOptionId: string | undefined;
      let correctAnswerText: string | undefined;

      if (type === 'mcq') {
        const labels = ['A', 'B', 'C', 'D'];
        const optTexts = [b.A || '', b.B || '', b.C || '', b.D || ''];
        options = labels.map((lbl, oIdx) => ({
          id: `opt_${oIdx + 1}`,
          text: optTexts[oIdx] || `Pilihan ${lbl}`,
        }));

        const ansStr = (b.ANSWER || b.CORRECT || b.CORRECT_ANSWER || 'A').toUpperCase().trim();
        let matchIdx = labels.indexOf(ansStr);
        if (matchIdx < 0) {
          matchIdx = optTexts.findIndex((t) => t.toUpperCase().includes(ansStr));
        }
        if (matchIdx < 0 || matchIdx > 3) matchIdx = 0;
        correctOptionId = `opt_${matchIdx + 1}`;
      } else if (type === 'true_false') {
        options = [
          { id: 'opt_t', text: 'BENAR' },
          { id: 'opt_f', text: 'PALSU' },
        ];
        const ansUpper = (b.ANSWER || b.CORRECT || b.CORRECT_ANSWER || 'TRUE').toUpperCase();
        correctOptionId = ansUpper.includes('TRUE') || ansUpper.includes('BENAR') || ansUpper === 'A' || ansUpper === 'OPT_T'
          ? 'opt_t'
          : 'opt_f';
      } else if (type === 'short_answer') {
        correctAnswerText = b.ANSWER || b.CORRECT || b.CORRECT_ANSWER || '';
      }

      return {
        id: qId,
        gameId,
        order: idx + 1,
        question: questionText,
        type,
        points,
        timer,
        options,
        correctOptionId,
        correctAnswerText,
        explanation,
      };
    });
  };

  // Helper parser for JSON format (Fallback)
  const parseJsonFormat = (raw: string): Question[] => {
    let candidateJson = raw;
    if (candidateJson.includes('```')) {
      const matches = candidateJson.match(/```(?:json)?([\s\S]*?)```/i);
      if (matches && matches[1]) {
        candidateJson = matches[1].trim();
      } else {
        candidateJson = candidateJson.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
      }
    }

    const startArr = candidateJson.indexOf('[');
    const endArr = candidateJson.lastIndexOf(']');
    if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
      candidateJson = candidateJson.substring(startArr, endArr + 1);
    }

    const parsed = JSON.parse(candidateJson);
    const rawList: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.questions)
      ? parsed.questions
      : [parsed];

    if (!rawList || rawList.length === 0) return [];

    return rawList.map((item: any, idx: number) => {
      const qId = `q_json_${Date.now()}_${idx}`;
      const questionText = String(item.question || item.text || item.prompt || `Soalan ${idx + 1}`).trim();
      let type: QuestionType = 'mcq';
      const typeStr = String(item.type || '').toLowerCase();
      if (typeStr.includes('true') || typeStr.includes('false') || typeStr.includes('benar')) {
        type = 'true_false';
      } else if (typeStr.includes('short') || typeStr.includes('pendek')) {
        type = 'short_answer';
      }

      const points = Number(item.points) || 10;
      const timer = Number(item.timer) || (type === 'true_false' ? 20 : 30);
      const explanation = item.explanation || item.penerangan || '';

      let options: McqOption[] | undefined;
      let correctOptionId: string | undefined;
      let correctAnswerText: string | undefined;

      if (type === 'mcq') {
        const rawOpts = Array.isArray(item.options) ? item.options : [];
        const labels = ['A', 'B', 'C', 'D'];
        options = labels.map((lbl, oIdx) => {
          const found = rawOpts.find(
            (o: any) =>
              String(o.id || '').toUpperCase() === lbl ||
              String(o.label || '').toUpperCase() === lbl ||
              String(o.key || '').toUpperCase() === lbl
          ) || rawOpts[oIdx];

          let text = typeof found === 'string' ? found : found?.text || found?.value || `Pilihan ${lbl}`;
          text = text.replace(/^[A-D][.|\)]\s*/i, '').trim();
          return {
            id: `opt_${oIdx + 1}`,
            text: text || `Pilihan ${lbl}`,
          };
        });

        const correctRaw = String(item.correctAnswer || item.correctOptionId || item.answer || 'A').trim().toUpperCase();
        let matchIdx = labels.indexOf(correctRaw);
        if (matchIdx < 0) {
          matchIdx = rawOpts.findIndex((o: any) => {
            const oId = String(o.id || o.label || '').toUpperCase();
            const oText = String(o.text || o).toUpperCase();
            return oId === correctRaw || oText.includes(correctRaw);
          });
        }
        if (matchIdx < 0 || matchIdx > 3) matchIdx = 0;
        correctOptionId = `opt_${matchIdx + 1}`;
      } else if (type === 'true_false') {
        options = [
          { id: 'opt_t', text: 'BENAR' },
          { id: 'opt_f', text: 'PALSU' },
        ];
        const ansUpper = String(item.correctAnswer || item.answer || 'TRUE').toUpperCase();
        correctOptionId = ansUpper.includes('TRUE') || ansUpper.includes('BENAR') || ansUpper === 'A' || ansUpper === 'OPT_T'
          ? 'opt_t'
          : 'opt_f';
      } else if (type === 'short_answer') {
        correctAnswerText = item.correctAnswer || item.answer || (Array.isArray(item.acceptedAnswers) && item.acceptedAnswers[0]) || '';
      }

      return {
        id: qId,
        gameId,
        order: idx + 1,
        question: questionText,
        type,
        points,
        timer,
        options,
        correctOptionId,
        correctAnswerText,
        explanation,
      };
    });
  };

  // Main text parser trying key-value format first, then fallback to JSON
  const handleParseText = () => {
    setError(null);
    const raw = pastedText.trim();
    if (!raw) {
      setError('Sila tampal teks respons dari mana-mana AI terlebih dahulu.');
      return;
    }

    try {
      // 1. Try Key-Value Format (QUESTION: ..., TYPE: ..., A: ..., ANSWER: ...)
      if (/QUESTION:/i.test(raw)) {
        const kvQuestions = parseKeyValueFormat(raw);
        if (kvQuestions.length > 0) {
          setParsedQuestions(kvQuestions);
          sound.playBonus();
          return;
        }
      }

      // 2. Try JSON Format fallback
      if (raw.includes('{') || raw.includes('[')) {
        const jsonQuestions = parseJsonFormat(raw);
        if (jsonQuestions.length > 0) {
          setParsedQuestions(jsonQuestions);
          sound.playBonus();
          return;
        }
      }

      throw new Error('Format tidak sah. Sila pastikan teks mematuhi format KEY-VALUE (QUESTION:, TYPE:, A:, B:, ANSWER:) atau format JSON.');
    } catch (err: any) {
      console.warn('Parse text error:', err);
      setError(
        err.message || 'Format teks tidak dapat dihuraikan. Sila semak semula format jawapan dari AI.'
      );
    }
  };

  const handleCommitImport = () => {
    if (parsedQuestions.length === 0) return;
    sound.playVictory();

    let finalQuestions: Question[] = [];
    if (importMode === 'replace') {
      finalQuestions = parsedQuestions.map((q, idx) => ({
        ...q,
        order: idx + 1,
      }));
    } else {
      const startIndex = existingQuestions.length;
      const renumbered = parsedQuestions.map((q, idx) => ({
        ...q,
        order: startIndex + idx + 1,
      }));
      finalQuestions = [...existingQuestions, ...renumbered];
    }

    onImportSuccess(finalQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full p-5 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 font-fun">
                  Tampal & Import Hasil Dari AI
                </h3>
                <p className="text-xs text-slate-500">
                  Tampal teks soalan hasil daripada mana-mana AI (ChatGPT, Claude, DeepSeek, Gemini, dll.) untuk diimport secara pukal.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Import Body */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Tampal Teks Soalan Dari AI:
                </label>
                <button
                  onClick={handleCopySampleFormat}
                  className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedSampleFormat ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSampleFormat ? 'Disalin!' : 'Salin Contoh Format Teks'}</span>
                </button>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`QUESTION: Which planet is known as the Red Planet?\nTYPE: MCQ\nA: Earth\nB: Mars\nC: Jupiter\nD: Venus\nANSWER: B\nDIFFICULTY: Easy\nEXPLANATION: Mars appears reddish because of iron-rich minerals on its surface.`}
                rows={9}
                className="w-full p-3.5 font-mono text-xs rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-hidden bg-slate-50 leading-relaxed"
              />

              <div className="mt-2.5 flex items-center justify-between">
                <button
                  onClick={handleParseText}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Hurai Teks & Sahkan Soalan</span>
                </button>

                {pastedText && (
                  <button
                    onClick={() => {
                      setPastedText('');
                      setParsedQuestions([]);
                      setError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                  >
                    Kosongkan Teks
                  </button>
                )}
              </div>
            </div>

            {/* Guide box */}
            <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-xs text-indigo-950 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Format Teks Diterima:</p>
                <p className="text-[11px] leading-relaxed text-indigo-900">
                  Format Key-Value <code>QUESTION:</code>, <code>TYPE:</code>, <code>A:</code>, <code>B:</code>, <code>C:</code>, <code>D:</code>, <code>ANSWER:</code>, <code>EXPLANATION:</code> atau format JSON array.
                </p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Parsed Preview Section */}
            {parsedQuestions.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-extrabold text-sm text-slate-900">
                      {parsedQuestions.length} Soalan Berjaya Dihurai & Sedia Diimport
                    </span>
                  </div>

                  {/* Mode Selection */}
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                    <span>Tindakan:</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="textImportMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                      />
                      <span>Tambah ({existingQuestions.length} sedia ada)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="textImportMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                      />
                      <span className="text-rose-600">Ganti Semua</span>
                    </label>
                  </div>
                </div>

                {/* Question Preview List */}
                <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {parsedQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="truncate flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 truncate">{q.question}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] font-extrabold text-slate-500 uppercase">
                        <span>{q.type.replace('_', ' ')}</span>
                        <span>•</span>
                        <span className="text-indigo-600">{q.points} pts</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Commit Button */}
                <button
                  onClick={handleCommitImport}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Import {parsedQuestions.length} Soalan Ke Dalam Kuiz</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Import Teks AI • Serasi dengan mana-mana model AI</span>
          <button onClick={onClose} className="hover:text-slate-700 font-semibold cursor-pointer">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
