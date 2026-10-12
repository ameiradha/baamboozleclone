import * as XLSX from 'xlsx';
import { Question } from '../types/game';

export interface ParsedImportResult {
  questions: Question[];
  errors: string[];
  warnings: string[];
}

export class ExcelService {
  /**
   * Generates and triggers download of a beautifully formatted Excel template (.xlsx)
   */
  public static downloadTemplate(filename: string = 'Quiz_Questions_Template.xlsx'): void {
    const headers = [
      'Question',
      'Type',
      'Option A',
      'Option B',
      'Option C',
      'Option D',
      'Correct Answer',
      'Points',
      'Timer (Seconds)',
      'Explanation',
    ];

    const sampleRows = [
      [
        'What is the capital city of France?',
        'mcq',
        'Berlin',
        'Madrid',
        'Paris',
        'Rome',
        'C',
        15,
        30,
        'Paris is the capital and largest city of France.',
      ],
      [
        'Which planet is known as the Red Planet?',
        'mcq',
        'Venus',
        'Mars',
        'Jupiter',
        'Mercury',
        'B',
        10,
        25,
        'Mars appears red because of iron oxide (rust) on its surface.',
      ],
      [
        'Water freezes at 0 degrees Celsius at sea level.',
        'true_false',
        'TRUE',
        'FALSE',
        '',
        '',
        'A',
        10,
        20,
        'The freezing point of water is 0°C (32°F).',
      ],
      [
        'What is 15 multiplied by 4?',
        'mcq',
        '50',
        '55',
        '60',
        '65',
        'C',
        10,
        20,
        '15 x 4 = 60',
      ],
      [
        'Which animal is the largest mammal on Earth?',
        'mcq',
        'African Elephant',
        'Blue Whale',
        'Giraffe',
        'Hippopotamus',
        'B',
        15,
        25,
        'Blue whales are the largest animals ever known to have lived.',
      ],
      [
        'Sound travels faster through air than through water.',
        'true_false',
        'TRUE',
        'FALSE',
        '',
        '',
        'B',
        10,
        20,
        'Sound travels about 4 times faster in water than in air.',
      ],
      [
        'What gas do plants absorb from the atmosphere for photosynthesis?',
        'short_answer',
        '',
        '',
        '',
        '',
        'Carbon Dioxide',
        20,
        30,
        'Plants absorb carbon dioxide (CO2) and emit oxygen.',
      ],
      [
        'How many continents are there on planet Earth?',
        'mcq',
        '5',
        '6',
        '7',
        '8',
        'C',
        10,
        20,
        'The 7 continents are Asia, Africa, North America, South America, Antarctica, Europe, and Australia.',
      ],
    ];

    // Create worksheet from AoA (Array of Arrays)
    const wsData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set nice column widths
    ws['!cols'] = [
      { wch: 45 }, // Question
      { wch: 14 }, // Type
      { wch: 20 }, // Option A
      { wch: 20 }, // Option B
      { wch: 20 }, // Option C
      { wch: 20 }, // Option D
      { wch: 18 }, // Correct Answer
      { wch: 10 }, // Points
      { wch: 15 }, // Timer (Seconds)
      { wch: 40 }, // Explanation
    ];

    // Instructions sheet for teachers
    const instructionsData = [
      ['QUIZ QUESTION TEMPLATE GUIDE FOR TEACHERS'],
      [''],
      ['Column', 'Description', 'Allowed Values / Examples'],
      ['Question', 'The question prompt shown to students', 'Any question text'],
      ['Type', 'Question type', 'mcq (Multiple Choice), true_false, or short_answer'],
      ['Option A', 'First answer choice (MCQ or TRUE)', 'e.g. Paris or TRUE'],
      ['Option B', 'Second answer choice (MCQ or FALSE)', 'e.g. London or FALSE'],
      ['Option C', 'Third answer choice (optional for MCQ)', 'e.g. Berlin'],
      ['Option D', 'Fourth answer choice (optional for MCQ)', 'e.g. Rome'],
      ['Correct Answer', 'The winning option or answer text', 'A, B, C, D (or the exact text like "Paris")'],
      ['Points', 'Score value for correct answer', 'e.g. 10, 15, 20, 25 (default 10)'],
      ['Timer (Seconds)', 'Countdown timer in seconds', 'e.g. 15, 20, 30, 45, 60 (0 for no timer)'],
      ['Explanation', 'Shown when answer is revealed', 'Educational explanation or fun facts'],
      [''],
      ['Tip: You can add as many question rows as you like! Simply save as .xlsx and upload.'],
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 18 }, { wch: 40 }, { wch: 40 }];

