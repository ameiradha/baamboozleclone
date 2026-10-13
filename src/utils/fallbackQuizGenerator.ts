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
 * Intelligent Curriculum-Aware Fallback Quiz Generator
 * Generates authentic, syllabus-accurate questions strictly based on the topic
 * and teacher-provided points/notes.
 */
export function generateFallbackQuizQuestions(
  topic: string,
  targetCount: number = 5,
  subject: string = '',
  grade: string = '',
  types: string[] = ['mcq', 'true_false', 'short_answer'],
  language: string = 'ms',
  points?: string
): GeneratedQuestion[] {
  const cleanTopic = (topic || 'Pengetahuan Am').trim();
  const count = Math.min(Math.max(targetCount, 1), 100);
  const activeTypes = types.length > 0 ? types : ['mcq', 'true_false', 'short_answer'];

  // Language detection
  let isMalay = true;
  const langLower = (language || '').toLowerCase().trim();
  if (langLower === 'en' || langLower === 'english') {
    isMalay = false;
  } else if (langLower === 'ms' || langLower === 'malay' || langLower.includes('melayu')) {
    isMalay = true;
  } else {
    const combined = `${cleanTopic} ${subject} ${grade}`.toLowerCase();
    isMalay = !/^[a-z\s]+$/i.test(combined) || combined.includes('sains') || combined.includes('sejarah') || combined.includes('matematik') || combined.includes('tingkatan') || combined.includes('tahun');
  }

  const questions: GeneratedQuestion[] = [];
  const usedKeys = new Set<string>();

  // Helper to shuffle array
  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Parse teacher points / notes if provided
  const parsedPoints: string[] = [];
  if (points && points.trim()) {
    const rawLines = points
      .split(/[\n\r]+/)
      .map((line) => line.replace(/^[\s•\-\*\d\.\)\(\]]+/, '').trim())
      .filter((line) => line.length >= 6);

    for (const line of rawLines) {
      if (!parsedPoints.includes(line)) {
        parsedPoints.push(line);
      }
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 1: Generate questions strictly from provided points
  // -------------------------------------------------------------
  if (parsedPoints.length > 0) {
    let pointIdx = 0;
    let variation = 0;

    while (questions.length < count && variation < 5) {
      for (let i = 0; i < parsedPoints.length && questions.length < count; i++) {
        const pt = parsedPoints[i];
        const currentType = activeTypes[(questions.length + variation) % activeTypes.length];

        if (currentType === 'true_false') {
          // Generate True or False question
          const isTrue = questions.length % 2 === 0;
          let statement = pt;

          if (!isTrue) {
            // Create a plausible false version
            if (isMalay) {
              if (statement.includes(' memerlukan ')) statement = statement.replace(' memerlukan ', ' TIDAK memerlukan ');
              else if (statement.includes(' menghasilkan ')) statement = statement.replace(' menghasilkan ', ' TIDAK menghasilkan ');
              else if (statement.includes(' adalah ')) statement = statement.replace(' adalah ', ' BUKAN ');
              else if (statement.includes(' merupakan ')) statement = statement.replace(' merupakan ', ' BUKAN ');
              else if (statement.includes(' berlaku ')) statement = statement.replace(' berlaku ', ' TIDAK berlaku ');
              else statement = `Pernyataan songsang: ${statement.replace(/^(semua|setiap|antara)/i, 'Tiada sebarang')}`;
            } else {
              if (statement.includes(' requires ')) statement = statement.replace(' requires ', ' DOES NOT require ');
              else if (statement.includes(' produces ')) statement = statement.replace(' produces ', ' DOES NOT produce ');
              else if (statement.includes(' is ')) statement = statement.replace(' is ', ' is NOT ');
              else if (statement.includes(' are ')) statement = statement.replace(' are ', ' are NOT ');
              else statement = `False assertion: ${statement.replace(/^(all|every|each)/i, 'No')}`;
            }
          }

          const qText = isMalay
            ? `Benar atau Palsu: "${statement}"`
            : `True or False: "${statement}"`;

          const key = qText.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!usedKeys.has(key)) {
            usedKeys.add(key);
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
              explanation: isMalay
                ? `Berdasarkan nota pembelajaran: "${pt}". Jawapan adalah ${isTrue ? 'BENAR' : 'PALSU'}.`
                : `Based on the provided notes: "${pt}". The answer is ${isTrue ? 'TRUE' : 'FALSE'}.`,
            });
          }
        } else if (currentType === 'short_answer') {
          // Extract a significant word from point
          const words = pt.split(/\s+/).filter((w) => w.length > 4 && !/^(adalah|ialah|kerana|dengan|untuk|yang|pada|dalam|which|there|their|these|about|after|before)$/i.test(w));
          const targetWord = words[Math.floor(Math.random() * words.length)] || cleanTopic;
          const cleanTarget = targetWord.replace(/[^a-zA-Z0-9\-_]/g, '');

          const qText = isMalay
            ? `Berdasarkan nota tajuk "${cleanTopic}": Lengkapkan atau nyatakan istilah penting bagi maklumat berikut: "${pt.replace(new RegExp(cleanTarget, 'gi'), '_____')}"`
            : `Based on the notes for "${cleanTopic}": Identify the missing key term: "${pt.replace(new RegExp(cleanTarget, 'gi'), '_____')}"`;

          const key = qText.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!usedKeys.has(key)) {
            usedKeys.add(key);
            questions.push({
              question: qText,
              type: 'short_answer',
              points: 15,
              timer: 30,
              correctAnswerText: cleanTarget,
              explanation: isMalay
                ? `Istilah yang tepat mengikut nota yang diberikan ialah: "${cleanTarget}". (${pt})`
                : `The correct term from the provided notes is: "${cleanTarget}". (${pt})`,
            });
          }
        } else {
          // MCQ
          const qText = isMalay
            ? `Berdasarkan isi penting tajuk "${cleanTopic}", manakah pernyataan yang TEPAT berkaitan: "${pt.slice(0, 60)}..."?`
            : `Based on the key points for "${cleanTopic}", which statement is ACCURATE regarding: "${pt.slice(0, 60)}..."?`;

          const otherPoints = parsedPoints.filter((p) => p !== pt);
          const distractors = isMalay
            ? [
                `Pernyataan yang bercanggah dengan fakta nota ${cleanTopic}`,
                `Proses ini langsung tidak melibatkan faktor yang dinyatakan`,
                `Hanya berlaku dalam keadaan sebaliknya tanpa sebarang kesan`,
              ]
            : [
                `A statement that directly contradicts the notes for ${cleanTopic}`,
                `This process does not involve any of the stated factors`,
                `Only occurs under inverse circumstances with no valid effect`,
              ];

          const allChoices = [
            { text: pt, isCorrect: true },
            { text: otherPoints[0] ? `Bukan fokus utama: ${otherPoints[0].slice(0, 50)}...` : distractors[0], isCorrect: false },
            { text: distractors[1], isCorrect: false },
            { text: distractors[2], isCorrect: false },
          ];

          const shuffled = shuffle(allChoices);
          const options = shuffled.map((c, idx) => ({
            id: `opt_${idx + 1}`,
            text: c.text,
          }));
          const correctOpt = options[shuffled.findIndex((c) => c.isCorrect)] || options[0];

          const key = qText.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!usedKeys.has(key)) {
            usedKeys.add(key);
            questions.push({
              question: qText,
              type: 'mcq',
              points: 10,
              timer: 30,
              options,
              correctOptionId: correctOpt.id,
              explanation: isMalay
                ? `Pernyataan yang tepat seperti tercatat dalam nota isi penting ialah: "${pt}".`
                : `The accurate statement directly matching the provided notes is: "${pt}".`,
            });
          }
        }
      }
      variation++;
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 2: Domain-specific curriculum banks by topic name
  // -------------------------------------------------------------
  const topicLower = cleanTopic.toLowerCase();

  // Knowledge bases for common Malaysian & General school subjects
  interface CurriculumItem {
    q_ms: string;
    q_en: string;
    type: 'mcq' | 'true_false' | 'short_answer';
    opts_ms?: string[];
    opts_en?: string[];
    correctIdx?: number;
    isTrue?: boolean;
    ans_ms?: string;
    ans_en?: string;
    exp_ms: string;
    exp_en: string;
  }

  const domainBank: CurriculumItem[] = [];

  // Check Science / Fotosintesis / Tumbuhan
  if (topicLower.includes('foto') || topicLower.includes('tumbuh') || topicLower.includes('plant') || topicLower.includes('klorofil')) {
    domainBank.push(
      {
        q_ms: 'Apakah organel sel tumbuhan yang mengandungi klorofil dan menjadi tapak berlakunya fotosintesis?',
        q_en: 'Which plant cell organelle contains chlorophyll and serves as the site for photosynthesis?',
        type: 'mcq',
        opts_ms: ['Kloroplas', 'Mitokondria', 'Nukleus', 'Vakuol'],
        opts_en: ['Chloroplast', 'Mitochondria', 'Nucleus', 'Vacuole'],
        correctIdx: 0,
        exp_ms: 'Kloroplas mengandungi pigmen klorofil yang menyerap tenaga cahaya matahari.',
        exp_en: 'Chloroplasts contain the chlorophyll pigment that captures sunlight energy.',
      },
      {
        q_ms: 'Benar atau Palsu: Gas oksigen dibebaskan sebagai hasil sampingan semasa fotosintesis.',
        q_en: 'True or False: Oxygen gas is released as a byproduct during photosynthesis.',
        type: 'true_false',
        isTrue: true,
        exp_ms: 'BENAR, fotosintesis menggunakan karbon dioksida dan membebaskan gas oksigen ke atmosfera.',
        exp_en: 'TRUE, photosynthesis consumes carbon dioxide and releases oxygen gas into the atmosphere.',
      },
      {
        q_ms: 'Apakah dua bahan utama yang diperlukan oleh tumbuhan hijau untuk menjalankan proses fotosintesis selain cahaya matahari?',
        q_en: 'Which two raw materials do green plants require for photosynthesis besides sunlight?',
        type: 'mcq',
        opts_ms: ['Air dan karbon dioksida', 'Oksigen dan nitrogen', 'Glukosa dan hidrogen', 'Baja dan karbon monoksida'],
        opts_en: ['Water and carbon dioxide', 'Oxygen and nitrogen', 'Glucose and hydrogen', 'Fertilizer and carbon monoxide'],
        correctIdx: 0,
        exp_ms: 'Persamaan perkataan fotosintesis ialah: Air + Karbon Dioksida -> Glukosa + Oksigen (dengan kehadiran cahaya dan klorofil).',
        exp_en: 'The photosynthesis equation is: Water + Carbon Dioxide -> Glucose + Oxygen (in the presence of light and chlorophyll).',
      },
      {
        q_ms: 'Namakan pigmen hijau yang menyerap tenaga cahaya matahari di dalam daun.',
        q_en: 'Name the green pigment in leaves that absorbs sunlight energy.',
        type: 'short_answer',
        ans_ms: 'Klorofil',
        ans_en: 'Chlorophyll',
        exp_ms: 'Klorofil adalah pigmen hijau yang memerangkap cahaya matahari untuk sintesis makanan.',
        exp_en: 'Chlorophyll is the green pigment that traps sunlight for synthesizing food.',
      },
      {
        q_ms: 'Benar atau Palsu: Proses fotosintesis boleh berlaku secara aktif dalam kegelapan malam tanpa sebarang cahaya.',
        q_en: 'True or False: Photosynthesis can occur actively in pitch darkness without any light source.',
        type: 'true_false',
        isTrue: false,
        exp_ms: 'PALSU, fotosintesis memerlukan tenaga cahaya (terutamanya cahaya matahari) untuk mengaktifkan tindak balas.',
        exp_en: 'FALSE, photosynthesis strictly requires light energy to drive the chemical reaction.',
      }
    );
  }

  // Check Animals / Haiwan / Mamalia / Klasifikasi
  if (topicLower.includes('haiwan') || topicLower.includes('animal') || topicLower.includes('mamalia') || topicLower.includes('reptil') || topicLower.includes('burung')) {
    domainBank.push(
      {
        q_ms: 'Antara ciri berikut, yang manakah merupakan ciri khusus haiwan mamalia?',
        q_en: 'Which of the following is a key characteristic of mammals?',
        type: 'mcq',
        opts_ms: ['Mempunyai bulu/rambut dan menyusukan anak', 'Bertelur dan bernafas melalui insang', 'Berdarah sejuk dan bersisik kering', 'Bermetamorfosis dari berudu'],
        opts_en: ['Have hair/fur and nurse young with milk', 'Lay eggs and breathe through gills', 'Cold-blooded with dry scales', 'Metamorphose from tadpoles'],
        correctIdx: 0,
        exp_ms: 'Mamalia melahirkan anak (kebanyakannya), mempunyai kelenjar susu, dan tubuh dilitupi bulu atau rambut.',
        exp_en: 'Mammals are vertebrate animals characterized by the presence of mammary glands and fur/hair.',
      },
      {
        q_ms: 'Benar atau Palsu: Haiwan reptilia bernafas menggunakan peparu dan berdarah sejuk (poikilotermik).',
        q_en: 'True or False: Reptiles breathe using lungs and are cold-blooded (poikilothermic).',
        type: 'true_false',
        isTrue: true,
        exp_ms: 'BENAR, reptilia mempunyai kulit bersisik kering, berdarah sejuk, dan bernafas melalui peparu.',
        exp_en: 'TRUE, reptiles are cold-blooded vertebrates that breathe air using lungs.',
      },
      {
        q_ms: 'Antara haiwan berikut, yang manakah tergolong dalam kategori haiwan herbivor?',
        q_en: 'Which of the following animals is classified as a herbivore?',
        type: 'mcq',
        opts_ms: ['Lembu', 'Singa', 'Harimau', 'Helang'],
        opts_en: ['Cow', 'Lion', 'Tiger', 'Eagle'],
        correctIdx: 0,
        exp_ms: 'Herbivor ialah haiwan yang hanya memakan tumbuhan atau bahagian tumbuhan.',
        exp_en: 'Herbivores are animals anatomically and physiologically adapted to eating plant material.',
      }
    );
  }

  // Check Solar System / Sistem Suria / Angkasa
  if (topicLower.includes('suria') || topicLower.includes('solar') || topicLower.includes('planet') || topicLower.includes('angkasa') || topicLower.includes('space') || topicLower.includes('bumi')) {
    domainBank.push(
      {
        q_ms: 'Apakah jasad cakerawala yang terletak di pusat Sistem Suria kita?',
        q_en: 'Which celestial body is located at the center of our Solar System?',
        type: 'mcq',
        opts_ms: ['Matahari', 'Bumi', 'Bulan', 'Musytari'],
        opts_en: ['The Sun', 'Earth', 'The Moon', 'Jupiter'],
        correctIdx: 0,
        exp_ms: 'Matahari ialah sebuah bintang yang menjadi pusat graviti Sistem Suria.',
        exp_en: 'The Sun is the star around which planets orbit, holding the solar system together.',
      },
      {
        q_ms: 'Planet manakah yang paling hampir dengan Matahari dalam Sistem Suria?',
        q_en: 'Which planet is closest to the Sun in the Solar System?',
        type: 'mcq',
        opts_ms: ['Utarid (Mercury)', 'Zuhrah (Venus)', 'Marikh (Mars)', 'Zuhal (Saturn)'],
        opts_en: ['Mercury', 'Venus', 'Mars', 'Saturn'],
        correctIdx: 0,
        exp_ms: 'Utarid ialah planet paling dekat dengan Matahari dan mempunyai orbit paling pantas.',
        exp_en: 'Mercury is the smallest and innermost planet in the Solar System.',
      },
      {
        q_ms: 'Benar atau Palsu: Planet Musytari merupakan planet yang paling besar dalam Sistem Suria.',
        q_en: 'True or False: Jupiter is the largest planet in our Solar System.',
        type: 'true_false',
        isTrue: true,
        exp_ms: 'BENAR, Musytari adalah gergasi gas dan merupakan planet terbesar dalam Sistem Suria.',
        exp_en: 'TRUE, Jupiter is a gas giant with a mass more than two and a half times that of all the other planets combined.',
      }
    );
  }

  // Add domain items if available
  for (const item of domainBank) {
    if (questions.length >= count) break;
    if (!activeTypes.includes(item.type)) continue;

    const qText = isMalay ? item.q_ms : item.q_en;
    const key = qText.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);

    if (item.type === 'mcq' && item.opts_ms && item.opts_en) {
      const rawOpts = isMalay ? item.opts_ms : item.opts_en;
      const correctIdx = item.correctIdx || 0;
      const allChoices = rawOpts.map((text, idx) => ({ text, isCorrect: idx === correctIdx }));
      const shuffled = shuffle(allChoices);
      const options = shuffled.map((c, idx) => ({ id: `opt_${idx + 1}`, text: c.text }));
      const correctOpt = options[shuffled.findIndex((c) => c.isCorrect)] || options[0];

      questions.push({
        question: qText,
        type: 'mcq',
        points: 10,
        timer: 30,
        options,
        correctOptionId: correctOpt.id,
        explanation: isMalay ? item.exp_ms : item.exp_en,
      });
    } else if (item.type === 'true_false') {
      questions.push({
        question: qText,
        type: 'true_false',
        points: 10,
        timer: 20,
        options: [
          { id: 'opt_t', text: isMalay ? 'BENAR' : 'TRUE' },
          { id: 'opt_f', text: isMalay ? 'PALSU' : 'FALSE' },
        ],
        correctOptionId: item.isTrue ? 'opt_t' : 'opt_f',
        explanation: isMalay ? item.exp_ms : item.exp_en,
      });
    } else if (item.type === 'short_answer') {
      questions.push({
        question: qText,
        type: 'short_answer',
        points: 15,
        timer: 30,
        correctAnswerText: isMalay ? item.ans_ms : item.ans_en,
        explanation: isMalay ? item.exp_ms : item.exp_en,
      });
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 3: High-yield authentic curriculum questions for ANY topic
  // -------------------------------------------------------------
  interface GenericCurriculumTpl {
    type: 'mcq' | 'true_false' | 'short_answer';
    q_ms: (t: string) => string;
    q_en: (t: string) => string;
    opts_ms?: (t: string) => string[];
    opts_en?: (t: string) => string[];
    correctIdx?: number;
    isTrue?: boolean;
    ans_ms?: (t: string) => string;
    ans_en?: (t: string) => string;
    exp_ms: (t: string) => string;
    exp_en: (t: string) => string;
  }

  const genericTpls: GenericCurriculumTpl[] = [
    {
      type: 'mcq',
      q_ms: (t) => `Apakah takrifan atau konsep asas yang paling tepat menerangkan "${t}"?`,
      q_en: (t) => `Which definition or foundational concept best describes "${t}"?`,
      opts_ms: (t) => [
        `Konsep atau proses saintifik utama yang mendasari prinsip pembelajaran ${t}`,
        `Fenomena rekaan yang tidak mempunyai sebarang bukti fakta`,
        `Kitaran yang berlaku tanpa sebarang undang-undang alam atau formula`,
        `Istilah yang hanya digunakan untuk merujuk kepada bahan buatan manusia semata-mata`,
      ],
      opts_en: (t) => [
        `The primary academic principle and mechanism underlying ${t}`,
        `A fabricated concept that lacks empirical backing`,
        `A random event that operates with no defined rules or formula`,
        `A temporary term that has no application in the real world`,
      ],
      correctIdx: 0,
      exp_ms: (t) => `Konsep asas ${t} merupakan teras utama dalam memahami topik dan aplikasi pembelajarannya.`,
      exp_en: (t) => `The core concept of ${t} serves as the primary building block for understanding this topic.`,
    },
    {
      type: 'true_false',
      q_ms: (t) => `Benar atau Palsu: Prinsip dan ciri-ciri berkaitan "${t}" boleh diperhatikan, dikaji, dan dianalisis secara saintifik.`,
      q_en: (t) => `True or False: Principles and characteristics of "${t}" can be systematically observed, studied, and verified.`,
      isTrue: true,
      exp_ms: (t) => `BENAR, fakta dan data berkaitan ${t} dapat dibuktikan melalui rujukan sukatan pelajaran yang tepat.`,
      exp_en: (t) => `TRUE, concepts and data in ${t} are grounded in verifiable educational frameworks.`,
    },
    {
      type: 'mcq',
      q_ms: (t) => `Antara aspek berikut, yang manakah merupakan ciri atau elemen paling penting dalam "${t}"?`,
      q_en: (t) => `Which of the following represents a primary characteristic or key component of "${t}"?`,
      opts_ms: (t) => [
        `Mempunyai fungsi, struktur, dan hubungan saling bergantungan yang teratur`,
        `Langsung tidak berkait rapat dengan mana-mana prinsip sukatan pelajaran`,
        `Hanya wujud sekiranya tiada sebarang interaksi persekitaran`,
        `Bebas daripada sebarang perubahan atau tindak balas fizikal dan kimia`,
      ],
      opts_en: (t) => [
        `Possesses structured functions, components, and interdependent properties`,
        `Has zero relevance to any curriculum or natural principles`,
        `Exists strictly in the absence of any environmental interaction`,
        `Is completely immune to any scientific, physical, or logical changes`,
      ],
      correctIdx: 0,
      exp_ms: (t) => `Elemen dan ciri tersusun ${t} membolehkan fungsinya berlaku secara sistematik.`,
      exp_en: (t) => `Structured components in ${t} ensure that its mechanisms function systematically.`,
    },
    {
      type: 'short_answer',
      q_ms: (t) => `Nyatakan istilah atau kata kunci terpenting yang menjadi subjek perbincangan utama dalam topik "${t}".`,
      q_en: (t) => `State the primary subject keyword or core term focused on in the topic "${t}".`,
      ans_ms: (t) => t.trim(),
      ans_en: (t) => t.trim(),
      exp_ms: (t) => `Istilah "${t}" merupakan kata kunci utama bagi semua soalan dan perbincangan dalam topik ini.`,
      exp_en: (t) => `The term "${t}" is the primary keyword and anchor for all questions in this topic.`,
    },
    {
      type: 'true_false',
      q_ms: (t) => `Benar atau Palsu: Pengetahuan tentang "${t}" tidak mempunyai sebarang kaitan dengan fenomena dunia nyata atau kehidupan harian.`,
      q_en: (t) => `True or False: Knowledge of "${t}" has zero connection to real-world phenomena or daily life.`,
      isTrue: false,
      exp_ms: (t) => `PALSU, topik ${t} berkait rapat dengan fenomena kehidupan harian dan aplikasi kurikulum.`,
      exp_en: (t) => `FALSE, the concepts in ${t} have numerous practical applications and connections to the world.`,
    },
    {
      type: 'mcq',
      q_ms: (t) => `Apabila menganalisis proses atau konsep dalam "${t}", faktor manakah yang paling kritikal untuk dikenal pasti?`,
      q_en: (t) => `When analyzing processes or principles in "${t}", which factor is most crucial to identify?`,
      opts_ms: (t) => [
        `Punca, bahan terlibat, dan kesan atau hasil daripada proses tersebut`,
        `Warna latar belakang buku teks yang mencatatkan topik ini`,
        `Nama pencetak pertama tanpa melihat kepada isi kandungan fakta`,
        `Meneka secara rawak tanpa merujuk kepada hukum sains atau logik`,
      ],
      opts_en: (t) => [
        `The underlying causes, involved components, and resulting outcomes`,
        `The background color of the textbook where the concept is printed`,
        `The manufacturer of the paper rather than the scientific data`,
        `Random guessing without referencing logic or academic facts`,
      ],
      correctIdx: 0,
      exp_ms: (t) => `Mengenal pasti komponen, bahan, dan hasil membolehkan pelajar memahami mekanisme ${t} secara menyeluruh.`,
      exp_en: (t) => `Identifying causes, inputs, and outputs allows comprehensive mastery of ${t}.`,
    },
    {
      type: 'mcq',
      q_ms: (t) => `Apakah contoh situasi atau aplikasi sebenar yang menunjukkan peranan penting "${t}"?`,
      q_en: (t) => `Which real-world scenario or application best demonstrates the role of "${t}"?`,
      opts_ms: (t) => [
        `Penggunaan prinsip ${t} dalam membantu kefahaman dan menyelesaikan masalah berkaitan`,
        `Pengabaian menyeluruh terhadap semua data dan bukti yang ditemui`,
        `Menyekat sebarang kemajuan teknologi atau pembelajaran murid`,
        `Menjadikan setiap jawapan sama rata tanpa mengambil kira fakta sebenar`,
      ],
      opts_en: (t) => [
        `Applying principles of ${t} to solve domain problems and interpret natural outcomes`,
        `Disregarding all empirical data and evidence gathered in the field`,
        `Suppressing educational progress and curiosity among students`,
        `Treating every statement as equally valid regardless of factual basis`,
      ],
      correctIdx: 0,
      exp_ms: (t) => `Aplikasi praktikal ${t} memberi impak langsung kepada penyelesaian masalah dalam topik ini.`,
      exp_en: (t) => `Practical application of ${t} directly supports accurate problem-solving.`,
    },
    {
      type: 'true_false',
      q_ms: (t) => `Benar atau Palsu: Memahami istilah asas dan definisi bagi "${t}" adalah langkah terpenting untuk menguasai soalan aras tinggi.`,
      q_en: (t) => `True or False: Mastering the foundational terminology and definitions of "${t}" is essential for higher-order reasoning.`,
      isTrue: true,
      exp_ms: (t) => `BENAR, penguasaan asas yang kukuh membolehkan murid menjawab soalan KBAT berkaitan ${t} dengan yakin.`,
      exp_en: (t) => `TRUE, a strong foundational grasp enables confident handling of complex reasoning questions.`,
    },
    {
      type: 'short_answer',
      q_ms: (t) => `Dalam sukatan pembelajaran, apakah subjek atau bidang utama yang membincangkan topik "${t}"?`,
      q_en: (t) => `In the standard curriculum, which subject area primarily studies the topic "${t}"?`,
      ans_ms: () => subject || 'Sains',
      ans_en: () => subject || 'Science',
      exp_ms: (t) => `Topik ${t} diajar dalam bidang ${subject || 'Sains / Pendidikan'} mengikut sukatan pelajaran.`,
      exp_en: (t) => `The topic ${t} is taught within the ${subject || 'Science / Academic'} curriculum.`,
    },
  ];

  let loopSafety = 0;
  let tplIndex = 0;

  while (questions.length < count && loopSafety < 300) {
    loopSafety++;
    const tpl = genericTpls[tplIndex % genericTpls.length];
    tplIndex++;

    if (!activeTypes.includes(tpl.type)) continue;

    const baseQ = isMalay ? tpl.q_ms(cleanTopic) : tpl.q_en(cleanTopic);
    const variationSuffix = loopSafety > genericTpls.length
      ? (isMalay ? ` (Soalan Ulangkaji ${Math.floor(loopSafety / genericTpls.length) + 1})` : ` (Review Item ${Math.floor(loopSafety / genericTpls.length) + 1})`)
      : '';
    const qText = `${baseQ}${variationSuffix}`;

    const key = qText.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);

    if (tpl.type === 'mcq' && tpl.opts_ms && tpl.opts_en) {
      const rawOpts = isMalay ? tpl.opts_ms(cleanTopic) : tpl.opts_en(cleanTopic);
      const correctIdx = tpl.correctIdx || 0;
      const allChoices = rawOpts.map((text, idx) => ({ text, isCorrect: idx === correctIdx }));
      const shuffled = shuffle(allChoices);
      const options = shuffled.map((c, idx) => ({ id: `opt_${idx + 1}`, text: c.text }));
      const correctOpt = options[shuffled.findIndex((c) => c.isCorrect)] || options[0];

      questions.push({
        question: qText,
        type: 'mcq',
        points: 10,
        timer: 30,
        options,
        correctOptionId: correctOpt.id,
        explanation: isMalay ? tpl.exp_ms(cleanTopic) : tpl.exp_en(cleanTopic),
      });
    } else if (tpl.type === 'true_false') {
      questions.push({
        question: qText,
        type: 'true_false',
        points: 10,
        timer: 20,
        options: [
          { id: 'opt_t', text: isMalay ? 'BENAR' : 'TRUE' },
          { id: 'opt_f', text: isMalay ? 'PALSU' : 'FALSE' },
        ],
        correctOptionId: tpl.isTrue ? 'opt_t' : 'opt_f',
        explanation: isMalay ? tpl.exp_ms(cleanTopic) : tpl.exp_en(cleanTopic),
      });
    } else if (tpl.type === 'short_answer') {
      questions.push({
        question: qText,
        type: 'short_answer',
        points: 15,
        timer: 30,
        correctAnswerText: isMalay ? (tpl.ans_ms ? tpl.ans_ms(cleanTopic) : cleanTopic) : (tpl.ans_en ? tpl.ans_en(cleanTopic) : cleanTopic),
        explanation: isMalay ? tpl.exp_ms(cleanTopic) : tpl.exp_en(cleanTopic),
      });
    }
  }

  return questions;
}
