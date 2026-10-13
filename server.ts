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

// Gemini AI Question and Answer Generator Endpoint (supports up to 100 100% unique questions)
app.post('/api/gemini/generate-quiz', async (req, res) => {
  const { topic, grade, subject, count = 5, types = ['mcq', 'true_false', 'short_answer'] } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  // Support up to 100 questions as requested by user
  const targetCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 100);

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. In Vercel, please add GEMINI_API_KEY under Project Settings -> Environment Variables, then Redeploy your project.',
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

    const systemInstruction = `You are an expert educator, curriculum designer, and school teacher. 
Your task is to generate high-quality, engaging, grade-appropriate classroom quiz questions and answers.
CRITICAL MANDATE: Every single question in the returned set MUST be completely UNIQUE, distinct, and explore a different concept, fact, problem variation, or perspective.
Under NO circumstances repeat questions, create trivial rephrasings, or recycle identical answer choices.
Each question should be educational, clear, and include a helpful, encouraging explanation of the correct answer.

Supported question types are:
1. 'mcq': Multiple Choice. Generate 3 to 4 options (standard is 4, e.g. A, B, C, D) with unique IDs ('opt_1', 'opt_2', etc.) and exactly one correct Option ID.
2. 'true_false': True or False statement. Options must be exactly two elements with ID 'opt_t' (text: 'TRUE') and 'opt_f' (text: 'FALSE').
3. 'short_answer': Open-ended question where the student types a short answer. Provide the exact correct answer text in 'correctAnswerText' (e.g. 'Paris' or 'mammal').

The tone of questions and explanations should be highly engaging, enthusiastic, and suitable for the selected grade level. Ensure all option text, correct options, and answers are fully filled out and correct. Do not use markdown inside any of the returned strings.`;

    // Batching strategy to reliably support up to 100 questions without output token limits or timeouts
    // Generates in batches of up to 25 with strict uniqueness across all questions
    const batchSize = Math.min(25, targetCount);
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
        // If >65% identical significant keywords, consider it a duplicate/rephrase
        if (jaccard > 0.65) {
          return true;
        }
      }
      return false;
    }

    const subtopicAngles = [
      'Core definitions, fundamental principles, and essential terminology',
      'Real-world applications, practical case studies, and everyday examples',
      'Advanced problem-solving, comparisons, cause-and-effect relationships',
      'Historical timeline, fascinating trivia, and groundbreaking discoveries',
      'Critical thinking, common misconceptions, and synthesis problems',
      'Experimental methods, data interpretation, and quantitative calculations',
      'Global perspectives, comparative analyses, and interdisciplinary connections'
    ];

    let batchIndex = 0;
    const maxAttempts = totalBatches + 3; // allow up to 3 extra refill passes if duplicates are filtered

    while (collectedQuestions.length < targetCount && batchIndex < maxAttempts) {
      const remainingNeeded = targetCount - collectedQuestions.length;
      const currentBatchCount = Math.min(batchSize, remainingNeeded);
      const angle = subtopicAngles[batchIndex % subtopicAngles.length];

      // Build sample of all existing questions so Gemini never repeats any of them
      const existingSummary = collectedQuestions
        .slice(-60) // pass up to 60 previous questions to stay well within token limits
        .map((q, idx) => `${idx + 1}. ${q.question}`)
        .join('\n');

      const uniquenessConstraint = collectedQuestions.length > 0
        ? `\n\nCRITICAL MANDATE - ZERO DUPLICATES (Must generate ${currentBatchCount} COMPLETELY NEW questions):
Under NO circumstances repeat, rephrase, or recycle any of the following questions already generated:
${existingSummary}

Focus specifically on this distinct angle: "${angle}".
Every single question MUST present a completely novel question statement, different answer choices, and explore a fresh aspect of the topic!`
        : `\nPrimary focus area for this set: "${angle}". Ensure all questions are unique, creative, and varied.`;

      const userPrompt = `Generate exactly ${currentBatchCount} completely UNIQUE and DIFFERENT quiz questions about the topic: "${topic}".
Grade level: ${grade || 'General'}
Subject: ${subject || 'General'}
Allowed question types to include: ${types.join(', ')}. Please balance the requested types across the questions.${uniquenessConstraint}`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
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
      throw new Error('All candidate models failed or returned no valid questions.');
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
