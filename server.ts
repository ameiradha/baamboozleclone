import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Health check endpoint for Cloud Run monitoring
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', time: new Date().toISOString() });
});

// Gemini AI Question and Answer Generator Endpoint (strictly authentic generation via Gemini API)
app.post('/api/gemini/generate-quiz', async (req, res) => {
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

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Please ensure GEMINI_API_KEY is set in your environment variables.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
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

    // Batching strategy to reliably support up to 100 questions without output token limits or timeouts
    // Generates in batches of up to 20 with strict uniqueness across all questions
    const batchSize = Math.min(20, targetCount);
    const totalBatches = Math.ceil(targetCount / batchSize);
    const collectedQuestions: any[] = [];
    const seenNormalized = new Set<string>();

    function normalizeText(text: string): string {
      return (text || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    }

    // Stop words to extract significant keywords
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

    const subtopicAngles = [
      'Core definitions, fundamental mechanisms, and essential terminology',
      'Real-world applications, practical case studies, and everyday examples',
      'Cause-and-effect relationships, scientific processes, and comparative analyses',
      'Historical timeline, fascinating trivia, and landmark discoveries',
      'Critical thinking, troubleshooting, and synthesis problems',
      'Experimental observations, quantitative calculations, and data interpretation',
      'System interactions, interconnected concepts, and advanced problem-solving'
    ];

    let batchIndex = 0;
    const maxAttempts = totalBatches + 2;
    // Use the lowest tier, fastest lightweight model first as requested, with robust fallback
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

    while (collectedQuestions.length < targetCount && batchIndex < maxAttempts) {
      const remainingNeeded = targetCount - collectedQuestions.length;
      const currentBatchCount = Math.min(batchSize, remainingNeeded);
      const angle = subtopicAngles[batchIndex % subtopicAngles.length];

      // Build sample of previous questions to prevent duplicates
      const existingSummary = collectedQuestions
        .slice(-40)
        .map((q, idx) => `${idx + 1}. ${q.question}`)
        .join('\n');

      const uniquenessConstraint = collectedQuestions.length > 0
        ? `\n\nCRITICAL MANDATE - ZERO DUPLICATES (Generate ${currentBatchCount} COMPLETELY NEW questions):
Do not repeat, rephrase, or recycle any of the following questions already generated:
${existingSummary}

Focus on this specific dimension: "${angle}".
Every single question MUST present a novel concept statement, genuine topic details, and distinct answer choices!`
        : `\nPrimary focus dimension for this set: "${angle}".`;

      const userPrompt = `Target Language: ${targetLang}
Difficulty Level: ${diffLevel}
Number of Questions: ${currentBatchCount}
Question Format Requested: ${qFormat}
Teacher / User Instructions & Topic: "${instructionsText}"${uniquenessConstraint}`;

      let batchResponse: any = null;
      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          console.log(`Generating batch pass ${batchIndex + 1} (${currentBatchCount} questions needed, ${collectedQuestions.length}/${targetCount} collected) with model: ${modelName}`);
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
                    description: "List of authentic, topic-specific questions generated by Gemini AI.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: {
                          type: Type.STRING,
                          description: "The clear, student-friendly question text testing actual topic content."
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
                          description: "Mandatory for 'mcq' and 'true_false'. For 'true_false' it must have exactly 2 options with ids 'opt_t' and 'opt_f'. For 'mcq', it must have 3-4 options with unique ids like 'opt_1', 'opt_2', etc.",
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
                          description: "The exact correct answer text. Mandatory for 'short_answer'."
                        },
                        explanation: {
                          type: Type.STRING,
                          description: "An educational explanation of why the answer is correct."
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
          console.warn(`Model ${modelName} failed on batch ${batchIndex + 1}:`, err.message || err);
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

    if (collectedQuestions.length === 0) {
      throw new Error('Gemini API did not return any valid questions for the specified topic/prompt. Please check your prompt and try again.');
    }

    // Return the guaranteed unique questions up to targetCount
    const finalQuestions = collectedQuestions.slice(0, targetCount);
    res.json({ questions: finalQuestions });
  } catch (error: any) {
    console.error('Error generating quiz questions via Gemini:', error);
    let errMsg = error?.message || 'Failed to generate questions. Please try again.';
    try {
      if (typeof errMsg === 'string' && (errMsg.startsWith('{') || errMsg.includes('{"error"'))) {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error?.message) errMsg = parsed.error.message;
      }
    } catch (_) {}
    res.status(500).json({ error: errMsg });
  }
});

// API 404 fallback to ensure /api/* requests never return HTML index.html
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// Global API error handler returning JSON for /api/*
app.use((err: any, req: any, res: any, next: any) => {
  if (req.path.startsWith('/api/')) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
  next(err);
});

async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const indexPath = path.resolve(distPath, 'index.html');
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && fs.existsSync(indexPath)) {
    // Serve static production build assets in production
    app.use(express.static(distPath));

    // SPA fallback: return index.html for client-side routing
    app.get('*', (_req, res, next) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
          if (err) next(err);
        });
      } else {
        next();
      }
    });
  } else {
    // Development or fallback using Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`QuizBattle Classroom server listening on port ${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && PORT !== 3000) {
      console.warn(`Port ${PORT} in use, falling back to port 3000...`);
      app.listen(3000, '0.0.0.0', () => {
        console.log(`QuizBattle Classroom server listening on fallback port 3000`);
      });
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
