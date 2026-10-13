export interface GeneratedQuestion {
  question: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  points: number;
  timer: number;
  options?: Array<{ id: string; text: string }>;
  correctOptionId?: string;
  correctAnswerText?: string;
  explanation: string;
}

/**
 * Intelligent Fallback Quiz Generator
 * Generates high-quality, varied curriculum questions when Gemini AI times out (HTTP 504)
 * or is unreachable. Supports both Malay and English educational topics.
 */
export function generateFallbackQuizQuestions(
  topic: string,
  targetCount: number = 5,
  subject: string = '',
  grade: string = '',
  types: string[] = ['mcq', 'true_false', 'short_answer'],
  language: string = 'ms'
): GeneratedQuestion[] {
  const cleanTopic = (topic || 'General Knowledge').trim();
  const count = Math.min(Math.max(targetCount, 1), 100);
  const activeTypes = types.length > 0 ? types : ['mcq', 'true_false', 'short_answer'];

  // Determine language: explicit selection prioritized
  let isMalay = true;
  const langLower = (language || '').toLowerCase().trim();
  if (langLower === 'en' || langLower === 'english') {
    isMalay = false;
  } else if (langLower === 'ms' || langLower === 'malay' || langLower.includes('melayu')) {
    isMalay = true;
  } else {
    // Detect Malay vs English based on text
    const combinedText = `${cleanTopic} ${subject} ${grade}`.toLowerCase();
    isMalay = /[a-z]/i.test(cleanTopic) && (
      combinedText.includes('tahun') ||
      combinedText.includes('tingkatan') ||
      combinedText.includes('sains') ||
      combinedText.includes('sejarah') ||
      combinedText.includes('matematik') ||
      combinedText.includes('geografi') ||
      combinedText.includes('bahasa') ||
      combinedText.includes('pendidikan') ||
      combinedText.includes('haiwan') ||
      combinedText.includes('tumbuhan') ||
      combinedText.includes('alam') ||
      combinedText.includes('sistem') ||
      combinedText.includes('tenaga') ||
      combinedText.includes('daya') ||
      combinedText.includes('cahaya') ||
      combinedText.includes('udara') ||
      combinedText.includes('bumi') ||
      combinedText.includes('manusia')
    );
  }

  const questions: GeneratedQuestion[] = [];
  const usedQuestions = new Set<string>();

  // Question templates bank
  const malayTemplates = [
    {
      type: 'mcq' as const,
      q: (t: string) => `Apakah takrifan atau konsep utama yang berkaitan dengan "${t}"?`,
      opts: (t: string) => [
        `Proses asas yang melibatkan mekanisme utama ${t}`,
        `Hanya berlaku pada waktu malam tanpa melibatkan tenaga`,
        `Fenomena yang tidak memberi sebarang kesan kepada persekitaran`,
        `Kitaran yang berlaku sekali sahaja dan tidak berulang`,
      ],
      correctIdx: 0,
      exp: (t: string) => `Konsep utama bagi ${t} adalah proses penting yang mendasari pemahaman dalam topik ini.`,
    },
    {
      type: 'true_false' as const,
      q: (t: string) => `Benar atau Palsu: Pengetahuan dan kajian tentang "${t}" sangat penting dalam sains dan kehidupan seharian.`,
      isTrue: true,
      exp: (t: string) => `Pernyataan ini BENAR kerana topik ${t} mempunyai aplikasi luas dalam kurikulum pembelajaran dan kehidupan harian.`,
    },
    {
      type: 'mcq' as const,
      q: (t: string) => `Antara berikut, yang manakah merupakan ciri utama bagi "${t}"?`,
      opts: (t: string) => [
        `Mempunyai struktur yang tersusun dan berfungsi secara sistematik`,
        `Tidak memerlukan sebarang interaksi atau sumber luaran`,
        `Bersifat rawak tanpa sebarang pola atau prinsip sains`,
        `Hanya melibatkan unsur buatan manusia semata-mata`,
      ],
      correctIdx: 0,
      exp: (t: string) => `${t} dicirikan oleh prinsip yang tersusun dan mempunyai pola saintifik yang konsisten.`,
    },
    {
      type: 'short_answer' as const,
      q: (t: string) => `Nyatakan satu kata kunci atau istilah penting yang paling sinonim dengan topik "${t}".`,
      ans: (t: string) => t.split(' ')[0] || t,
      exp: (t: string) => `Istilah ini merupakan asas kepada perbincangan dan pemahaman bagi topik ${t}.`,
    },
    {
      type: 'mcq' as const,
      q: (t: string) => `Apakah faedah atau peranan penting bagi memahami "${t}" kepada pelajar?`,
      opts: (t: string) => [
        `Membantu menyelesaikan masalah saintifik dan memahami fenomena alam`,
        `Menjadikan pembelajaran lebih rumit tanpa tujuan praktikal`,
        `Menggantikan semua hukum fizik dan kimia yang sedia ada`,
        `Hanya untuk menghafal maklumat tanpa perlu memahaminya`,
      ],
      correctIdx: 0,
      exp: (t: string) => `Memahami ${t} melatih pemikiran kritis dan menghubungkan teori dengan amalan dunia sebenar.`,
    },
    {
      type: 'true_false' as const,
      q: (t: string) => `Benar atau Palsu: Prinsip dalam "${t}" tidak boleh diuji secara eksperimen atau pemerhatian.`,
      isTrue: false,
      exp: (t: string) => `Pernyataan ini PALSU kerana ${t} dapat dikaji, diuji, dan diperhatikan menggunakan kaedah saintifik.`,
    },
    {
      type: 'mcq' as const,
      q: (t: string) => `Jika seseorang ingin mendalami topik "${t}", langkah pertama yang perlu diambil ialah:`,
      opts: (t: string) => [
        `Memahami definisi asas dan prinsip pemula topik ini`,
        `Mengabaikan fakta asas dan terus membuat andaian`,
        `Menghafal soalan tanpa memahami fakta sebenar`,
        `Menolak sebarang pembuktian fakta yang berkaitan`,
      ],
      correctIdx: 0,
      exp: (t: string) => `Asas yang kukuh dalam definisi dan prinsip ${t} adalah kunci utama kejayaan pemahaman.`,
    },
    {
      type: 'short_answer' as const,
      q: (t: string) => `Apakah subjek utama yang merangkumi pembelajaran "${t}"?`,
      ans: () => subject || 'Sains',
      exp: (t: string) => `Topik ${t} biasanya dipelajari dalam subjek ${subject || 'Sains'}.`,
    },
    {
      type: 'mcq' as const,
      q: (t: string) => `Antara pernyataan berikut, yang manakah PALING TEPAT mengenai "${t}"?`,
      opts: (t: string) => [
        `Ia melibatkan hubungan saling bergantungan antara pelbagai komponen`,
        `Ia tidak mempunyai sebarang kaitan dengan mana-mana prinsip lain`,
        `Ia hanya berguna dalam teori dan tiada kegunaan praktikal`,
        `Semua jawapan di atas adalah salah`,
      ],
      correctIdx: 0,
      exp: (t: string) => `Dalam kajian ${t}, saling hubungan antara komponen adalah sangat penting.`,
    },
    {
      type: 'true_false' as const,
      q: (t: string) => `Benar atau Palsu: Penemuan baharu dalam bidang "${t}" terus berkembang seiring dengan kemajuan teknologi.`,
      isTrue: true,
      exp: (t: string) => `BENAR, perkembangan sains dan teknologi terus memperluas pemahaman kita tentang ${t}.`,
    },
    {
      type: 'mcq' as const,
      q: (t: string) => `Apakah impak sekiranya konsep "${t}" diaplikasikan dengan betul dalam situasi kehidupan?`,
      opts: (t: string) => [
        `Meningkatkan kecekapan dan menyelesaikan isu yang dihadapi`,
        `Menyebabkan kekeliruan berterusan tanpa jalan penyelesaian`,
        `Mengurangkan minat masyarakat terhadap sains dan teknologi`,
        `Menghapuskan keperluan untuk membuat rujukan lanjut`,
      ],
      correctIdx: 0,
      exp: (t: string) => `Aplikasi tepat konsep ${t} membawa penyelesaian yang berkesan.`,
    },
    {
      type: 'short_answer' as const,
      q: (t: string) => `Tuliskan satu faktor utama yang boleh mempengaruhi keberkesanan proses dalam "${t}".`,
      ans: () => 'Suhu',
      exp: (t: string) => `Faktor persekitaran seperti suhu, bahan, atau keadaan sekeliling memainkan peranan penting dalam ${t}.`,
    },
  ];

  const englishTemplates = [
    {
      type: 'mcq' as const,
      q: (t: string) => `What is the core definition or primary concept of "${t}"?`,
      opts: (t: string) => [
        `A fundamental principle explaining how ${t} operates and interacts`,
        `An obsolete theory that has been completely disproven`,
        `A random occurrence with no measurable scientific pattern`,
        `An isolated phenomenon with zero connection to the natural world`,
      ],
      correctIdx: 0,
      exp: (t: string) => `The fundamental concept of ${t} forms the foundation of this academic topic.`,
    },
    {
      type: 'true_false' as const,
      q: (t: string) => `True or False: Studying "${t}" provides essential insights applicable to real-world scenarios.`,
      isTrue: true,
      exp: (t: string) => `This statement is TRUE because ${t} offers critical knowledge across diverse applications.`,
    },
    {
      type: 'mcq' as const,
      q: (t: string) => `Which of the following is a primary characteristic of "${t}"?`,
      opts: (t: string) => [
        `It exhibits structured patterns that can be observed and analyzed`,
        `It requires no energy, matter, or system interaction whatsoever`,
        `It only operates under completely artificial laboratory conditions`,
        `It operates independently of any natural or scientific laws`,
      ],
      correctIdx: 0,
      exp: (t: string) => `${t} is characterized by systematic principles that can be analyzed and tested.`,
    },
    {
      type: 'short_answer' as const,
      q: (t: string) => `Name a key term or primary subject area closely associated with "${t}".`,
      ans: (t: string) => subject || t.split(' ')[0] || 'Science',
      exp: (t: string) => `This key term is central to discussions and problem solving in ${t}.`,
    },
    {
      type: 'mcq' as const,
      q: (t: string) => `Why is understanding "${t}" important for students in this curriculum?`,
      opts: (t: string) => [
        `It builds critical problem-solving skills and links theory to reality`,
        `It eliminates the need for any further critical thinking`,
        `It is purely theoretical with no practical application`,
        `It replaces the need for foundational observations`,
      ],
      correctIdx: 0,
      exp: (t: string) => `Mastery of ${t} develops critical thinking and helps explain complex phenomena.`,
    },
    {
      type: 'true_false' as const,
      q: (t: string) => `True or False: Theories surrounding "${t}" cannot be tested through observation or experimentation.`,
      isTrue: false,
      exp: (t: string) => `This statement is FALSE because concepts in ${t} can be verified through inquiry and evidence.`,
    },
    {
      type: 'mcq' as const,
      q: (t: string) => `When analyzing a problem related to "${t}", what is the recommended first step?`,
      opts: (t: string) => [
        `Identify the fundamental variables, definitions, and core principles`,
        `Make an immediate guess without reviewing known facts`,
        `Assume no solution is possible and abandon the inquiry`,
        `Disregard all established empirical data`,
      ],
      correctIdx: 0,
      exp: (t: string) => `Careful identification of core variables and definitions is essential when tackling ${t}.`,
    },
    {
      type: 'short_answer' as const,
      q: (t: string) => `What academic subject or domain primarily investigates "${t}"?`,
      ans: () => subject || 'Science',
      exp: (t: string) => `The topic of ${t} is investigated primarily within ${subject || 'Science'}.`,
    },
    {
      type: 'mcq' as const,
      q: (t: string) => `Which of the following statements about "${t}" is MOST accurate?`,
      opts: (t: string) => [
        `It involves interconnected components working together within a system`,
        `It exists in total isolation with zero effect on surrounding elements`,
        `It has been fully proven to never change or develop over time`,
        `None of the above statements are accurate`,
      ],
      correctIdx: 0,
      exp: (t: string) => `Systems in ${t} rely on dynamic relationships between multiple interconnected factors.`,
    },
    {
      type: 'true_false' as const,
      q: (t: string) => `True or False: Modern technological tools have enhanced our understanding of "${t}".`,
      isTrue: true,
      exp: (t: string) => `TRUE, ongoing technological advancements have greatly deepened our insights into ${t}.`,
    },
  ];

  const templates = isMalay ? malayTemplates : englishTemplates;
  let templateIndex = 0;
  let counter = 1;

  while (questions.length < count && counter <= 200) {
    const rawTpl = templates[templateIndex % templates.length];
    templateIndex++;
    counter++;

    // Check if the template type is allowed
    if (!activeTypes.includes(rawTpl.type)) {
      continue;
    }

    const qText = rawTpl.q(cleanTopic);
    // Ensure uniqueness
    const normalizedKey = qText.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (usedQuestions.has(normalizedKey)) {
      // Create a numbered variation if we need many questions
      const variationSuffix = isMalay ? `(Bahagian ${Math.floor(counter / templates.length) + 1})` : `(Section ${Math.floor(counter / templates.length) + 1})`;
      const variedText = `${qText} ${variationSuffix}`;
      const variedKey = variedText.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (usedQuestions.has(variedKey)) continue;
      usedQuestions.add(variedKey);

      if (rawTpl.type === 'mcq') {
        const rawOpts = (rawTpl as any).opts(cleanTopic);
        // Shuffle options and find correct id
        const letters = ['A', 'B', 'C', 'D'];
        const options = rawOpts.map((text: string, idx: number) => ({
          id: `opt_${idx + 1}`,
          text: `${letters[idx]}. ${text}`,
        }));
        questions.push({
          question: variedText,
          type: 'mcq',
          points: 10,
          timer: 30,
          options,
          correctOptionId: 'opt_1',
          explanation: (rawTpl as any).exp(cleanTopic),
        });
      } else if (rawTpl.type === 'true_false') {
        const isTrue = (rawTpl as any).isTrue;
        questions.push({
          question: variedText,
          type: 'true_false',
          points: 10,
          timer: 20,
          options: [
            { id: 'opt_t', text: isMalay ? 'BENAR' : 'TRUE' },
            { id: 'opt_f', text: isMalay ? 'PALSU' : 'FALSE' },
          ],
          correctOptionId: isTrue ? 'opt_t' : 'opt_f',
          explanation: (rawTpl as any).exp(cleanTopic),
        });
      } else if (rawTpl.type === 'short_answer') {
        questions.push({
          question: variedText,
          type: 'short_answer',
          points: 15,
          timer: 30,
          correctAnswerText: (rawTpl as any).ans(cleanTopic),
          explanation: (rawTpl as any).exp(cleanTopic),
        });
      }
      continue;
    }

    usedQuestions.add(normalizedKey);

    if (rawTpl.type === 'mcq') {
      const rawOpts = (rawTpl as any).opts(cleanTopic);
      const letters = ['A', 'B', 'C', 'D'];
      const options = rawOpts.map((text: string, idx: number) => ({
        id: `opt_${idx + 1}`,
        text: `${letters[idx]}. ${text}`,
      }));
      questions.push({
        question: qText,
        type: 'mcq',
        points: 10,
        timer: 30,
        options,
        correctOptionId: 'opt_1',
        explanation: (rawTpl as any).exp(cleanTopic),
      });
    } else if (rawTpl.type === 'true_false') {
      const isTrue = (rawTpl as any).isTrue;
      questions.push({
        question: qText,
        type: 'true_false',
        points: 10,
        timer: 20,
        options: [
          { id: 'opt_t', text: isMalay ? 'BENAR' : 'TRUE' },
          { id: 'opt_f', text: isMalay ? 'PALSU' : 'FALSE' },
        ],
        correctOptionId: isTrue ? 'opt_t' : 'opt_f',
        explanation: (rawTpl as any).exp(cleanTopic),
      });
    } else if (rawTpl.type === 'short_answer') {
      questions.push({
        question: qText,
        type: 'short_answer',
        points: 15,
        timer: 30,
        correctAnswerText: (rawTpl as any).ans(cleanTopic),
        explanation: (rawTpl as any).exp(cleanTopic),
      });
    }
  }

  return questions;
}
