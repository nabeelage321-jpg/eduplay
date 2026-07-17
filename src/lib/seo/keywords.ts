/**
 * Keyword maps per language per subject for programmatic SEO.
 * Each locale has a map of subject slug → array of keywords.
 */

export type SubjectKeywords = Record<string, string[]>
export type LocaleKeywords = Record<string, SubjectKeywords>

export const KEYWORDS: LocaleKeywords = {
  en: {
    mathematics: [
      'math quiz', 'maths activities', 'math games for teachers', 'free math worksheets',
      'multiplication quiz', 'fractions activities', 'algebra games', 'geometry quiz',
      'math classroom activities', 'interactive math lessons',
    ],
    science: [
      'science quiz', 'science activities for teachers', 'biology quiz', 'chemistry games',
      'physics activities', 'free science worksheets', 'interactive science lessons',
      'science classroom games', 'STEM activities', 'science review games',
    ],
    english: [
      'english quiz', 'vocabulary games', 'grammar activities', 'reading comprehension quiz',
      'spelling games', 'english classroom activities', 'language arts quiz',
      'phonics games', 'english worksheets', 'literature activities',
    ],
    history: [
      'history quiz', 'social studies games', 'history classroom activities',
      'world history quiz', 'historical timeline activities', 'civics quiz',
      'geography games', 'history review games', 'social studies worksheets',
    ],
    geography: [
      'geography quiz', 'world map games', 'countries quiz', 'capitals quiz',
      'continents activities', 'geography classroom games', 'map skills activities',
      'physical geography quiz', 'human geography games',
    ],
    urdu: [
      'urdu quiz', 'urdu language activities', 'urdu grammar games', 'urdu vocabulary quiz',
      'urdu poetry activities', 'urdu classroom games', 'urdu worksheets',
    ],
    arabic: [
      'arabic quiz', 'arabic language activities', 'arabic grammar games',
      'quran activities', 'arabic vocabulary quiz', 'arabic classroom games',
    ],
    islamiat: [
      'islamiat quiz', 'islamic studies activities', 'quran quiz', 'hadith activities',
      'islamic history quiz', 'pakistan studies', 'islamiat classroom games',
    ],
    'computer-science': [
      'coding quiz', 'computer science activities', 'programming games for kids',
      'digital literacy quiz', 'ICT activities', 'coding classroom games',
      'python quiz for students', 'scratch activities',
    ],
    art: [
      'art activities', 'creative arts quiz', 'art history games', 'drawing activities',
      'colour theory quiz', 'art classroom activities', 'visual arts games',
    ],
  },
  ur: {
    mathematics: [
      'ریاضی کوئز', 'حساب کے سوالات', 'پانچویں جماعت ریاضی', 'ضرب تقسیم سوالات',
      'کسر اور اعشاریہ', 'ریاضی گیمز', 'ریاضی کی مشقیں', 'الجبرا سوالات',
      'ہندسہ مشقیں', 'ریاضی انٹرایکٹو',
    ],
    science: [
      'سائنس کوئز', 'سائنس سرگرمیاں', 'حیاتیات سوالات', 'کیمیا گیمز',
      'طبیعیات سرگرمیاں', 'سائنس ورک شیٹ', 'سائنس کلاس گیمز',
    ],
    english: [
      'انگریزی کوئز', 'انگریزی الفاظ', 'گرامر مشقیں', 'انگریزی کھیل',
      'تلفظ گیمز', 'انگریزی ورک شیٹ',
    ],
    urdu: [
      'اردو کوئز', 'اردو گرامر', 'اردو الفاظ', 'اردو شاعری سرگرمیاں',
      'اردو کلاس گیمز', 'اردو ورک شیٹ', 'اردو قواعد',
    ],
    islamiat: [
      'اسلامیات کوئز', 'قرآن سرگرمیاں', 'حدیث کوئز', 'اسلامی تاریخ',
      'اسلامیات کلاس گیمز', 'نماز سوالات', 'اسلامی اقدار',
    ],
    history: [
      'تاریخ کوئز', 'پاکستان تاریخ', 'سماجی علوم گیمز', 'تاریخ کلاس',
      'قومی تاریخ سوالات',
    ],
    geography: [
      'جغرافیہ کوئز', 'نقشہ گیمز', 'ممالک کوئز', 'دارالحکومت سوالات',
      'جغرافیہ کلاس',
    ],
  },
  ar: {
    mathematics: [
      'اختبار رياضيات', 'أنشطة رياضيات', 'ألعاب الرياضيات للمعلمين',
      'أوراق عمل رياضيات', 'اختبار الضرب', 'أنشطة الكسور',
    ],
    science: [
      'اختبار علوم', 'أنشطة العلوم', 'ألعاب الأحياء', 'اختبار الكيمياء',
      'أنشطة الفيزياء',
    ],
    arabic: [
      'اختبار عربي', 'أنشطة اللغة العربية', 'ألعاب النحو', 'اختبار المفردات',
      'أنشطة القراءة العربية',
    ],
    islamiat: [
      'اختبار الإسلاميات', 'أنشطة قرآنية', 'اختبار الحديث', 'التاريخ الإسلامي',
      'أسئلة العبادات',
    ],
  },
  hi: {
    mathematics: [
      'गणित प्रश्नोत्तरी', 'गणित की गतिविधियाँ', 'गणित के खेल',
      'गणित वर्कशीट', 'गुणन तालिका', 'भिन्न संख्याएँ',
    ],
    science: [
      'विज्ञान प्रश्नोत्तरी', 'विज्ञान गतिविधियाँ', 'जीव विज्ञान प्रश्न',
      'रसायन विज्ञान खेल',
    ],
    english: [
      'अंग्रेजी प्रश्नोत्तरी', 'व्याकरण गतिविधियाँ', 'शब्दावली खेल',
    ],
  },
  es: {
    mathematics: [
      'cuestionario de matemáticas', 'actividades de matemáticas', 'juegos de matemáticas',
      'hojas de trabajo de matemáticas', 'quiz multiplicación', 'actividades fracciones',
    ],
    science: [
      'cuestionario de ciencias', 'actividades de ciencias', 'juegos de biología',
      'quiz de química',
    ],
    english: [
      'cuestionario de inglés', 'actividades de gramática', 'juegos de vocabulario',
    ],
  },
  fr: {
    mathematics: [
      'quiz mathématiques', 'activités mathématiques', 'jeux de maths',
      'fiches de travail maths', 'quiz multiplication', 'activités fractions',
    ],
    science: [
      'quiz sciences', 'activités scientifiques', 'jeux de biologie',
    ],
  },
  bn: {
    mathematics: [
      'গণিত কুইজ', 'গণিত কার্যক্রম', 'গণিত গেমস', 'গণিত ওয়ার্কশিট',
    ],
    science: [
      'বিজ্ঞান কুইজ', 'বিজ্ঞান কার্যক্রম',
    ],
  },
  pt: {
    mathematics: [
      'questionário de matemática', 'atividades de matemática', 'jogos de matemática',
    ],
    science: [
      'questionário de ciências', 'atividades científicas',
    ],
  },
  ru: {
    mathematics: [
      'викторина по математике', 'занятия по математике', 'игры по математике',
    ],
    science: [
      'викторина по науке', 'занятия по науке',
    ],
  },
  id: {
    mathematics: [
      'kuis matematika', 'kegiatan matematika', 'permainan matematika',
    ],
  },
  zh: {
    mathematics: [
      '数学测验', '数学活动', '数学游戏', '数学工作表',
    ],
  },
}

/** Get keywords for a locale + subject combination */
export function getKeywords(locale: string, subject: string): string[] {
  return KEYWORDS[locale]?.[subject] ?? KEYWORDS['en']?.[subject] ?? []
}

/** Get a comma-separated keyword string for meta tags */
export function getKeywordsString(locale: string, subject: string, extras: string[] = []): string {
  return [...getKeywords(locale, subject), ...extras].join(', ')
}
