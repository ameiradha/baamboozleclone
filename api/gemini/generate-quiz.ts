import { GoogleGenAI, Type } from '@google/genai';

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

  const {
    targetLanguage,
    difficulty,
    numQuestions,
    count,
    questionType,
    types,
    userInstructions,
    topic,
    instructions,
    customPrompt
  } = req.body || {};

  const targetLang = (targetLanguage || 'Bahasa Melayu').trim();
  const diffLevel = (difficulty || 'Sederhana (Medium)').trim();
  const qFormat = (questionType || (Array.isArray(types) ? types.join(', ') : 'MIXED')).trim();
  const instructionsText = (userInstructions || topic || instructions || customPrompt || 'General Knowledge Quiz').trim();

  if (!instructionsText) {
    return res.status(400).json({ error: 'Teacher / User Instructions & Topic is required.' });
  }

  const requestedCount = parseInt(numQuestions || count, 10) || 10;
  const targetCount = Math.min(Math.max(requestedCount, 1), 100);

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured in environment variables. Please configure GEMINI_API_KEY to generate questions using Gemini AI.',
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-vercel',
        },
      },
    });

    const systemInstruction = `You are an expert educational quiz designer and professional curriculum creator.
Generate a structured, high-quality educational quiz based on the user's input.

CRITICAL LANGUAGE MANDATE:
1. All question text, MCQ option texts, explanations, and accepted answers MUST be written 100% strictly in ${targetLang}.
2. If Target Language is "Bahasa Melayu", DO NOT output English text for questions, options, or explanations under any circumstances.
3. For MCQ (Aneka Pilihan): Provide exactly 4 distinct, unambiguous options with labels A, B, C, D. Specify the correct letter (e.g. "B") in correctAnswer.
4. For TRUE_FALSE (Benar/Palsu): The correctAnswer must be strictly either "TRUE" or "FALSE".
5. For SHORT_ANSWER (Jawapan Pendek): The correctAnswer must be a concise answer (1-3 words in ${targetLang}). Provide common alternative accepted spellings/synonyms in ${targetLang} in the acceptedAnswers array.
6. Provide a clear, educational, age-appropriate explanation in ${targetLang} for why the answer is correct.
7. Ensure all UTF-8 characters and Malay/accented words are formatted cleanly.`;

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
      'siapakah', 'yang', 'pada', 'dalam', 'untuk', 'dengan', 'dari', 'daripada'
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
        if (jaccard > 0.65) {
          return true;
        }
      }
      return false;
    }

    let batchIndex = 0;
    const maxAttempts = totalBatches + 2;
    // Use the lowest tier, fastest lightweight model first as requested, with robust fallback
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

    while (collectedQuestions.length < targetCount && batchIndex < maxAttempts) {
      const remainingNeeded = targetCount - collectedQuestions.length;
      const currentBatchCount = Math.min(batchSize, remainingNeeded);

      const existingSummary = collectedQuestions
        .slice(-40)
        .map((q, idx) => `${idx + 1}. ${q.question}`)
        .join('\n');

      const uniquenessConstraint = collectedQuestions.length > 0
        ? `\n\nCRITICAL MANDATE - ZERO DUPLICATES (Generate ${currentBatchCount} COMPLETELY NEW questions):
Do not repeat, rephrase, or recycle any of the following questions already generated:
${existingSummary}`
        : '';

      const userPrompt = `Target Language: ${targetLang}
Difficulty Level: ${diffLevel}
Number of Questions: ${currentBatchCount}
Question Format Requested: ${qFormat}
Teacher / User Instructions & Topic: "${instructionsText}"${uniquenessConstraint}`;

      let batchResponse: any = null;
      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
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
                    description: "List of structured educational quiz questions.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: {
                          type: Type.STRING,
                          description: "The clear question text strictly in TARGET_LANGUAGE."
                        },
                        type: {
                          type: Type.STRING,
                          description: "Must be 'mcq', 'true_false', or 'short_answer'."
                        },
                        options: {
                          type: Type.ARRAY,
                          description: "For MCQ: exactly 4 distinct options with labels A, B, C, D and option text. For TRUE_FALSE: options for TRUE and FALSE.",
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING, description: "Label like 'A', 'B', 'C', 'D' or 'TRUE', 'FALSE'." },
                              text: { type: Type.STRING, description: "Option text in TARGET_LANGUAGE." }
                            },
                            required: ["id", "text"]
                          }
                        },
                        correctAnswer: {
                          type: Type.STRING,
                          description: "For MCQ: correct letter 'A', 'B', 'C', or 'D'. For TRUE_FALSE: strictly 'TRUE' or 'FALSE'. For SHORT_ANSWER: concise answer text."
                        },
                        correctOptionId: {
                          type: Type.STRING,
                          description: "Correct option label or ID."
                        },
                        acceptedAnswers: {
                          type: Type.ARRAY,
                          description: "For SHORT_ANSWER: common alternative accepted spellings/synonyms in TARGET_LANGUAGE.",
                          items: { type: Type.STRING }
                        },
                        explanation: {
                          type: Type.STRING,
                          description: "Clear, educational explanation in TARGET_LANGUAGE."
                        },
                        points: {
                          type: Type.INTEGER,
                          description: "Suggested points (e.g., 10)."
                        },
                        timer: {
                          type: Type.INTEGER,
                          description: "Suggested time limit in seconds (e.g., 25)."
                        }
                      },
                      required: ["question", "type", "correctAnswer", "explanation"]
                    }
                  }
                },
                required: ["questions"]
              }
            }
          });

          if (batchResponse) break;
        } catch (err: any) {
          console.warn(`[Vercel API] Model ${modelName} failed on batch ${batchIndex + 1}:`, err?.message || err);
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
          console.error(`[Vercel API] Failed to parse batch ${batchIndex + 1} response:`, parseErr);
        }
      } else if (lastError && collectedQuestions.length === 0) {
        throw lastError;
      }

      batchIndex++;
    }

    if (collectedQuestions.length === 0) {
      throw new Error('Gemini API did not return any valid questions for the specified topic/prompt. Please check your prompt and try again.');
    }

    const finalQuestions = collectedQuestions.slice(0, targetCount);
    return res.status(200).json({ questions: finalQuestions });
  } catch (error: any) {
    console.error('Error generating quiz questions via Gemini API:', error);
    let errMsg = error?.message || 'Failed to generate questions using Gemini API.';
    try {
      if (typeof errMsg === 'string' && (errMsg.startsWith('{') || errMsg.includes('{"error"'))) {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error?.message) errMsg = parsed.error.message;
      }
    } catch (_) {}

    return res.status(500).json({
      error: errMsg,
    });
  }
}
