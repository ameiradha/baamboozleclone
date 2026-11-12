import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  FileText,
  Sparkles,
  Download,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
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
  const [activeTab, setActiveTab] = useState<'template' | 'paste'>('template');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedJsonFormat, setCopiedJsonFormat] = useState(false);
  const [copiedCsvFormat, setCopiedCsvFormat] = useState(false);

  // Template customizer fields to help user generate the exact prompt for any AI
  const [templateTopic, setTemplateTopic] = useState('Sains Tahun 4 - Fotosintesis');
  const [templateLang, setTemplateLang] = useState('Bahasa Melayu');
  const [templateDiff, setTemplateDiff] = useState('Sederhana (Medium)');
  const [templateNum, setTemplateNum] = useState(10);
  const [templateFormat, setTemplateFormat] = useState('Campuran (Aneka Pilihan, Benar/Palsu & Jawapan Pendek)');

  // Paste / Import state
  const [pastedText, setPastedText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  if (!isOpen) return null;

  // The comprehensive Prompt Template that can be copied directly to ChatGPT, Claude, DeepSeek, Gemini Web, etc.
  const fullAiPrompt = `You are an expert educational quiz designer and professional curriculum creator.
Generate a structured, high-quality educational quiz based on the user's input.

Target Language: ${templateLang}
Difficulty Level: ${templateDiff}
Number of Questions: ${templateNum}
Question Format Requested: ${templateFormat}
Teacher / User Instructions & Topic: "${templateTopic}"

CRITICAL LANGUAGE MANDATE:
1. All question text, MCQ option texts, explanations, and accepted answers MUST be written 100% strictly in ${templateLang}.
2. If Target Language is "Bahasa Melayu", DO NOT output English text for questions, options, or explanations under any circumstances.
3. For MCQ (Aneka Pilihan): Provide exactly 4 distinct, unambiguous options with labels A, B, C, D. Specify the correct letter (e.g. "B") in correctAnswer.
4. For TRUE_FALSE (Benar/Palsu): The correctAnswer must be strictly either "TRUE" or "FALSE".
5. For SHORT_ANSWER (Jawapan Pendek): The correctAnswer must be a concise answer (1-3 words in ${templateLang}). Provide common alternative accepted spellings/synonyms in ${templateLang} in the acceptedAnswers array.
6. Provide a clear, educational, age-appropriate explanation in ${templateLang} for why the answer is correct.
7. Ensure all UTF-8 characters and Malay/accented words are formatted cleanly.

OUTPUT FORMAT:
Please output ONLY a valid JSON array matching this exact JSON schema (do not wrap in markdown or backticks, just raw JSON):
[
  {
    "question": "Soalan yang jelas dan tepat",
    "type": "mcq",
    "options": [
      { "id": "A", "text": "Pilihan A" },
      { "id": "B", "text": "Pilihan B" },
      { "id": "C", "text": "Pilihan C" },
      { "id": "D", "text": "Pilihan D" }
    ],
    "correctAnswer": "B",
    "points": 10,
    "timer": 30,
    "explanation": "Penerangan ilmiah mengapa jawapan ini betul."
  },
  {
    "question": "Tumbuhan memerlukan cahaya matahari untuk membuat makanan.",
    "type": "true_false",
    "correctAnswer": "TRUE",
    "points": 10,
    "timer": 20,
    "explanation": "Cahaya matahari diserap oleh klorofil untuk proses fotosintesis."
  },
  {
    "question": "Apakah gas yang dibebaskan oleh tumbuhan semasa fotosintesis?",
    "type": "short_answer",
    "correctAnswer": "Oksigen",
    "acceptedAnswers": ["Oksigen", "Gas Oksigen", "Oxygen"],
    "points": 15,
    "timer": 30,
    "explanation": "Fotosintesis menghasilkan glukosa dan membebaskan gas oksigen ke udara."
  }
]`;

  const jsonSampleOnly = `[
  {
    "question": "Apakah organ utama pernafasan manusia?",
    "type": "mcq",
    "options": [
      { "id": "A", "text": "Jantung" },
      { "id": "B", "text": "Peparu" },
      { "id": "C", "text": "Perut" },
      { "id": "D", "text": "Hati" }
    ],
    "correctAnswer": "B",
    "points": 10,
    "timer": 30,
    "explanation": "Peparu ialah organ utama untuk pertukaran gas oksigen dan karbon dioksida."
  },
  {
    "question": "Bumi mengelilingi matahari dalam masa 365 hari.",
    "type": "true_false",
    "correctAnswer": "TRUE",
    "points": 10,
    "timer": 20,
    "explanation": "Peredaran lengkap bumi mengelilingi matahari mengambil masa satu tahun."
  },
  {
    "question": "Apakah ibu negara bagi Malaysia?",
    "type": "short_answer",
    "correctAnswer": "Kuala Lumpur",
    "acceptedAnswers": ["Kuala Lumpur", "KL"],
    "points": 15,
    "timer": 30,
    "explanation": "Kuala Lumpur merupakan ibu negara rasmi bagi Malaysia."
  }
]`;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(fullAiPrompt);
      setCopiedPrompt(true);
      sound.playClick();
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyJsonSample = async () => {
    try {
      await navigator.clipboard.writeText(jsonSampleOnly);
      setCopiedJsonFormat(true);
      sound.playClick();
      setTimeout(() => setCopiedJsonFormat(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadTxt = () => {
    sound.playClick();
    const blob = new Blob([fullAiPrompt], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Prompt_AI_Quiz.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parser function to parse user-pasted text from any AI (JSON or structured lines)
  const handleParseText = () => {
    setError(null);
    const raw = pastedText.trim();
    if (!raw) {
      setError('Sila tampal teks respons dari mana-mana AI terlebih dahulu.');
      return;
    }

    try {
      let candidateJson = raw;
      // Remove markdown code fences if present (e.g. ```json ... ```)
      if (candidateJson.includes('```')) {
        const matches = candidateJson.match(/```(?:json)?([\s\S]*?)```/i);
        if (matches && matches[1]) {
          candidateJson = matches[1].trim();
        } else {
          candidateJson = candidateJson.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
        }
      }

      // If array exists somewhere inside text
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

      if (!rawList || rawList.length === 0) {
        throw new Error('Tiada soalan dikesan dalam teks JSON yang ditampal.');
      }

      const formattedQuestions: Question[] = rawList.map((item: any, idx: number) => {
        const qId = `q_text_${Date.now()}_${idx}`;
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
            const found = rawOpts.find((o: any) =>
              String(o.id || '').toUpperCase() === lbl ||
              String(o.label || '').toUpperCase() === lbl ||
              String(o.key || '').toUpperCase() === lbl
            ) || rawOpts[oIdx];

            let text = typeof found === 'string' ? found : (found?.text || found?.value || `Pilihan ${lbl}`);
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
          const isBM = templateLang.toLowerCase().includes('melayu');
          options = [
            { id: 'opt_t', text: isBM ? 'BENAR' : 'TRUE' },
            { id: 'opt_f', text: isBM ? 'PALSU' : 'FALSE' },
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

      setParsedQuestions(formattedQuestions);
      sound.playBonus();
    } catch (err: any) {
      console.warn('JSON parse fallback attempted:', err);
      setError(
        'Format teks tidak dapat dihuraikan sebagai JSON yang sah. Sila pastikan anda menyalin jawapan JSON dari AI mengikut format template yang disediakan.'
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
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 font-fun">
                  Text Template Soalan AI
                </h3>
                <p className="text-xs text-slate-500">
                  Salin template teks prompt ini ke mana-mana AI (ChatGPT, Claude, DeepSeek, Gemini, dll.) dan tampal hasilnya di sini!
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

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 border-b border-slate-200">
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('template');
              }}
              className={`pb-2.5 px-3 font-extrabold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'template'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>1. Salin Text Template Prompt</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('paste');
              }}
              className={`pb-2.5 px-3 font-extrabold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'paste'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>2. Tampal Hasil Dari AI ({parsedQuestions.length > 0 ? `${parsedQuestions.length} Soalan` : 'Import'})</span>
            </button>
          </div>

          {/* Tab 1: Template Builder & Copy */}
          {activeTab === 'template' && (
            <div className="mt-4 space-y-4">
              {/* Quick Prompt Customizer */}
              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Sesuaikan Prompt Anda (Pilihan):
                  </h4>
                  <span className="text-[11px] text-indigo-700 font-bold">Template auto-update teks di bawah</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tajuk / Topik Soalan:</label>
                    <input
                      type="text"
                      value={templateTopic}
                      onChange={(e) => setTemplateTopic(e.target.value)}
                      placeholder="cth: Sains Tahun 4 - Fotosintesis"
                      className="w-full p-2 bg-white rounded-xl border border-indigo-200 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Bahasa Sasaran:</label>
                    <select
                      value={templateLang}
                      onChange={(e) => setTemplateLang(e.target.value)}
                      className="w-full p-2 bg-white rounded-xl border border-indigo-200 font-semibold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="Bahasa Melayu">Bahasa Melayu (Mandatori 100%)</option>
                      <option value="English">English</option>
                      <option value="Bahasa Arab">Bahasa Arab</option>
                      <option value="Mandarin">Mandarin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Format Soalan:</label>
                    <select
                      value={templateFormat}
                      onChange={(e) => setTemplateFormat(e.target.value)}
                      className="w-full p-2 bg-white rounded-xl border border-indigo-200 font-semibold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="Campuran (Aneka Pilihan, Benar/Palsu & Jawapan Pendek)">Campuran (MIXED)</option>
                      <option value="Aneka Pilihan (4 Pilihan A, B, C, D)">Aneka Pilihan Sahaja (MCQ)</option>
                      <option value="Benar / Palsu">Benar / Palsu Sahaja (TRUE/FALSE)</option>
                      <option value="Jawapan Pendek">Jawapan Pendek Sahaja</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tahap Kesukaran:</label>
                      <select
                        value={templateDiff}
                        onChange={(e) => setTemplateDiff(e.target.value)}
                        className="w-full p-2 bg-white rounded-xl border border-indigo-200 font-semibold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      >
                        <option value="Sederhana (Medium)">Sederhana (Medium)</option>
                        <option value="Mudah (Easy)">Mudah (Easy)</option>
                        <option value="Sukar / KBAT (Hard)">Sukar / KBAT (Hard)</option>
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Bil. Soalan:</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={templateNum}
                        onChange={(e) => setTemplateNum(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full p-2 bg-white rounded-xl border border-indigo-200 font-black text-center text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons to Copy */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyPrompt}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPrompt ? '✓ Berjaya Disalin!' : 'Salin Text Template Prompt'}</span>
                  </button>
                  <button
                    onClick={handleDownloadTxt}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Muat Turun .TXT</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    sound.playClick();
                    setActiveTab('paste');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Dah siap generate? Pergi ke langkah tampal →</span>
                </button>
              </div>

              {/* Text Area Showing the exact template */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                  <span>Pratonton Text Template (Sedia untuk di-copy ke ChatGPT, Claude, Gemini, dll.):</span>
                  <span className="text-[11px] text-slate-400 font-normal">Klik butang Salin di atas</span>
                </label>
                <textarea
                  readOnly
                  rows={10}
                  value={fullAiPrompt}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 focus:outline-hidden cursor-text leading-relaxed select-all"
                />
              </div>

              {/* Instructions Guide */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Cara Penggunaan:</p>
                  <ol className="list-decimal pl-4 space-y-0.5 text-[11px] leading-relaxed">
                    <li>Klik <strong>"Salin Text Template Prompt"</strong> di atas.</li>
                    <li>Buka mana-mana AI pilihan anda (cth: ChatGPT, Claude, Gemini, DeepSeek, Copilot).</li>
                    <li>Tampal (*paste*) prompt tersebut ke dalam ruangan chat AI.</li>
                    <li>Salin jawapan JSON yang dihasilkan oleh AI tersebut.</li>
                    <li>Kembali ke sini, klik tab <strong>"2. Tampal Hasil Dari AI"</strong> dan klik <strong>Hurai Teks</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Paste AI Output & Import */}
          {activeTab === 'paste' && (
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Tampal Output JSON dari AI:
                  </label>
                  <button
                    onClick={handleCopyJsonSample}
                    className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedJsonFormat ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedJsonFormat ? 'Disalin' : 'Salin Contoh Format JSON'}</span>
                  </button>
                </div>

                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Tampal respons JSON di sini (contoh: [{ "question": "...", "type": "mcq", "options": [...], "correctAnswer": "A", "explanation": "..." }])`}
                  rows={8}
                  className="w-full p-3 font-mono text-xs rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-hidden bg-slate-50 leading-relaxed"
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
                      onClick={() => setPastedText('')}
                      className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                    >
                      Kosongkan Teks
                    </button>
                  )}
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
          )}
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Mudah, pantas & serasi dengan mana-mana model AI</span>
          <button onClick={onClose} className="hover:text-slate-700 font-semibold cursor-pointer">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