    // Create workbook and append sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Trigger file download
    XLSX.writeFile(wb, filename);
  }

  /**
   * Parse an Excel file (.xlsx or .xls) or CSV from ArrayBuffer / File
   */
  public static async parseFile(
    file: File,
    gameId: string = 'imported_game'
  ): Promise<ParsedImportResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            resolve({
              questions: [],
              errors: ['The uploaded file contains no sheets.'],
              warnings: [],
            });
            return;
          }

          // Read the first sheet (or 'Questions' sheet if present)
          const targetSheetName =
            workbook.SheetNames.find((s) => s.toLowerCase() === 'questions') ||
            workbook.SheetNames[0];
          const sheet = workbook.Sheets[targetSheetName];

          // Convert sheet to array of rows
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          if (!rows || rows.length <= 1) {
            resolve({
              questions: [],
              errors: ['No question rows found in the sheet.'],
              warnings: [],
            });
            return;
          }

          const parsed = this.parseSheetRows(rows, gameId);
          resolve(parsed);
        } catch (err: any) {
          reject(new Error(`Failed to parse Excel file: ${err.message || err}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read the file. Please check file permissions.'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Internal helper to parse 2D array of cells into Questions
   */
  private static parseSheetRows(rows: any[][], gameId: string): ParsedImportResult {
    const questions: Question[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Find header row
    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const row = rows[r];
      if (
        row &&
        row.some(
          (c) =>
            typeof c === 'string' &&
            (c.toLowerCase().includes('question') || c.toLowerCase().includes('soalan'))
        )
      ) {
        headerRowIdx = r;
        break;
      }
    }

    const header = rows[headerRowIdx].map((c) =>
      String(c || '').toLowerCase().trim()
    );

    // Map column indexes
    const colMap = {
      question: header.findIndex((h) => h.includes('question') || h.includes('soalan')),
      type: header.findIndex((h) => h.includes('type') || h.includes('jenis')),
      optA: header.findIndex(
        (h) => h.includes('option a') || h.includes('opt a') || h.includes('pilihan a')
      ),
      optB: header.findIndex(
        (h) => h.includes('option b') || h.includes('opt b') || h.includes('pilihan b')
      ),
      optC: header.findIndex(
        (h) => h.includes('option c') || h.includes('opt c') || h.includes('pilihan c')
      ),
      optD: header.findIndex(
        (h) => h.includes('option d') || h.includes('opt d') || h.includes('pilihan d')
      ),
      correct: header.findIndex(
        (h) =>
          h.includes('correct') ||
          h.includes('jawapan') ||
          h.includes('answer') ||
          h.includes('betul')
      ),
      points: header.findIndex((h) => h.includes('point') || h.includes('markah')),
      timer: header.findIndex((h) => h.includes('timer') || h.includes('masa') || h.includes('second')),
      explanation: header.findIndex(
        (h) => h.includes('explanation') || h.includes('penerangan') || h.includes('alasan')
      ),
    };

    // If colMap couldn't find columns by name, fallback to standard column order
    if (colMap.question === -1) colMap.question = 0;
    if (colMap.type === -1) colMap.type = 1;
    if (colMap.optA === -1) colMap.optA = 2;
    if (colMap.optB === -1) colMap.optB = 3;
    if (colMap.optC === -1) colMap.optC = 4;
    if (colMap.optD === -1) colMap.optD = 5;
    if (colMap.correct === -1) colMap.correct = 6;
    if (colMap.points === -1) colMap.points = 7;
    if (colMap.timer === -1) colMap.timer = 8;
    if (colMap.explanation === -1) colMap.explanation = 9;

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const qText = String(row[colMap.question] || '').trim();
      if (!qText) continue; // skip blank row

      const rawType = String(row[colMap.type] || '').toLowerCase().trim();
      let type: Question['type'] = 'mcq';
      if (rawType.includes('true') || rawType.includes('false') || rawType.includes('tf')) {
        type = 'true_false';
      } else if (rawType.includes('short') || rawType.includes('text') || rawType.includes('pendek')) {
        type = 'short_answer';
      }

      const optA = String(row[colMap.optA] || '').trim();
      const optB = String(row[colMap.optB] || '').trim();
      const optC = String(row[colMap.optC] || '').trim();
      const optD = String(row[colMap.optD] || '').trim();
      const rawCorrect = String(row[colMap.correct] || '').trim();
      const points = parseInt(String(row[colMap.points] || ''), 10) || 10;
      const timer = parseInt(String(row[colMap.timer] || ''), 10) || 25;
      const explanation = String(row[colMap.explanation] || '').trim();

      const qId = `q_import_${Date.now()}_${r}`;

      if (type === 'true_false') {
        const isTrueCorrect =
          rawCorrect.toUpperCase() === 'A' ||
          rawCorrect.toUpperCase() === 'TRUE' ||
          rawCorrect.toUpperCase() === 'T' ||
          rawCorrect.toUpperCase() === 'BETUL' ||
          rawCorrect.toUpperCase() === '1';

        questions.push({
          id: qId,
          gameId,
          order: questions.length + 1,
          question: qText,
          type: 'true_false',
          points,
          timer,
          explanation: explanation || undefined,
          options: [
            { id: 'opt_t', text: optA || 'TRUE' },
            { id: 'opt_f', text: optB || 'FALSE' },
          ],
          correctOptionId: isTrueCorrect ? 'opt_t' : 'opt_f',
        });
      } else if (type === 'short_answer') {
        questions.push({
          id: qId,
          gameId,
          order: questions.length + 1,
          question: qText,
          type: 'short_answer',
          points,
          timer,
          explanation: explanation || undefined,
          correctAnswerText: rawCorrect || optA || '',
        });
      } else {
        // Standard MCQ
        const optionsList: { id: string; text: string }[] = [];
        if (optA) optionsList.push({ id: `opt_${qId}_a`, text: optA });
        if (optB) optionsList.push({ id: `opt_${qId}_b`, text: optB });
        if (optC) optionsList.push({ id: `opt_${qId}_c`, text: optC });
        if (optD) optionsList.push({ id: `opt_${qId}_d`, text: optD });

        if (optionsList.length < 2) {
          warnings.push(`Row ${r + 1}: "${qText.substring(0, 30)}..." has fewer than 2 options.`);
        }

        // Determine correct option ID
        let correctId = optionsList[0]?.id || `opt_${qId}_a`;
        const upperAns = rawCorrect.toUpperCase();

        if (upperAns === 'A' || upperAns === '1') {
          correctId = optionsList[0]?.id || correctId;
        } else if (upperAns === 'B' || upperAns === '2') {
          correctId = optionsList[1]?.id || correctId;
        } else if (upperAns === 'C' || upperAns === '3') {
          correctId = optionsList[2]?.id || correctId;
        } else if (upperAns === 'D' || upperAns === '4') {
          correctId = optionsList[3]?.id || correctId;
        } else {
          // Check if matches option text exactly
          const matchOpt = optionsList.find(
            (o) => o.text.toLowerCase().trim() === rawCorrect.toLowerCase().trim()
          );
          if (matchOpt) correctId = matchOpt.id;
        }

        questions.push({
          id: qId,
          gameId,
          order: questions.length + 1,
          question: qText,
          type: 'mcq',
          points,
          timer,
          explanation: explanation || undefined,
          options: optionsList,
          correctOptionId: correctId,
        });
      }
    }

    return { questions, errors, warnings };
  }
}
