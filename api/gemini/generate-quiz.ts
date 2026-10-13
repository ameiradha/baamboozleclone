import { GoogleGenAI, Type } from '@google/genai';
import { generateFallbackQuizQuestions } from '../../src/utils/fallbackQuizGenerator';

export const maxDuration = 60;
export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // Set CORS headers for browser fetch
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { topic, points = '', grade, subject, count = 5, types = ['mcq', 'true_false', 'short_answer'], language = 'ms' } = req.body || {};

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  const targetCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 100);
  const isMalay = !(language === 'en' || language === 'english');
  const langLabel = isMalay ? 'Bahasa Melayu' : 'English';
  const cleanPoints = (typeof points === 'string' ? points : '').trim();

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Vercel API] GEMINI_API_KEY is not configured, activating fallback generator.');
    const fallbackQuestions = generateFallbackQuizQuestions(topic, targetCount, subject, grade, types, language, cleanPoints);
    return res.status(200).json({
      questions: fallbackQuestions,
      fallbackUsed: true,
      errorNotice: 'GEMINI_API_KEY is not configured in Vercel. Generated questions using curriculum fallback system.',
    });
  }

  const functionStartTime = Date.now();
  const TIME_BUDGET_MS = 25000; // Allow ample time for Gemini generation

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-vercel',
        },
      },
    });

    const languageInstruction = isMalay
      ? `MANDAT BAHASA MUTLAK:
Semua teks soalan, pilihan jawapan (options), jawapan betul, dan penjelasan (explanation) WAJIB dihasilkan sepenuhnya dalam BAHASA MELAYU standard/baku (sesuai untuk sekolah Malaysia).
Untuk soalan jenis 'true_false', pilihan jawapan MESTI mengandungi tepat 2 pilihan: 'BENAR' (id: 'opt_t') dan 'PALSU' (id: 'opt_f').`
      : `STRICT LANGUAGE MANDATE:
All question text, answer options, correct answers, and explanations MUST be written completely in ENGLISH.
For 'true_false' questions, the two options MUST have text 'TRUE' (id: 'opt_t') and 'FALSE' (id: 'opt_f').`;

    const pointsAdherenceInstruction = cleanPoints
      ? `CRITICAL MANDATE - STRICT ADHERENCE TO GIVEN POINTS / NOTES:
The teacher has provided specific points, facts, and syllabus notes below. 
Every single question MUST be directly generated from and strictly test these provided points:
---
${cleanPoints}
---
RULES FOR USING THE GIVEN POINTS:
1. Every question must test a factual statement, definition, concept, process, or distinction directly stated in the given points.
2. Formulate questions that check comprehension and recall of these exact points (e.g., asking what something is, which component does what, whether a statement about the point is BENAR/PALSU, or identifying the correct explanation).
3. Do NOT invent concepts outside these points, except to generate plausible incorrect answer choices (distractors).
4. If there are multiple bullet points, distribute the questions evenly across all points so the entire list is tested.`
      : `CRITICAL MANDATE - STRICT ADHERENCE TO TOPIC & SYLLABUS:
The teacher wants questions specifically testing the topic: "${topic}".
1. Every question must be a direct, authentic, syllabus-appropriate test question testing real knowledge, concepts, terminology, or application of "${topic}".
2. STRICTLY FORBIDDEN: NEVER generate vague or trivial meta-questions such as:
   - "Mengapakah kita perlu belajar topik ini?" / "Why is studying this important?"
   - "Apakah langkah pertama untuk mengkaji topik ini?" / "What is the first step to study this?"
   - "Topik ini dipelajari dalam subjek apa?" / "Which subject does this belong to?"
   - "Adakah topik ini berguna dalam kehidupan?" / "Is this useful in real life?"
3. ALL questions must be authentic academic test items (such as standard exam / quiz / KBAT questions):
   - Asking for specific definitions, factual recall, scientific or historical facts, steps in a process, organelle/organ functions, mathematical steps, cause and effect, or classifications.
4. Distractors (incorrect choices in MCQ) must be realistic, plausible terms from the same educational subject.
5. For True/False questions, the statement must be an unambiguous factual claim that is definitely true or definitely false based on the curriculum.`;

    const systemInstruction = `You are an expert educator, curriculum designer, and school teacher. 
Your task is to generate high-quality, engaging, grade-appropriate classroom quiz questions and answers.
CRITICAL MANDATE: Every single question in the returned set MUST be completely UNIQUE, distinct, and explore a different concept, fact, problem variation, or perspective.
Under NO circumstances repeat questions, create trivial rephrasings, or recycle identical answer choices.
Each question should be educational, clear, and include a helpful, encouraging explanation of the correct answer.

${languageInstruction}

${pointsAdherenceInstruction}

Supported question types are:
1. 'mcq': Multiple Choice. Generate 3 to 4 options (standard is 4, e.g. A, B, C, D) with unique IDs ('opt_1', 'opt_2', etc.) and exactly one correct Option ID.
2. 'true_false': True or False statement. Options must be exactly two elements with ID 'opt_t' (text: ${isMalay ? "'BENAR'" : "'TRUE'"}) and 'opt_f' (text: ${isMalay ? "'PALSU'" : "'FALSE'"}).
3. 'short_answer': Open-ended question where the student types a short answer. Provide the exact correct answer text in 'correctAnswerText' (e.g. 'Paris' or 'mamalia').

The tone of questions and explanations should be highly engaging, enthusiastic, and suitable for the selected grade level. Ensure all option text, correct options, and answers are fully filled out and correct. Do not use markdown inside any of the returned strings.`;

    const batchSize = Math.min(20, targetCount);
    const totalBatches = Math.ceil(targetCount / batchSize);
    const collectedQuestions: any[] = [];
    const seenNormalized = new Set<string>();

    function normalizeText(text: string): string {
      return (text || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    }

    const stopWords = new Set([
      'what', 'which', 'where', 'when', 'who', 'whom', 'whose', 'why', 'how',
      'that', 'this', 'these', 'those', 'with', 'from', 'about', 'into', 'over',
      'after', 'before', 'between', 'under', 'above', 'their', 'there', 'here',
      'does', 'doing', 'done', 'have', 'having', 'been', 'were', 'will', 'would',
      'could', 'should', 'each', 'every', 'most', 'some', 'such', 'only', 'same',
      'apakah', 'manakah', 'bagaimanakah', 'mengapakah', 'bilakah', 'dimanakah',
      'siapakah', 'yang', 'pada', 'dalam', 'untuk', 'dengan', 'dari', 'daripada',
      'antara', 'berikut', 'pernyataan', 'mengenai', 'adakah', 'adalah', 'ialah',
      'proses', 'fungsi', 'contoh', 'kesan', 'faktor', 'seperti', 'semasa', 'utama'
    ]);

    function getSignificantKeywords(text: string): Set<string> {
      const words = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
      return new Set(words.filter(w => w.length > 3 && !stopWords.has(w)));
    }

    function isDuplicateOrTooSimilar(newText: string, existingQuestions: any[]): boolean {
      const norm = normalizeText(newText);
      if (!norm || seenNormalized.has(norm)) return true;

      const newKeywords = getSignificantKeywords(newText);
      if (newKeywords.size === 0) return false;

      for (const eq of existingQuestions) {
        const existKeywords = getSignificantKeywords(eq.question);
        if (existKeywords.size === 0) continue;

        let intersection = 0;
        for (const kw of newKeywords) {
          if (existKeywords.has(kw)) intersection++;
        }
        const union = new Set([...newKeywords, ...existKeywords]).size;
        const jaccard = union > 0 ? intersection / union : 0;
        if (jaccard > 0.82) {
          return true;
        }
      }
      return false;
    }

    const curriculumAngles = cleanPoints
      ? [
          'Soalan pemahaman terus dan fakta utama daripada poin yang diberi',
          'Soalan fungsi, proses, atau hubungan sebab-akibat daripada poin yang diberi',
          'Soalan pengecaman contoh dan aplikasi daripada poin yang diberi',
          'Soalan analisis, perbandingan, atau perincian daripada poin yang diberi',
          'Soalan pengukuhan dan semakan ketepatan fakta daripada poin yang diberi'
        ]
      : [
          'Konsep teras, definisi saintifik/akademik, dan istilah utama',
          'Ciri-ciri khusus, komponen struktur, dan klasifikasi',
          'Fungsi, peranan, mekanisme, atau cara ia berlaku',
          'Contoh situasi kehidupan sebenar, aplikasi praktikal, dan pengecaman',
          'Perbandingan, hubungan sebab-akibat, dan analisis fakta mengikut sukatan pelajaran'
        ];

    let batchIndex = 0;
    const maxAttempts = totalBatches + 1;

    while (collectedQuestions.length < targetCount && batchIndex < maxAttempts) {
      // Check time budget to prevent Vercel 504 Gateway Timeout
      if (Date.now() - functionStartTime > TIME_BUDGET_MS) {
        console.warn(`[Vercel API] Approaching time limit (${Date.now() - functionStartTime}ms). Exiting loop early to prevent 504.`);
        break;
      }

      const remainingNeeded = targetCount - collectedQuestions.length;
      const currentBatchCount = Math.min(batchSize, remainingNeeded);
      const angle = curriculumAngles[batchIndex % curriculumAngles.length];

      const existingSummary = collectedQuestions
        .slice(-40)
        .map((q, idx) => `${idx + 1}. ${q.question}`)
        .join('\n');

      const uniquenessConstraint = collectedQuestions.length > 0
        ? `\n\nCRITICAL MANDATE - ZERO DUPLICATES (Must generate ${currentBatchCount} COMPLETELY NEW questions):
Under NO circumstances repeat, rephrase, or recycle any of the following questions already generated:
${existingSummary}

Focus specifically on this distinct angle: "${angle}".
Every single question MUST present a completely novel question statement, different answer choices, and explore a fresh aspect of the topic or points!`
        : `\nPrimary focus area for this set: "${angle}". Ensure all questions are unique, creative, and varied.`;

      const userPrompt = `Generate exactly ${currentBatchCount} completely UNIQUE and DIFFERENT quiz questions about the topic: "${topic}".
${cleanPoints ? `Specific Reference Points to test:
"""
${cleanPoints}
"""` : ''}
Language: ${langLabel} (ALL question text, answer choices, correct answers, and explanations MUST be in ${langLabel})
Grade level: ${grade || 'General'}
Subject: ${subject || 'General'}
Allowed question types to include: ${types.join(', ')}. Please balance the requested types across the questions.${uniquenessConstraint}`;

      // Candidate models
      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let batchResponse: any = null;
      let lastError: any = null;

      for (const modelName of candidateModels) {
        // Double check time before making external API call
        if (Date.now() - functionStartTime > TIME_BUDGET_MS) {
          console.warn('[Vercel API] Budget reached before calling next model.');
          break;
        }

        try {
          console.log(`[Vercel API] Generating batch pass ${batchIndex + 1} with model: ${modelName}`);
          batchResponse = await ai.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  questions: {
                    type: Type.ARRAY,
                    description: "List of completely unique questions matching the criteria.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: {
                          type: Type.STRING,
                          description: "The clear, student-friendly question text or statement. MUST be completely unique and distinct."
                        },
                        type: {
                          type: Type.STRING,
                          description: "Must be 'mcq', 'true_false', or 'short_answer'."
                        },
                        points: {
                          type: Type.INTEGER,
                          description: "Suggested points (e.g., 10, 15, 20)."
                        },
                        timer: {
                          type: Type.INTEGER,
                          description: "Suggested time limit in seconds (e.g., 15, 30, 45)."
                        },
                        options: {
                          type: Type.ARRAY,
                          description: "Mandatory for 'mcq' and 'true_false'. For 'true_false' it must have exactly 2 options with ids 'opt_t' (TRUE) and 'opt_f' (FALSE). For 'mcq', it must have 3-4 options with unique ids like 'opt_1', 'opt_2', etc.",
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING },
                              text: { type: Type.STRING }
                            },
                            required: ["id", "text"]
                          }
                        },
                        correctOptionId: {
                          type: Type.STRING,
                          description: "The id of the correct option (e.g. 'opt_1' or 'opt_t'). Mandatory for 'mcq' and 'true_false'."
                        },
                        correctAnswerText: {
                          type: Type.STRING,
                          description: "The correct answer text. Mandatory for 'short_answer'. Leave empty for other types."
                        },
                        explanation: {
                          type: Type.STRING,
                          description: "A short, engaging explanation of why the answer is correct."
                        }
                      },
                      required: ["question", "type", "points", "timer", "explanation"]
                    }
                  }
                },
                required: ["questions"]
              }
            }
          });

          if (batchResponse) break;
        } catch (err: any) {
          console.warn(`[Vercel API] Model ${modelName} failed:`, err?.message || err);
          lastError = err;
        }
      }

      if (batchResponse) {
        try {
          const rawText = batchResponse.text || '{}';
          const parsed = JSON.parse(rawText.trim());
          if (Array.isArray(parsed.questions)) {
            for (const q of parsed.questions) {
              if (collectedQuestions.length >= targetCount) break;
              if (q && q.question && !isDuplicateOrTooSimilar(q.question, collectedQuestions)) {
                seenNormalized.add(normalizeText(q.question));
                collectedQuestions.push(q);
              }
            }
          }
        } catch (parseErr) {
          console.error(`Failed to parse batch ${batchIndex + 1} response:`, parseErr);
        }
      } else if (lastError && collectedQuestions.length === 0) {
        throw lastError;
      }

      batchIndex++;
    }

    // If we need more questions to meet the requested target count, fill seamlessly using fallback
    if (collectedQuestions.length < targetCount) {
      const needed = targetCount - collectedQuestions.length;
      console.log(`[Vercel API] Filling remaining ${needed} questions using fallback generator (${langLabel})...`);
      const fillQuestions = generateFallbackQuizQuestions(topic, needed, subject, grade, types, language, cleanPoints);
      for (const fq of fillQuestions) {
        if (collectedQuestions.length >= targetCount) break;
        if (!isDuplicateOrTooSimilar(fq.question, collectedQuestions)) {
          collectedQuestions.push(fq);
        }
      }
    }

    const finalQuestions = collectedQuestions.slice(0, targetCount);
    return res.status(200).json({ questions: finalQuestions });
  } catch (error: any) {
    console.error('Error generating quiz questions on Vercel:', error);
    let errMsg = error?.message || 'Failed to generate questions. Please check your Gemini API key.';
    try {
      if (typeof errMsg === 'string' && (errMsg.startsWith('{') || errMsg.includes('{"error"'))) {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error?.message) errMsg = parsed.error.message;
      }
    } catch (_) {}

    // Fallback: Return guaranteed curriculum questions so user's game creation never fails
    console.warn(`[Vercel API] Returning fallback questions (${langLabel}) due to error:`, errMsg);
    const fallbackList = generateFallbackQuizQuestions(topic, targetCount, subject, grade, types, language, cleanPoints);
    return res.status(200).json({
      questions: fallbackList,
      fallbackUsed: true,
      errorNotice: errMsg,
    });
  }
}
