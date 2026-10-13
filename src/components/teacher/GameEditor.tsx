import React, { useState, useEffect } from 'react';
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Eye,
  Upload,
  Settings,
  HelpCircle,
  Clock,
  Award,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Sparkles,
  Zap,
  Check,
  X,
  Loader2,
  Globe
} from 'lucide-react';
import {
  Game,
  Question,
  QuestionType,
  SpecialCardType,
  McqOption,
  GameSettings
} from '../../types/game';
import { GameService } from '../../services/gameService';
import { sound } from '../../services/soundService';
import { useAuth } from '../../context/AuthContext';
import { CsvImportModal } from './CsvImportModal';
import { QuestionPreviewModal } from './QuestionPreviewModal';
import { generateFallbackQuizQuestions } from '../../utils/fallbackQuizGenerator';

interface GameEditorProps {
  initialGame?: Game | null;
  onNavigate: (view: string, extraData?: any) => void;
  onSaveSuccess: (savedGame: Game) => void;
}

export const GameEditor: React.FC<GameEditorProps> = ({
  initialGame,
  onNavigate,
  onSaveSuccess,
}) => {
  const { currentUser } = useAuth();

  // Basic game details
  const [title, setTitle] = useState(initialGame?.title || '');
  const [description, setDescription] = useState(initialGame?.description || '');
  const [subject, setSubject] = useState(initialGame?.subject || 'Science');
  const [grade, setGrade] = useState(initialGame?.grade || 'Year 2');
  const [topic, setTopic] = useState(initialGame?.topic || 'Living Things');
  const [coverImage, setCoverImage] = useState(initialGame?.coverImage || '');
  const [visibility, setVisibility] = useState<'public' | 'private'>(initialGame?.visibility || 'public');

  // Game Settings
  const [settings, setSettings] = useState<GameSettings>(
    initialGame?.settings || {
      enableTimer: true,
      defaultTimerSeconds: 25,
      enablePowerUps: true,
      enableSpecialCards: true,
      randomizeQuestions: false,
      randomizeAnswers: false,
      enableSounds: true,
      allowNegativeScores: true,
      automaticScoring: true,
      enableConfetti: true,
    }
  );

  // Default initial question factory
  const createDefaultQuestion = (gameId: string = 'new_game'): Question => ({
    id: `q_${Date.now()}_1`,
    gameId,
    order: 1,
    question: 'Which of the following animals is a mammal?',
    type: 'mcq',
    points: 10,
    timer: 30,
    options: [
      { id: 'opt_1', text: 'Chicken' },
      { id: 'opt_2', text: 'Blue Whale' },
      { id: 'opt_3', text: 'Salmon' },
      { id: 'opt_4', text: 'Frog' },
    ],
    correctOptionId: 'opt_2',
  });

  // Questions array
  const [questions, setQuestions] = useState<Question[]>(() => {
    if (initialGame?.questions && initialGame.questions.length > 0) {
      return initialGame.questions;
    }
    return [createDefaultQuestion(initialGame?.id || 'new_game')];
  });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(() => {
    if (initialGame?.questions && initialGame.questions.length > 0) {
      return initialGame.questions[0].id;
    }
    return null;
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [validationError, setValidationError] = useState<string | null>(null);

  // AI Generator specific states
  const [showAiGenerateModal, setShowAiGenerateModal] = useState(false);
  const [aiTopic, setAiTopic] = useState(topic || '');
  const [aiGrade, setAiGrade] = useState(grade || 'Year 2');
  const [aiSubject, setAiSubject] = useState(subject || 'Science');
  const [aiLanguage, setAiLanguage] = useState<'ms' | 'en'>('ms');
  const [aiCount, setAiCount] = useState(10);
  const [aiTypes, setAiTypes] = useState<QuestionType[]>(['mcq', 'true_false', 'short_answer']);
  const [aiMergeMode, setAiMergeMode] = useState<'append' | 'replace'>('append');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiBannerNotice, setAiBannerNotice] = useState<string | null>(null);

  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Rotate loading messages when generating
  useEffect(() => {
    let interval: any;
    const messages = aiLanguage === 'ms' ? [
      "Menjana soalan kuiz unik (sehingga 100 soalan)...",
      "Membentuk cabaran pembelajaran berkualiti dalam Bahasa Melayu...",
      "Menyemak buku rujukan dan sukatan kurikulum Malaysia...",
      "Menyediakan pilihan jawapan pengganggu yang bersesuaian...",
      "Mengesahkan skema jawapan dan ketepatan fakta...",
      "Menerapkan penerangan yang mudah difahami murid..."
    ] : [
      "Generating unique questions (up to 100)...",
      "Formulating diverse educational challenges in English...",
      "Ensuring each question is distinct with zero repeats...",
      "Drafting varied incorrect option distractors...",
      "Verifying answer keys across all topics...",
      "Applying student-friendly explanations..."
    ];
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % messages.length);
      }, 2000);
    } else {
      setLoadingMsgIdx(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating, aiLanguage]);

  // Auto-select first question or create default if empty
  useEffect(() => {
    if (questions.length === 0) {
      const defaultQ = createDefaultQuestion(initialGame?.id || 'new_game');
      setQuestions([defaultQ]);
      setEditingQuestionId(defaultQ.id);
    } else if (!editingQuestionId || !questions.some((q) => q.id === editingQuestionId)) {
      setEditingQuestionId(questions[0].id);
    }
  }, [questions, editingQuestionId, initialGame?.id]);

  const activeQuestion = (editingQuestionId ? questions.find((q) => q.id === editingQuestionId) : null) || questions[0] || null;

  // Update current question fields
  const updateActiveQuestion = (patch: Partial<Question>) => {
    if (!activeQuestion) return;
    setSaveStatus('unsaved');
    setQuestions((prev) =>
      prev.map((q) => (q.id === activeQuestion.id ? { ...q, ...patch } : q))
    );
  };

  // Add Option to MCQ
  const handleAddOption = () => {
    sound.playClick();
    if (!activeQuestion || !activeQuestion.options || activeQuestion.options.length >= 4) return;
    const nextId = `opt_${Date.now()}_${activeQuestion.options.length + 1}`;
    const newOptions = [...activeQuestion.options, { id: nextId, text: '' }];
    updateActiveQuestion({ options: newOptions });
  };

  // Remove Option from MCQ
  const handleRemoveOption = (optId: string) => {
    sound.playClick();
    if (!activeQuestion || !activeQuestion.options || activeQuestion.options.length <= 2) {
      alert('Multiple Choice Questions must have at least 2 choices.');
      return;
    }
    const newOptions = activeQuestion.options.filter((o) => o.id !== optId);
    let nextCorrect = activeQuestion.correctOptionId;
    if (nextCorrect === optId) {
      nextCorrect = newOptions[0]?.id || '';
    }
    updateActiveQuestion({ options: newOptions, correctOptionId: nextCorrect });
  };

  // Change Option Text
  const handleOptionTextChange = (optId: string, text: string) => {
    if (!activeQuestion || !activeQuestion.options) return;
    const newOptions = activeQuestion.options.map((o) => (o.id === optId ? { ...o, text } : o));
    updateActiveQuestion({ options: newOptions });
  };

  // Add new question
  const handleAddQuestion = (type: QuestionType = 'mcq') => {
    if (questions.length >= 30) {
      sound.playIncorrect();
      alert('A maximum of 30 questions is allowed per quiz.');
      return;
    }
    sound.playClick();
    const newId = `q_${Date.now()}_${questions.length + 1}`;
    let newQ: Question;

    if (type === 'mcq') {
      newQ = {
        id: newId,
        gameId: initialGame?.id || '',
        order: questions.length + 1,
        question: 'New Question',
        type: 'mcq',
        points: 10,
        timer: 30,
        options: [
          { id: 'opt_1', text: 'Option A' },
          { id: 'opt_2', text: 'Option B' },
          { id: 'opt_3', text: 'Option C' },
          { id: 'opt_4', text: 'Option D' },
        ],
        correctOptionId: 'opt_1',
      };
    } else if (type === 'true_false') {
      newQ = {
        id: newId,
        gameId: initialGame?.id || '',
        order: questions.length + 1,
        question: 'Statement to test whether true or false...',
        type: 'true_false',
        points: 10,
        timer: 15,
        options: [
          { id: 'opt_t', text: 'TRUE' },
          { id: 'opt_f', text: 'FALSE' },
        ],
        correctOptionId: 'opt_t',
      };
    } else if (type === 'short_answer') {
      newQ = {
        id: newId,
        gameId: initialGame?.id || '',
        order: questions.length + 1,
        question: 'What is the capital of France?',
        type: 'short_answer',
        points: 15,
        timer: 30,
        correctAnswerText: 'Paris',
      };
    } else if (type === 'special') {
      newQ = {
        id: newId,
        gameId: initialGame?.id || '',
        order: questions.length + 1,
        question: '⚡ STEAL POINTS! Uncover a special classroom power-up!',
        type: 'special',
        points: 15,
        timer: 0,
        specialType: 'steal',
        specialValue: 15,
      };
    } else {
      newQ = {
        id: newId,
        gameId: initialGame?.id || '',
        order: questions.length + 1,
        question: 'Describe what you see in the classroom...',
        type,
        points: 10,
        timer: 30,
      };
    }

    setQuestions((prev) => [...prev, newQ]);
    setEditingQuestionId(newId);
  };

  // Duplicate current question
  const handleDuplicateQuestion = (q: Question) => {
    if (questions.length >= 30) {
      sound.playIncorrect();
      alert('A maximum of 30 questions is allowed per quiz.');
      return;
    }
    sound.playClick();
    const copy: Question = {
      ...q,
      id: `q_${Date.now()}_dup`,
      order: questions.length + 1,
      question: `${q.question} (Copy)`,
      options: q.options?.map((o, idx) => ({ ...o, id: `opt_${Date.now()}_${idx}` })),
    };
    if (copy.options && q.options && q.correctOptionId) {
      const origIdx = q.options.findIndex((o) => o.id === q.correctOptionId);
      if (origIdx >= 0 && copy.options[origIdx]) {
        copy.correctOptionId = copy.options[origIdx].id;
      }
    }
    setQuestions((prev) => [...prev, copy]);
    setEditingQuestionId(copy.id);
  };

  // Delete question
  const handleDeleteQuestion = (qId: string) => {
    if (questions.length <= 1) {
      alert('A game must contain at least 1 question.');
      return;
    }
    sound.playClick();
    const remaining = questions.filter((q) => q.id !== qId);
    setQuestions(remaining);
    setEditingQuestionId(remaining[0].id);
  };

  // Reorder questions
  const moveQuestion = (idx: number, direction: 'up' | 'down') => {
    sound.playClick();
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const updated = [...questions];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    // update order numbers
    updated.forEach((q, i) => (q.order = i + 1));
    setQuestions(updated);
  };

  // Question validation
  const validateGame = (): boolean => {
    if (!title.trim()) {
      setValidationError('Please enter a Game Title.');
      return false;
    }
    if (questions.length === 0) {
      setValidationError('Game must contain at least one question.');
      return false;
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setValidationError(`Question ${i + 1} has an empty question prompt.`);
        setEditingQuestionId(q.id);
        return false;
      }

      if (q.type === 'mcq' || q.type === 'true_false') {
        if (!q.options || q.options.length < 2) {
          setValidationError(`Question ${i + 1} must have at least 2 options.`);
          setEditingQuestionId(q.id);
          return false;
        }
        if (q.options.length > 4) {
          setValidationError(`Question ${i + 1} cannot have more than 4 choices.`);
          setEditingQuestionId(q.id);
          return false;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].text.trim()) {
            setValidationError(`Option ${String.fromCharCode(65 + j)} in Question ${i + 1} is empty.`);
            setEditingQuestionId(q.id);
            return false;
          }
        }
        if (!q.correctOptionId) {
          setValidationError(`Question ${i + 1} must have a correct answer selected.`);
          setEditingQuestionId(q.id);
          return false;
        }
      }

      if (q.points < 0) {
        setValidationError(`Question ${i + 1} points cannot be negative.`);
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  // Helper to format, apply, and integrate generated questions
  const applyGeneratedQuestions = (rawQuestions: any[], isFallback: boolean = false, fallbackReason: string = '') => {
    if (!rawQuestions || rawQuestions.length === 0) {
      throw new Error('No questions available to format.');
    }

    const baseGameId = initialGame?.id || 'new_game';
    const formattedQuestions: Question[] = rawQuestions.map((q: any, idx: number) => {
      const qId = `q_ai_${Date.now()}_${idx}`;
      const points = q.points || 10;
      const timer = q.timer || 30;
      const explanation = q.explanation || '';
      
      let type: QuestionType = 'mcq';
      if (q.type === 'true_false') type = 'true_false';
      else if (q.type === 'short_answer') type = 'short_answer';

      let options: McqOption[] | undefined;
      let correctOptionId: string | undefined;
      let correctAnswerText: string | undefined;

      if (type === 'mcq') {
        options = (q.options || []).slice(0, 4).map((opt: any, oIdx: number) => ({
          id: opt.id || `opt_${oIdx + 1}`,
          text: opt.text || `Option ${oIdx + 1}`,
        }));
        if (options && options.length > 0) {
          correctOptionId = q.correctOptionId || options[0].id;
        } else {
          options = [
            { id: 'opt_1', text: 'Option A' },
            { id: 'opt_2', text: 'Option B' }
          ];
          correctOptionId = 'opt_1';
        }
      } else if (type === 'true_false') {
        const isMalay = aiLanguage === 'ms';
        // Preserve question options if already returned, otherwise provide standard localized TRUE/FALSE or BENAR/PALSU
        if (q.options && Array.isArray(q.options) && q.options.length >= 2) {
          options = q.options.map((opt: any) => ({
            id: opt.id,
            text: opt.text || (opt.id === 'opt_t' ? (isMalay ? 'BENAR' : 'TRUE') : (isMalay ? 'PALSU' : 'FALSE')),
          }));
        } else {
          options = [
            { id: 'opt_t', text: isMalay ? 'BENAR' : 'TRUE' },
            { id: 'opt_f', text: isMalay ? 'PALSU' : 'FALSE' },
          ];
        }
        correctOptionId = q.correctOptionId === 'opt_f' ? 'opt_f' : 'opt_t';
      } else if (type === 'short_answer') {
        correctAnswerText = q.correctAnswerText || q.question || '';
      }

      return {
        id: qId,
        gameId: baseGameId,
        order: idx + 1,
        question: q.question || 'Untitled Question',
        type,
        points,
        timer,
        options,
        correctOptionId,
        correctAnswerText,
        explanation,
      };
    });

    if (formattedQuestions.length === 0) {
      throw new Error('AI did not generate any valid questions.');
    }

    if (aiMergeMode === 'replace') {
      formattedQuestions.forEach((q, i) => {
        q.order = i + 1;
      });
      setQuestions(formattedQuestions);
      setEditingQuestionId(formattedQuestions[0].id);
    } else {
      const updatedQuestions = [...questions];
      if (updatedQuestions.length + formattedQuestions.length > 100) {
        const allowedCount = 100 - updatedQuestions.length;
        if (allowedCount <= 0) {
          throw new Error('Your quiz already has 100 questions. Delete some questions first or choose Replace Strategy.');
        }
        formattedQuestions.splice(allowedCount);
        alert(`Only ${allowedCount} questions were appended to keep the quiz within the 100-question limit.`);
      }
      formattedQuestions.forEach((q) => {
        q.order = updatedQuestions.length + 1;
        updatedQuestions.push(q);
      });
      setQuestions(updatedQuestions);
      setEditingQuestionId(formattedQuestions[0].id);
    }

    // Auto-populate metadata if currently blank
    if (!title || title.toLowerCase().includes('untitled') || title.toLowerCase() === 'new game') {
      setTitle(aiLanguage === 'ms' ? `Kuiz: ${aiTopic}` : `AI Quiz: ${aiTopic}`);
    }
    if (!topic) {
      setTopic(aiTopic);
    }
    if (!grade) {
      setGrade(aiGrade);
    }
    if (!subject) {
      setSubject(aiSubject);
    }

    setSaveStatus('unsaved');
    sound.playVictory();
    setShowAiGenerateModal(false);

    if (isFallback) {
      const isMalay = aiLanguage === 'ms';
      setAiBannerNotice(
        isMalay
          ? `⚡ Mod Kesinambungan (Fallback): ${formattedQuestions.length} soalan telah dijana dalam Bahasa Melayu untuk topik "${aiTopic}". ${fallbackReason ? `(${fallbackReason})` : ''} Anda boleh menyemak dan mengubah suai soalan pada bila-bila masa.`
          : `⚡ Continuity Mode (Fallback): ${formattedQuestions.length} questions generated in English for topic "${aiTopic}". ${fallbackReason ? `(${fallbackReason})` : ''} You can review and edit questions at any time.`
      );
    } else {
      setAiBannerNotice(null);
    }
  };

  // Instant Fallback Generator (Bypass network entirely)
  const handleGenerateFallbackOnly = () => {
    if (!aiTopic.trim()) {
      setAiError('Please enter a topic for the quiz.');
      return;
    }
    if (aiTypes.length === 0) {
      setAiError('Please select at least one question type.');
      return;
    }
    sound.playClick();
    setAiError(null);
    try {
      const fallbackList = generateFallbackQuizQuestions(
        aiTopic.trim(),
        aiCount,
        aiSubject,
        aiGrade,
        aiTypes,
        aiLanguage
      );
      applyGeneratedQuestions(
        fallbackList,
        true,
        aiLanguage === 'ms'
          ? 'Dijana pantas melalui sistem modul kurikulum setempat (Bahasa Melayu)'
          : 'Instantly generated via local curriculum module (English)'
      );
    } catch (err: any) {
      setAiError(err.message || 'Gagal menjana soalan fallback.');
    }
  };

  // AI Quiz Generation via Gemini with automatic fallback on timeout (HTTP 504) or network failure
  const handleGenerateAiQuiz = async () => {
    if (!aiTopic.trim()) {
      setAiError('Please enter a topic for the quiz.');
      return;
    }
    if (aiTypes.length === 0) {
      setAiError('Please select at least one question type.');
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    sound.playClick();

    let rawQuestions: any[] = [];
    let isFallback = false;
    let fallbackReason = '';

    try {
      let response: Response | null = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second client timeout safeguard

        response = await fetch('/api/gemini/generate-quiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: aiTopic.trim(),
            grade: aiGrade,
            subject: aiSubject,
            count: aiCount,
            types: aiTypes,
            language: aiLanguage,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchErr: any) {
        console.warn('Network or timeout during AI request:', fetchErr);
        isFallback = true;
        fallbackReason = 'Masa tamat sambungan pelayan';
      }

      if (response && response.ok) {
        const data = await response.json();
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          rawQuestions = data.questions;
          if (data.fallbackUsed) {
            isFallback = true;
            fallbackReason = data.errorNotice || 'Pelayan Vercel mengaktifkan mod fallback';
          }
        } else {
          isFallback = true;
          fallbackReason = 'Respons kosong dari AI';
        }
      } else {
        // HTTP 504 Gateway Timeout or server error -> Activate fallback seamlessly
        isFallback = true;
        const status = response ? response.status : 504;
        fallbackReason = status === 504
          ? 'Pelayan Vercel mengalami masa tamat (HTTP 504)'
          : `Ralat pelayan (HTTP ${status})`;
      }

      // If network timed out or failed, generate curriculum questions via fallback
      if (isFallback || rawQuestions.length === 0) {
        console.info(`[Quiz AI] Activating fallback generator for topic "${aiTopic.trim()}" (${aiLanguage}) (${fallbackReason})`);
        rawQuestions = generateFallbackQuizQuestions(
          aiTopic.trim(),
          aiCount,
          aiSubject,
          aiGrade,
          aiTypes,
          aiLanguage
        );
      }

      applyGeneratedQuestions(rawQuestions, isFallback, fallbackReason);
    } catch (err: any) {
      console.error('AI quiz generation error, attempting emergency fallback:', err);
      // Emergency fallback even on unexpected exceptions
      try {
        const emergencyList = generateFallbackQuizQuestions(
          aiTopic.trim(),
          aiCount,
          aiSubject,
          aiGrade,
          aiTypes,
          aiLanguage
        );
        applyGeneratedQuestions(emergencyList, true, 'Emergency fallback activated');
      } catch (finalErr: any) {
        setAiError(finalErr.message || 'An error occurred during generation.');
        sound.playIncorrect();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleAiType = (type: QuestionType) => {
    if (aiTypes.includes(type)) {
      setAiTypes(aiTypes.filter((t) => t !== type));
    } else {
      setAiTypes([...aiTypes, type]);
    }
  };

  // Save game
  const handleSaveGame = async () => {
    if (!validateGame()) {
      sound.playIncorrect();
      return;
    }

    setSaveStatus('saving');
    sound.playClick();

    const gameId = initialGame?.id || `game_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const finalQuestions = questions.map((q, idx) => ({
      ...q,
      gameId,
      order: idx + 1,
    }));

    const finalGame: Game = {
      id: gameId,
      title: title.trim(),
      description: description.trim(),
      subject,
      grade,
      topic,
      ownerId: currentUser?.uid || initialGame?.ownerId || 'teacher_guest',
      ownerName: currentUser?.displayName || initialGame?.ownerName || 'Teacher',
      visibility,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=80',
      settings,
      questionCount: finalQuestions.length,
      createdAt: initialGame?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: finalQuestions,
    };

    try {
      await GameService.saveGame(finalGame);
      setSaveStatus('saved');
      sound.playVictory();
      onSaveSuccess(finalGame);
    } catch {
      setSaveStatus('unsaved');
      setValidationError('Failed to save to database. Saved locally.');
    }
  };

  const previewCurrentGame: Game = {
    id: initialGame?.id || 'temp_preview',
    title: title || 'Quiz Preview',
    description,
    subject,
    grade,
    topic,
    ownerId: currentUser?.uid || '',
    ownerName: currentUser?.displayName || 'Teacher',
    visibility,
    coverImage,
    settings,
    questionCount: questions.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions,
  };

  return (
    <div className="h-full max-h-full flex flex-col justify-between p-2 sm:p-3.5 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs mb-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 font-fun truncate">
              {initialGame ? 'Edit Classroom Quiz' : 'Create New Classroom Quiz'}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-semibold">{questions.length} Questions</span>
              <span>•</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  saveStatus === 'saved'
                    ? 'text-emerald-600'
                    : saveStatus === 'saving'
                    ? 'text-amber-600'
                    : 'text-slate-400'
                }`}
              >
                {saveStatus === 'saved' && <CheckCircle2 className="w-3 h-3" />}
                {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <button
            onClick={() => {
              sound.playClick();
              setShowAiGenerateModal(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-300 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            title="Generate custom quiz questions with Gemini AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
            <span className="hidden sm:inline">AI Generate</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            title="Import questions from Excel template (.xlsx) or CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Preview</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Settings</span>
          </button>

          <button
            onClick={handleSaveGame}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {validationError && (
        <div className="mb-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shrink-0 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}

      {aiBannerNotice && (
        <div className="mb-2 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-center justify-between gap-3 shrink-0 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <Zap className="w-4.5 h-4.5 shrink-0 text-amber-600 animate-pulse" />
            <span className="truncate sm:whitespace-normal">{aiBannerNotice}</span>
          </div>
          <button
            onClick={() => setAiBannerNotice(null)}
            className="p-1 hover:bg-amber-100 rounded-lg text-amber-700 hover:text-amber-900 transition-colors cursor-pointer shrink-0"
            title="Tutup notis"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 flex-1 min-h-0 overflow-hidden">
        {/* Left Column: Questions List / Reordering */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-xs flex flex-col justify-between h-full max-h-full overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h3 className="font-extrabold text-slate-900 text-xs font-fun">
                Questions ({questions.length})
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAddQuestion('mcq')}
                  className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Add MCQ
                </button>
              </div>
            </div>

            {/* Questions scroll area */}
            <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
              {questions.map((q, idx) => {
                const isSelected = q.id === activeQuestion.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => setEditingQuestionId(q.id)}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {q.question || 'Untitled Question'}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">
                          {q.type.replace('_', ' ')} • {q.points} pts
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => moveQuestion(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveQuestion(idx, 'down')}
                        disabled={idx === questions.length - 1}
                        title="Move Down"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick add other types footer */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-[11px] font-bold">
            <button
              onClick={() => handleAddQuestion('true_false')}
              className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-center transition-colors"
            >
              + True/False
            </button>
            <button
              onClick={() => handleAddQuestion('short_answer')}
              className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-center transition-colors"
            >
              + Short Ans
            </button>
            <button
              onClick={() => handleAddQuestion('special')}
              className="py-1.5 px-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-center transition-colors flex items-center justify-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-600" />
              Special
            </button>
          </div>
        </div>

        {/* Right Column: Active Question Editor Form */}
        <div className="lg:col-span-8 space-y-2.5 h-full max-h-full overflow-y-auto pr-1">
          {/* Card: Active Question Fields */}
          {activeQuestion ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs">
              {/* Question Top Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                    {activeQuestion.order || 1}
                  </span>
                  <div>
                    <select
                      value={activeQuestion.type}
                      onChange={(e) => updateActiveQuestion({ type: e.target.value as QuestionType })}
                      className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800"
                    >
                      <option value="mcq">Multiple Choice</option>
                      <option value="true_false">True / False</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="text">Text Question</option>
                      <option value="image">Image Question</option>
                      <option value="special">Special Power-Up Card</option>
                    </select>
                  </div>
                </div>

              <div className="flex items-center gap-3">
                {/* Points selector */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Points:</span>
                  <select
                    value={activeQuestion.points}
                    onChange={(e) => updateActiveQuestion({ points: Number(e.target.value) })}
                    className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold"
                  >
                    <option value={5}>5 pts</option>
                    <option value={10}>10 pts</option>
                    <option value={15}>15 pts</option>
                    <option value={20}>20 pts</option>
                    <option value={25}>25 pts</option>
                    <option value={50}>50 pts</option>
                  </select>
                </div>

                {/* Timer selector */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>Timer:</span>
                  <select
                    value={activeQuestion.timer}
                    onChange={(e) => updateActiveQuestion({ timer: Number(e.target.value) })}
                    className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold"
                  >
                    <option value={0}>No Timer</option>
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                    <option value={20}>20s</option>
                    <option value={30}>30s</option>
                    <option value={45}>45s</option>
                    <option value={60}>60s</option>
                  </select>
                </div>

                {/* Duplicate / Delete Question */}
                <button
                  onClick={() => handleDuplicateQuestion(activeQuestion)}
                  title="Duplicate Question"
                  className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteQuestion(activeQuestion.id)}
                  title="Delete Question"
                  className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Textarea */}
            <div className="mb-6">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                Question Prompt
              </label>
              <textarea
                rows={2}
                value={activeQuestion.question}
                onChange={(e) => updateActiveQuestion({ question: e.target.value })}
                placeholder="Enter question text here (e.g. Which planet is closest to the Sun?)"
                className="w-full p-3.5 text-base font-bold rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Image URL (Optional) */}
            <div className="mb-6">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Question Image (Optional URL)</span>
                {activeQuestion.imageUrl && (
                  <button
                    onClick={() => updateActiveQuestion({ imageUrl: undefined })}
                    className="text-rose-600 text-[11px] font-bold hover:underline"
                  >
                    Remove Image
                  </button>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={activeQuestion.imageUrl || ''}
                  onChange={(e) => updateActiveQuestion({ imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 p-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {activeQuestion.imageUrl && (
                <div className="mt-2 max-h-36 rounded-xl overflow-hidden border border-slate-200 w-fit">
                  <img src={activeQuestion.imageUrl} alt="Preview" className="max-h-36 object-contain" />
                </div>
              )}
            </div>

            {/* MCQ Options Editor */}
            {activeQuestion.type === 'mcq' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Answer Options (Select the correct answer circle)
                  </label>
                  {activeQuestion.options && activeQuestion.options.length < 4 && (
                    <button
                      onClick={handleAddOption}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Choice
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {activeQuestion.options?.map((opt, oIdx) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    const isCorrect = opt.id === activeQuestion.correctOptionId;
                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                          isCorrect ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        {/* Radio for correct answer */}
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            updateActiveQuestion({ correctOptionId: opt.id });
                          }}
                          className={`w-8 h-8 rounded-xl font-extrabold text-sm flex items-center justify-center transition-all cursor-pointer ${
                            isCorrect
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-emerald-500'
                          }`}
                          title={isCorrect ? 'Correct Answer' : 'Click to set as correct answer'}
                        >
                          {letter}
                        </button>

                        {/* Input text */}
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                          placeholder={`Option ${letter}`}
                          className="flex-1 px-3 py-1.5 text-sm font-semibold bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />

                        {/* Remove Choice button (if > 2 choices) */}
                        {activeQuestion.options && activeQuestion.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Remove choice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* True / False Editor */}
            {activeQuestion.type === 'true_false' && (
              <div className="space-y-4">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                  Select Correct Outcome
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => updateActiveQuestion({ correctOptionId: 'opt_t' })}
                    className={`p-4 rounded-2xl border-2 font-extrabold text-base transition-all ${
                      activeQuestion.correctOptionId === 'opt_t'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    TRUE {activeQuestion.correctOptionId === 'opt_t' && '✓'}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveQuestion({ correctOptionId: 'opt_f' })}
                    className={`p-4 rounded-2xl border-2 font-extrabold text-base transition-all ${
                      activeQuestion.correctOptionId === 'opt_f'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    FALSE {activeQuestion.correctOptionId === 'opt_f' && '✓'}
                  </button>
                </div>
              </div>
            )}

            {/* Short Answer Editor */}
            {activeQuestion.type === 'short_answer' && (
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block mb-1">
                  Expected Correct Answer
                </label>
                <input
                  type="text"
                  value={activeQuestion.correctAnswerText || ''}
                  onChange={(e) => updateActiveQuestion({ correctAnswerText: e.target.value })}
                  placeholder="e.g. Paris"
                  className="w-full p-3 text-sm font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Special Card Editor */}
            {activeQuestion.type === 'special' && (
              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-amber-900 block mb-1">
                    Special Card Action
                  </label>
                  <select
                    value={activeQuestion.specialType || 'steal'}
                    onChange={(e) =>
                      updateActiveQuestion({ specialType: e.target.value as SpecialCardType })
                    }
                    className="w-full p-2.5 text-xs font-bold bg-white rounded-xl border border-amber-300 text-amber-900"
                  >
                    <option value="steal">⚡ STEAL POINTS (Take points from rival team)</option>
                    <option value="swap">🔄 SWAP POINTS (Trade score totals between 2 teams)</option>
                    <option value="bonus">🎁 BONUS POINTS (Free points gift)</option>
                    <option value="double">✨ DOUBLE POINTS (Next answer worth 2x)</option>
                    <option value="lose_points">💥 LOSE POINTS (Penalty deduction)</option>
                    <option value="reset">🔄 RESET SCORE (Reset team score to zero)</option>
                    <option value="random_bonus">🎲 RANDOM BONUS (Random 5 to 50 points)</option>
                    <option value="skip">⏭️ SKIP QUESTION</option>
                    <option value="free_choice">🎯 FREE CHOICE</option>
                  </select>
                </div>
              </div>
            )}

            {/* Teacher explanation / answer notes */}
            <div className="mt-6">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                Teacher Explanation / Notes (Shown after answer reveal)
              </label>
              <input
                type="text"
                value={activeQuestion.explanation || ''}
                onChange={(e) => updateActiveQuestion({ explanation: e.target.value })}
                placeholder="Optional fun fact or explanation..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500">
              <p className="text-sm font-semibold">No question selected.</p>
              <button
                onClick={() => handleAddQuestion('mcq')}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
              >
                + Add Question
              </button>
            </div>
          )}

          {/* Card: Game Metadata & Categorization */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <h3 className="font-extrabold text-slate-900 text-sm font-fun mb-4">
              Quiz Details & Classroom Metadata
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Game Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setSaveStatus('unsaved');
                    setTitle(e.target.value);
                  }}
                  placeholder="e.g. Science Year 2 - Animals"
                  className="w-full p-2.5 text-sm font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSaveStatus('unsaved');
                    setSubject(e.target.value);
                  }}
                  placeholder="e.g. Science, Mathematics, Geography"
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Year / Grade</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => {
                    setSaveStatus('unsaved');
                    setGrade(e.target.value);
                  }}
                  placeholder="e.g. Year 2, Grade 3, Primary 4"
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => {
                    setSaveStatus('unsaved');
                    setTopic(e.target.value);
                  }}
                  placeholder="e.g. Animals, Fractions, Solar System"
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => {
                    setSaveStatus('unsaved');
                    setDescription(e.target.value);
                  }}
                  placeholder="Brief summary of what this quiz covers for your class..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Visibility</label>
                <select
                  value={visibility}
                  onChange={(e) => {
                    setSaveStatus('unsaved');
                    setVisibility(e.target.value as 'public' | 'private');
                  }}
                  className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="public">Public (Shared in Public Games gallery)</option>
                  <option value="private">Private (Only visible to you)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cover Image URL</label>
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => {
                    setSaveStatus('unsaved');
                    setCoverImage(e.target.value);
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold font-fun">Classroom Game Settings</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <p className="font-bold text-slate-900">Enable Countdown Timers</p>
                  <p className="text-slate-500 text-[11px]">Synchronized timers for question cards</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableTimer}
                  onChange={(e) => setSettings({ ...settings, enableTimer: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <p className="font-bold text-slate-900">Enable Mystery Power-Up Cards</p>
                  <p className="text-slate-500 text-[11px]">Steal, Swap, Bonus, and Double cards</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enablePowerUps}
                  onChange={(e) => setSettings({ ...settings, enablePowerUps: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <p className="font-bold text-slate-900">Randomize Answer Choices</p>
                  <p className="text-slate-500 text-[11px]">Shuffles choices while preserving correct answer mapping</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.randomizeAnswers}
                  onChange={(e) => setSettings({ ...settings, randomizeAnswers: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <p className="font-bold text-slate-900">Allow Negative Scores (Skor Negatif)</p>
                  <p className="text-slate-500 text-[11px]">Points can go negative if deducted below 0 (e.g. -5, -15). Never capped at zero.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowNegativeScores}
                  onChange={(e) => setSettings({ ...settings, allowNegativeScores: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <p className="font-bold text-slate-900">Automatic Scoring Mode</p>
                  <p className="text-slate-500 text-[11px]">System auto-checks answers (teacher can still override)</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.automaticScoring}
                  onChange={(e) => setSettings({ ...settings, automaticScoring: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <p className="font-bold text-slate-900">Enable Sound Effects & Fanfares</p>
                  <p className="text-slate-500 text-[11px]">Play audio cues on correct/incorrect and power-ups</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableSounds}
                  onChange={(e) => setSettings({ ...settings, enableSounds: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <p className="font-bold text-slate-900">Celebration Confetti Blasts</p>
                  <p className="text-slate-500 text-[11px]">Shower screen in confetti on victory and bonuses</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableConfetti}
                  onChange={(e) => setSettings({ ...settings, enableConfetti: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Questions Generator Modal */}
      {showAiGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5.5 h-5.5 text-amber-300 animate-pulse" />
                <div>
                  <h3 className="text-lg font-extrabold font-fun">AI Questions & Answers Generator</h3>
                  <p className="text-xs text-indigo-100 font-medium">Powered by Gemini AI • Create full custom quizzes in seconds</p>
                </div>
              </div>
              {!isGenerating && (
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowAiGenerateModal(false);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {isGenerating ? (
              /* Loading State */
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin flex items-center justify-center animate-duration-1000" />
                  <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h4 className="text-base font-extrabold text-slate-900 font-fun animate-pulse">
                    Generating Educational Quiz...
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold h-4 transition-all duration-300">
                    {(aiLanguage === 'ms' ? [
                      "Membentuk cabaran pembelajaran yang menarik...",
                      "Menyemak buku rujukan dan sukatan kurikulum...",
                      "Menyediakan soalan dan jawapan dalam Bahasa Melayu...",
                      "Mengesahkan skema jawapan dan fakta...",
                      "Mencipta detik pembelajaran bermakna...",
                      "Menerapkan penerangan yang mudah difahami murid..."
                    ] : [
                      "Formulating educational challenges in English...",
                      "Consulting the virtual textbook and curriculum...",
                      "Drafting diverse and realistic distractors...",
                      "Verifying answer key consistency...",
                      "Creating classroom magic moments...",
                      "Applying student-friendly explanations..."
                    ])[loadingMsgIdx]}
                  </p>
                </div>
              </div>
            ) : (
              /* Input/Configuration Form */
              <div className="p-6 sm:p-8 space-y-5 text-left">
                {aiError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex flex-col gap-2.5 animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                      <span>{aiError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateFallbackOnly}
                      className="mt-0.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer self-start transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>⚡ Jana Dengan Mod Fallback Segera (Tanpa Had Masa)</span>
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Language Selection: English vs Bahasa Melayu */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        Bahasa Soalan & Jawapan / Language <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-indigo-600" />
                        {aiLanguage === 'ms' ? 'Bahasa Melayu' : 'English'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAiLanguage('ms');
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                          aiLanguage === 'ms'
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs ring-1 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl select-none" role="img" aria-label="Malaysia">🇲🇾</span>
                          <div>
                            <p className="font-extrabold text-xs text-slate-900">Bahasa Melayu</p>
                            <p className="text-[10px] text-slate-500 font-medium">Soalan & jawapan Bahasa Melayu</p>
                          </div>
                        </div>
                        <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                          aiLanguage === 'ms' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                        }`}>
                          {aiLanguage === 'ms' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAiLanguage('en');
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                          aiLanguage === 'en'
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs ring-1 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl select-none" role="img" aria-label="English">🇬🇧</span>
                          <div>
                            <p className="font-extrabold text-xs text-slate-900">English</p>
                            <p className="text-[10px] text-slate-500 font-medium">Questions & answers in English</p>
                          </div>
                        </div>
                        <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                          aiLanguage === 'en' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                        }`}>
                          {aiLanguage === 'en' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Topic */}
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                      Quiz Topic / Concept <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder={
                        aiLanguage === 'ms'
                          ? "Contoh: Fotosintesis, Sistem Suria, Sejarah Melaka, Haiwan Mamalia, Pecahan Wang"
                          : "e.g. Photosynthesis, Solar System, Ancient Egypt, Decimals, Ecosystems"
                      }
                      className="w-full p-3 text-sm font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>

                  {/* Two Column Subject & Grade */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={aiSubject}
                        onChange={(e) => setAiSubject(e.target.value)}
                        placeholder={aiLanguage === 'ms' ? "Sains, Matematik, Sejarah..." : "Science, Math, Geography..."}
                        className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                        Grade Level
                      </label>
                      <input
                        type="text"
                        value={aiGrade}
                        onChange={(e) => setAiGrade(e.target.value)}
                        placeholder={aiLanguage === 'ms' ? "Tahun 2, Tingkatan 3..." : "Year 2, Grade 5..."}
                        className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Question Types Multi-Select */}
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                      Allowed Question Types <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleAiType('mcq')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          aiTypes.includes('mcq')
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 transition-transform ${aiTypes.includes('mcq') ? 'scale-100' : 'scale-0'}`} />
                        <span>Multiple Choice</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAiType('true_false')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          aiTypes.includes('true_false')
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 transition-transform ${aiTypes.includes('true_false') ? 'scale-100' : 'scale-0'}`} />
                        <span>True / False</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAiType('short_answer')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          aiTypes.includes('short_answer')
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 transition-transform ${aiTypes.includes('short_answer') ? 'scale-100' : 'scale-0'}`} />
                        <span>Short Answer</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Count Selector (Supports up to 100 unique questions) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          Number of Questions (Up to 100 Unique)
                        </label>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Every single question will be completely unique with zero duplicates
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={aiCount}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1));
                            setAiCount(val);
                          }}
                          className="w-16 p-1 text-center font-mono font-black text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-slate-500">soalan</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="w-full accent-indigo-600 bg-slate-100 rounded-lg cursor-pointer h-2"
                    />

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 mr-1">Pantas:</span>
                      {[5, 10, 20, 30, 50, 75, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setAiCount(preset);
                          }}
                          className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold transition-all cursor-pointer ${
                            aiCount === preset
                              ? 'bg-indigo-600 text-white shadow-2xs scale-105'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Append / Replace Selection */}
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                      Integration Strategy
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAiMergeMode('append');
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          aiMergeMode === 'append'
                            ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <p className="font-extrabold text-xs">Append to Quiz</p>
                        <p className="text-[10px] opacity-75 font-semibold mt-0.5">Keep existing cards, add new ones</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAiMergeMode('replace');
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          aiMergeMode === 'replace'
                            ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <p className="font-extrabold text-xs text-rose-800">Replace All</p>
                        <p className="text-[10px] opacity-75 font-semibold mt-0.5 text-rose-600">Erase current cards, create fresh</p>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleGenerateFallbackOnly}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Jana pantas secara terus tanpa risiko masa tamat pelayan"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>⚡ Mod Fallback Segera</span>
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => {
                        sound.playClick();
                        setShowAiGenerateModal(false);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-extrabold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleGenerateAiQuiz}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>GENERATE QUESTIONS</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={showImportModal}
        gameId={initialGame?.id || 'new_game'}
        existingQuestions={questions}
        onImportSuccess={(newQs) => {
          setQuestions((prev) => [...prev, ...newQs]);
          setSaveStatus('unsaved');
        }}
        onClose={() => setShowImportModal(false)}
      />

      {/* Preview Modal */}
      <QuestionPreviewModal
        game={previewCurrentGame}
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
      />
    </div>
  );
};
