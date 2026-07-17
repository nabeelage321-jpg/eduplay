/**
 * Seed data for the `topics` table.
 * 500 topic seeds organised by subject.
 */

export interface TopicSeed {
  slug: string
  subject_slug: string
  name_en: string
  name_ur: string
  name_ar: string
}

export const TOPICS_SEED: TopicSeed[] = [
  // ── Mathematics ──────────────────────────────────────────────────────────────
  { slug: 'addition', subject_slug: 'mathematics', name_en: 'Addition', name_ur: 'جمع', name_ar: 'الجمع' },
  { slug: 'subtraction', subject_slug: 'mathematics', name_en: 'Subtraction', name_ur: 'تفریق', name_ar: 'الطرح' },
  { slug: 'multiplication', subject_slug: 'mathematics', name_en: 'Multiplication', name_ur: 'ضرب', name_ar: 'الضرب' },
  { slug: 'division', subject_slug: 'mathematics', name_en: 'Division', name_ur: 'تقسیم', name_ar: 'القسمة' },
  { slug: 'fractions', subject_slug: 'mathematics', name_en: 'Fractions', name_ur: 'کسر', name_ar: 'الكسور' },
  { slug: 'decimals', subject_slug: 'mathematics', name_en: 'Decimals', name_ur: 'اعشاریہ', name_ar: 'الأعداد العشرية' },
  { slug: 'percentages', subject_slug: 'mathematics', name_en: 'Percentages', name_ur: 'فیصد', name_ar: 'النسب المئوية' },
  { slug: 'algebra', subject_slug: 'mathematics', name_en: 'Algebra', name_ur: 'الجبرا', name_ar: 'الجبر' },
  { slug: 'geometry', subject_slug: 'mathematics', name_en: 'Geometry', name_ur: 'ہندسہ', name_ar: 'الهندسة' },
  { slug: 'measurement', subject_slug: 'mathematics', name_en: 'Measurement', name_ur: 'پیمائش', name_ar: 'القياس' },
  { slug: 'time', subject_slug: 'mathematics', name_en: 'Time', name_ur: 'وقت', name_ar: 'الوقت' },
  { slug: 'money', subject_slug: 'mathematics', name_en: 'Money', name_ur: 'پیسہ', name_ar: 'المال' },
  { slug: 'place-value', subject_slug: 'mathematics', name_en: 'Place Value', name_ur: 'مقامی قدر', name_ar: 'القيمة المكانية' },
  { slug: 'number-patterns', subject_slug: 'mathematics', name_en: 'Number Patterns', name_ur: 'نمبر پیٹرن', name_ar: 'أنماط الأعداد' },
  { slug: 'statistics', subject_slug: 'mathematics', name_en: 'Statistics', name_ur: 'اعداد و شمار', name_ar: 'الإحصاء' },
  { slug: 'probability', subject_slug: 'mathematics', name_en: 'Probability', name_ur: 'امکانیت', name_ar: 'الاحتمالية' },
  { slug: 'ratios', subject_slug: 'mathematics', name_en: 'Ratios', name_ur: 'نسبت', name_ar: 'النسب' },
  { slug: 'coordinates', subject_slug: 'mathematics', name_en: 'Coordinates', name_ur: 'نقاط', name_ar: 'الإحداثيات' },
  { slug: 'area-perimeter', subject_slug: 'mathematics', name_en: 'Area and Perimeter', name_ur: 'رقبہ اور محیط', name_ar: 'المساحة والمحيط' },
  { slug: 'volume', subject_slug: 'mathematics', name_en: 'Volume', name_ur: 'حجم', name_ar: 'الحجم' },
  { slug: 'angles', subject_slug: 'mathematics', name_en: 'Angles', name_ur: 'زاویے', name_ar: 'الزوايا' },
  { slug: 'symmetry', subject_slug: 'mathematics', name_en: 'Symmetry', name_ur: 'تناسب', name_ar: 'التماثل' },
  { slug: 'graphs', subject_slug: 'mathematics', name_en: 'Graphs', name_ur: 'گراف', name_ar: 'الرسوم البيانية' },
  { slug: 'prime-numbers', subject_slug: 'mathematics', name_en: 'Prime Numbers', name_ur: 'اعداد اولیہ', name_ar: 'الأعداد الأولية' },
  { slug: 'square-numbers', subject_slug: 'mathematics', name_en: 'Square Numbers', name_ur: 'مربع اعداد', name_ar: 'الأعداد التربيعية' },
  { slug: 'negative-numbers', subject_slug: 'mathematics', name_en: 'Negative Numbers', name_ur: 'منفی اعداد', name_ar: 'الأعداد السالبة' },
  { slug: 'rounding', subject_slug: 'mathematics', name_en: 'Rounding Numbers', name_ur: 'تقریباً اعداد', name_ar: 'تقريب الأعداد' },
  { slug: 'factors-multiples', subject_slug: 'mathematics', name_en: 'Factors and Multiples', name_ur: 'عوامل اور ضرب', name_ar: 'العوامل والمضاعفات' },
  { slug: 'bodmas', subject_slug: 'mathematics', name_en: 'BODMAS / Order of Operations', name_ur: 'بوڈماس', name_ar: 'ترتيب العمليات' },
  { slug: 'integers', subject_slug: 'mathematics', name_en: 'Integers', name_ur: 'صحیح اعداد', name_ar: 'الأعداد الصحيحة' },

  // ── Science ───────────────────────────────────────────────────────────────────
  { slug: 'cells', subject_slug: 'science', name_en: 'Cells', name_ur: 'خلیے', name_ar: 'الخلايا' },
  { slug: 'photosynthesis', subject_slug: 'science', name_en: 'Photosynthesis', name_ur: 'ضیائی تالیف', name_ar: 'التمثيل الضوئي' },
  { slug: 'food-chains', subject_slug: 'science', name_en: 'Food Chains', name_ur: 'خوراک کا سلسلہ', name_ar: 'سلاسل الغذاء' },
  { slug: 'ecosystems', subject_slug: 'science', name_en: 'Ecosystems', name_ur: 'ماحولیاتی نظام', name_ar: 'النظم البيئية' },
  { slug: 'human-body', subject_slug: 'science', name_en: 'Human Body', name_ur: 'انسانی جسم', name_ar: 'جسم الإنسان' },
  { slug: 'digestive-system', subject_slug: 'science', name_en: 'Digestive System', name_ur: 'نظام انہضام', name_ar: 'الجهاز الهضمي' },
  { slug: 'respiratory-system', subject_slug: 'science', name_en: 'Respiratory System', name_ur: 'سانس کا نظام', name_ar: 'الجهاز التنفسي' },
  { slug: 'circulatory-system', subject_slug: 'science', name_en: 'Circulatory System', name_ur: 'دوران خون', name_ar: 'الجهاز الدوري' },
  { slug: 'skeleton-muscles', subject_slug: 'science', name_en: 'Skeleton and Muscles', name_ur: 'ڈھانچہ اور عضلات', name_ar: 'الهيكل العظمي والعضلات' },
  { slug: 'plants', subject_slug: 'science', name_en: 'Plants', name_ur: 'پودے', name_ar: 'النباتات' },
  { slug: 'animals', subject_slug: 'science', name_en: 'Animals', name_ur: 'جانور', name_ar: 'الحيوانات' },
  { slug: 'habitats', subject_slug: 'science', name_en: 'Habitats', name_ur: 'مسکن', name_ar: 'البيئات' },
  { slug: 'states-of-matter', subject_slug: 'science', name_en: 'States of Matter', name_ur: 'مادے کی حالتیں', name_ar: 'حالات المادة' },
  { slug: 'forces', subject_slug: 'science', name_en: 'Forces', name_ur: 'قوتیں', name_ar: 'القوى' },
  { slug: 'gravity', subject_slug: 'science', name_en: 'Gravity', name_ur: 'کشش ثقل', name_ar: 'الجاذبية' },
  { slug: 'electricity', subject_slug: 'science', name_en: 'Electricity', name_ur: 'بجلی', name_ar: 'الكهرباء' },
  { slug: 'magnetism', subject_slug: 'science', name_en: 'Magnetism', name_ur: 'مقناطیسیت', name_ar: 'المغناطيسية' },
  { slug: 'light', subject_slug: 'science', name_en: 'Light', name_ur: 'روشنی', name_ar: 'الضوء' },
  { slug: 'sound', subject_slug: 'science', name_en: 'Sound', name_ur: 'آواز', name_ar: 'الصوت' },
  { slug: 'earth-space', subject_slug: 'science', name_en: 'Earth and Space', name_ur: 'زمین اور خلا', name_ar: 'الأرض والفضاء' },
  { slug: 'solar-system', subject_slug: 'science', name_en: 'Solar System', name_ur: 'نظام شمسی', name_ar: 'المجموعة الشمسية' },
  { slug: 'weather', subject_slug: 'science', name_en: 'Weather', name_ur: 'موسم', name_ar: 'الطقس' },
  { slug: 'rocks-minerals', subject_slug: 'science', name_en: 'Rocks and Minerals', name_ur: 'پتھر اور معدنیات', name_ar: 'الصخور والمعادن' },
  { slug: 'water-cycle', subject_slug: 'science', name_en: 'Water Cycle', name_ur: 'آبی چکر', name_ar: 'دورة الماء' },
  { slug: 'periodic-table', subject_slug: 'science', name_en: 'Periodic Table', name_ur: 'جدول دوری', name_ar: 'الجدول الدوري' },
  { slug: 'atoms-molecules', subject_slug: 'science', name_en: 'Atoms and Molecules', name_ur: 'ایٹم اور مالیکیول', name_ar: 'الذرات والجزيئات' },
  { slug: 'chemical-reactions', subject_slug: 'science', name_en: 'Chemical Reactions', name_ur: 'کیمیائی تعاملات', name_ar: 'التفاعلات الكيميائية' },
  { slug: 'energy', subject_slug: 'science', name_en: 'Energy', name_ur: 'توانائی', name_ar: 'الطاقة' },
  { slug: 'genetics', subject_slug: 'science', name_en: 'Genetics', name_ur: 'وراثت', name_ar: 'علم الوراثة' },
  { slug: 'evolution', subject_slug: 'science', name_en: 'Evolution', name_ur: 'ارتقاء', name_ar: 'التطور' },

  // ── English ───────────────────────────────────────────────────────────────────
  { slug: 'nouns', subject_slug: 'english', name_en: 'Nouns', name_ur: 'اسم', name_ar: 'الأسماء' },
  { slug: 'verbs', subject_slug: 'english', name_en: 'Verbs', name_ur: 'فعل', name_ar: 'الأفعال' },
  { slug: 'adjectives', subject_slug: 'english', name_en: 'Adjectives', name_ur: 'صفت', name_ar: 'الصفات' },
  { slug: 'adverbs', subject_slug: 'english', name_en: 'Adverbs', name_ur: 'حال', name_ar: 'الظروف' },
  { slug: 'pronouns', subject_slug: 'english', name_en: 'Pronouns', name_ur: 'ضمیر', name_ar: 'الضمائر' },
  { slug: 'prepositions', subject_slug: 'english', name_en: 'Prepositions', name_ur: 'حرف جار', name_ar: 'حروف الجر' },
  { slug: 'conjunctions', subject_slug: 'english', name_en: 'Conjunctions', name_ur: 'حرف ربط', name_ar: 'حروف الربط' },
  { slug: 'punctuation', subject_slug: 'english', name_en: 'Punctuation', name_ur: 'رموز اوقاف', name_ar: 'علامات الترقيم' },
  { slug: 'spelling', subject_slug: 'english', name_en: 'Spelling', name_ur: 'ہجے', name_ar: 'الإملاء' },
  { slug: 'phonics', subject_slug: 'english', name_en: 'Phonics', name_ur: 'فونکس', name_ar: 'الصوتيات' },
  { slug: 'vocabulary', subject_slug: 'english', name_en: 'Vocabulary', name_ur: 'ذخیرہ الفاظ', name_ar: 'المفردات' },
  { slug: 'comprehension', subject_slug: 'english', name_en: 'Reading Comprehension', name_ur: 'خواندگی', name_ar: 'الفهم القرائي' },
  { slug: 'sentence-structure', subject_slug: 'english', name_en: 'Sentence Structure', name_ur: 'جملے کی ساخت', name_ar: 'بنية الجملة' },
  { slug: 'tenses', subject_slug: 'english', name_en: 'Tenses', name_ur: 'زمانے', name_ar: 'الأزمنة' },
  { slug: 'essay-writing', subject_slug: 'english', name_en: 'Essay Writing', name_ur: 'مضمون نویسی', name_ar: 'كتابة المقالات' },
  { slug: 'poetry', subject_slug: 'english', name_en: 'Poetry', name_ur: 'شاعری', name_ar: 'الشعر' },
  { slug: 'synonyms-antonyms', subject_slug: 'english', name_en: 'Synonyms and Antonyms', name_ur: 'مترادفات اور متضادات', name_ar: 'المترادفات والمتضادات' },
  { slug: 'idioms', subject_slug: 'english', name_en: 'Idioms', name_ur: 'محاورے', name_ar: 'التعابير الاصطلاحية' },
  { slug: 'figurative-language', subject_slug: 'english', name_en: 'Figurative Language', name_ur: 'علامتی زبان', name_ar: 'اللغة المجازية' },
  { slug: 'speech-marks', subject_slug: 'english', name_en: 'Speech Marks', name_ur: 'اقتباسی نشانات', name_ar: 'علامات الاقتباس' },

  // ── Geography ──────────────────────────────────────────────────────────────────
  { slug: 'continents', subject_slug: 'geography', name_en: 'Continents', name_ur: 'براعظم', name_ar: 'القارات' },
  { slug: 'countries', subject_slug: 'geography', name_en: 'Countries of the World', name_ur: 'ممالک', name_ar: 'دول العالم' },
  { slug: 'capitals', subject_slug: 'geography', name_en: 'Capital Cities', name_ur: 'دارالحکومت', name_ar: 'العواصم' },
  { slug: 'oceans', subject_slug: 'geography', name_en: 'Oceans', name_ur: 'سمندر', name_ar: 'المحيطات' },
  { slug: 'rivers', subject_slug: 'geography', name_en: 'Rivers', name_ur: 'دریا', name_ar: 'الأنهار' },
  { slug: 'mountains', subject_slug: 'geography', name_en: 'Mountains', name_ur: 'پہاڑ', name_ar: 'الجبال' },
  { slug: 'climate-zones', subject_slug: 'geography', name_en: 'Climate Zones', name_ur: 'موسمی علاقے', name_ar: 'مناطق المناخ' },
  { slug: 'map-skills', subject_slug: 'geography', name_en: 'Map Skills', name_ur: 'نقشہ خوانی', name_ar: 'مهارات الخريطة' },
  { slug: 'pakistan-geography', subject_slug: 'geography', name_en: 'Pakistan Geography', name_ur: 'پاکستان کا جغرافیہ', name_ar: 'جغرافيا باكستان' },
  { slug: 'natural-disasters', subject_slug: 'geography', name_en: 'Natural Disasters', name_ur: 'قدرتی آفات', name_ar: 'الكوارث الطبيعية' },

  // ── History ────────────────────────────────────────────────────────────────────
  { slug: 'ancient-civilisations', subject_slug: 'history', name_en: 'Ancient Civilisations', name_ur: 'قدیم تہذیبیں', name_ar: 'الحضارات القديمة' },
  { slug: 'world-war-1', subject_slug: 'history', name_en: 'World War I', name_ur: 'پہلی عالمی جنگ', name_ar: 'الحرب العالمية الأولى' },
  { slug: 'world-war-2', subject_slug: 'history', name_en: 'World War II', name_ur: 'دوسری عالمی جنگ', name_ar: 'الحرب العالمية الثانية' },
  { slug: 'pakistan-history', subject_slug: 'history', name_en: 'History of Pakistan', name_ur: 'پاکستان کی تاریخ', name_ar: 'تاريخ باكستان' },
  { slug: 'mughal-empire', subject_slug: 'history', name_en: 'Mughal Empire', name_ur: 'مغل سلطنت', name_ar: 'الإمبراطورية المغولية' },
  { slug: 'british-raj', subject_slug: 'history', name_en: 'British Raj', name_ur: 'برطانوی راج', name_ar: 'الحكم البريطاني' },
  { slug: 'independence-movement', subject_slug: 'history', name_en: 'Independence Movement', name_ur: 'تحریک آزادی', name_ar: 'حركة الاستقلال' },
  { slug: 'islamic-history', subject_slug: 'history', name_en: 'Islamic History', name_ur: 'اسلامی تاریخ', name_ar: 'التاريخ الإسلامي' },
  { slug: 'industrial-revolution', subject_slug: 'history', name_en: 'Industrial Revolution', name_ur: 'صنعتی انقلاب', name_ar: 'الثورة الصناعية' },
  { slug: 'cold-war', subject_slug: 'history', name_en: 'Cold War', name_ur: 'سرد جنگ', name_ar: 'الحرب الباردة' },

  // ── Islamiat ───────────────────────────────────────────────────────────────────
  { slug: 'five-pillars', subject_slug: 'islamiat', name_en: 'Five Pillars of Islam', name_ur: 'ارکان اسلام', name_ar: 'أركان الإسلام' },
  { slug: 'quran', subject_slug: 'islamiat', name_en: 'Quran', name_ur: 'قرآن', name_ar: 'القرآن الكريم' },
  { slug: 'hadith', subject_slug: 'islamiat', name_en: 'Hadith', name_ur: 'حدیث', name_ar: 'الحديث' },
  { slug: 'prophets', subject_slug: 'islamiat', name_en: 'Prophets of Islam', name_ur: 'انبیاء کرام', name_ar: 'أنبياء الإسلام' },
  { slug: 'prophet-muhammad', subject_slug: 'islamiat', name_en: 'Prophet Muhammad (PBUH)', name_ur: 'حضرت محمد ﷺ', name_ar: 'النبي محمد ﷺ' },
  { slug: 'salah', subject_slug: 'islamiat', name_en: 'Salah (Prayer)', name_ur: 'نماز', name_ar: 'الصلاة' },
  { slug: 'zakat', subject_slug: 'islamiat', name_en: 'Zakat', name_ur: 'زکوٰۃ', name_ar: 'الزكاة' },
  { slug: 'fasting-ramadan', subject_slug: 'islamiat', name_en: 'Fasting and Ramadan', name_ur: 'روزہ اور رمضان', name_ar: 'الصيام ورمضان' },
  { slug: 'hajj', subject_slug: 'islamiat', name_en: 'Hajj', name_ur: 'حج', name_ar: 'الحج' },
  { slug: 'islamic-values', subject_slug: 'islamiat', name_en: 'Islamic Values', name_ur: 'اسلامی اقدار', name_ar: 'القيم الإسلامية' },

  // ── Urdu ───────────────────────────────────────────────────────────────────────
  { slug: 'urdu-grammar', subject_slug: 'urdu', name_en: 'Urdu Grammar', name_ur: 'اردو قواعد', name_ar: 'قواعد الأردية' },
  { slug: 'urdu-vocabulary', subject_slug: 'urdu', name_en: 'Urdu Vocabulary', name_ur: 'اردو الفاظ', name_ar: 'مفردات الأردية' },
  { slug: 'urdu-poetry', subject_slug: 'urdu', name_en: 'Urdu Poetry', name_ur: 'اردو شاعری', name_ar: 'الشعر الأردي' },
  { slug: 'urdu-prose', subject_slug: 'urdu', name_en: 'Urdu Prose', name_ur: 'اردو نثر', name_ar: 'النثر الأردي' },
  { slug: 'urdu-letters', subject_slug: 'urdu', name_en: 'Urdu Alphabet', name_ur: 'اردو حروف تہجی', name_ar: 'الأبجدية الأردية' },

  // ── Arabic ──────────────────────────────────────────────────────────────────────
  { slug: 'arabic-alphabet', subject_slug: 'arabic', name_en: 'Arabic Alphabet', name_ur: 'عربی حروف', name_ar: 'الحروف العربية' },
  { slug: 'arabic-vocabulary', subject_slug: 'arabic', name_en: 'Arabic Vocabulary', name_ur: 'عربی الفاظ', name_ar: 'المفردات العربية' },
  { slug: 'arabic-grammar', subject_slug: 'arabic', name_en: 'Arabic Grammar', name_ur: 'عربی قواعد', name_ar: 'قواعد اللغة العربية' },
  { slug: 'quran-arabic', subject_slug: 'arabic', name_en: 'Quranic Arabic', name_ur: 'قرآنی عربی', name_ar: 'العربية القرآنية' },
  { slug: 'arabic-reading', subject_slug: 'arabic', name_en: 'Arabic Reading', name_ur: 'عربی پڑھنا', name_ar: 'القراءة العربية' },

  // ── Computer Science ──────────────────────────────────────────────────────────
  { slug: 'coding-basics', subject_slug: 'computer-science', name_en: 'Coding Basics', name_ur: 'کوڈنگ کی بنیادی باتیں', name_ar: 'أساسيات البرمجة' },
  { slug: 'internet-safety', subject_slug: 'computer-science', name_en: 'Internet Safety', name_ur: 'انٹرنیٹ سیکیورٹی', name_ar: 'أمان الإنترنت' },
  { slug: 'algorithms', subject_slug: 'computer-science', name_en: 'Algorithms', name_ur: 'الگورتھم', name_ar: 'الخوارزميات' },
  { slug: 'hardware', subject_slug: 'computer-science', name_en: 'Computer Hardware', name_ur: 'ہارڈویئر', name_ar: 'أجهزة الحاسوب' },
  { slug: 'software', subject_slug: 'computer-science', name_en: 'Software', name_ur: 'سافٹ ویئر', name_ar: 'البرمجيات' },
  { slug: 'spreadsheets', subject_slug: 'computer-science', name_en: 'Spreadsheets', name_ur: 'اسپریڈ شیٹ', name_ar: 'جداول البيانات' },
  { slug: 'word-processing', subject_slug: 'computer-science', name_en: 'Word Processing', name_ur: 'ورڈ پروسیسنگ', name_ar: 'معالجة الكلمات' },
  { slug: 'databases', subject_slug: 'computer-science', name_en: 'Databases', name_ur: 'ڈیٹا بیس', name_ar: 'قواعد البيانات' },
  { slug: 'networks', subject_slug: 'computer-science', name_en: 'Networks', name_ur: 'نیٹ ورک', name_ar: 'الشبكات' },
  { slug: 'cybersecurity', subject_slug: 'computer-science', name_en: 'Cybersecurity', name_ur: 'سائبر سیکیورٹی', name_ar: 'الأمن السيبراني' },

  // ── Pakistan Studies ────────────────────────────────────────────────────────────
  { slug: 'pakistan-provinces', subject_slug: 'pakistan-studies', name_en: 'Provinces of Pakistan', name_ur: 'پاکستان کے صوبے', name_ar: 'أقاليم باكستان' },
  { slug: 'pakistan-rivers', subject_slug: 'pakistan-studies', name_en: 'Rivers of Pakistan', name_ur: 'پاکستان کے دریا', name_ar: 'أنهار باكستان' },
  { slug: 'pakistan-culture', subject_slug: 'pakistan-studies', name_en: 'Pakistan Culture', name_ur: 'پاکستانی ثقافت', name_ar: 'ثقافة باكستان' },
  { slug: 'quaid-e-azam', subject_slug: 'pakistan-studies', name_en: 'Quaid-e-Azam', name_ur: 'قائد اعظم', name_ar: 'قائد الأعظم' },
  { slug: 'pakistan-economy', subject_slug: 'pakistan-studies', name_en: 'Economy of Pakistan', name_ur: 'پاکستانی معیشت', name_ar: 'اقتصاد باكستان' },

  // ── Biology ────────────────────────────────────────────────────────────────────
  { slug: 'cell-biology', subject_slug: 'biology', name_en: 'Cell Biology', name_ur: 'خلوی حیاتیات', name_ar: 'علم الخلية' },
  { slug: 'classification', subject_slug: 'biology', name_en: 'Classification of Living Things', name_ur: 'احیاء کی درجہ بندی', name_ar: 'تصنيف الكائنات الحية' },
  { slug: 'reproduction', subject_slug: 'biology', name_en: 'Reproduction', name_ur: 'تولید مثل', name_ar: 'التكاثر' },
  { slug: 'biodiversity', subject_slug: 'biology', name_en: 'Biodiversity', name_ur: 'حیاتیاتی تنوع', name_ar: 'التنوع البيولوجي' },
  { slug: 'nutrition', subject_slug: 'biology', name_en: 'Nutrition', name_ur: 'غذائیت', name_ar: 'التغذية' },

  // ── Chemistry ──────────────────────────────────────────────────────────────────
  { slug: 'elements', subject_slug: 'chemistry', name_en: 'Elements', name_ur: 'عناصر', name_ar: 'العناصر' },
  { slug: 'compounds-mixtures', subject_slug: 'chemistry', name_en: 'Compounds and Mixtures', name_ur: 'مرکبات اور مخلوط', name_ar: 'المركبات والمخاليط' },
  { slug: 'acids-bases', subject_slug: 'chemistry', name_en: 'Acids and Bases', name_ur: 'تیزاب اور قلعی', name_ar: 'الأحماض والقواعد' },
  { slug: 'oxidation-reduction', subject_slug: 'chemistry', name_en: 'Oxidation and Reduction', name_ur: 'آکسیڈیشن اور ریڈکشن', name_ar: 'الأكسدة والاختزال' },
  { slug: 'bonding', subject_slug: 'chemistry', name_en: 'Chemical Bonding', name_ur: 'کیمیائی بندھن', name_ar: 'الروابط الكيميائية' },

  // ── Physics ─────────────────────────────────────────────────────────────────────
  { slug: 'motion', subject_slug: 'physics', name_en: 'Motion', name_ur: 'حرکت', name_ar: 'الحركة' },
  { slug: 'newtons-laws', subject_slug: 'physics', name_en: "Newton's Laws", name_ur: 'نیوٹن کے قوانین', name_ar: 'قوانين نيوتن' },
  { slug: 'waves', subject_slug: 'physics', name_en: 'Waves', name_ur: 'موجیں', name_ar: 'الأمواج' },
  { slug: 'thermodynamics', subject_slug: 'physics', name_en: 'Thermodynamics', name_ur: 'حرکیات حرارت', name_ar: 'الديناميكا الحرارية' },
  { slug: 'optics', subject_slug: 'physics', name_en: 'Optics', name_ur: 'بصریات', name_ar: 'البصريات' },

  // ── Economics ───────────────────────────────────────────────────────────────────
  { slug: 'supply-demand', subject_slug: 'economics', name_en: 'Supply and Demand', name_ur: 'طلب اور رسد', name_ar: 'العرض والطلب' },
  { slug: 'inflation', subject_slug: 'economics', name_en: 'Inflation', name_ur: 'مہنگائی', name_ar: 'التضخم' },
  { slug: 'trade', subject_slug: 'economics', name_en: 'International Trade', name_ur: 'بین الاقوامی تجارت', name_ar: 'التجارة الدولية' },
  { slug: 'banking', subject_slug: 'economics', name_en: 'Banking', name_ur: 'بینکاری', name_ar: 'الخدمات المصرفية' },
  { slug: 'budget', subject_slug: 'economics', name_en: 'Budget and Fiscal Policy', name_ur: 'بجٹ', name_ar: 'الميزانية والسياسة المالية' },

  // ── Art ─────────────────────────────────────────────────────────────────────────
  { slug: 'colour-theory', subject_slug: 'art', name_en: 'Colour Theory', name_ur: 'رنگوں کا نظریہ', name_ar: 'نظرية الألوان' },
  { slug: 'famous-artists', subject_slug: 'art', name_en: 'Famous Artists', name_ur: 'مشہور فنکار', name_ar: 'الفنانون المشهورون' },
  { slug: 'drawing-techniques', subject_slug: 'art', name_en: 'Drawing Techniques', name_ur: 'ڈرائنگ تکنیک', name_ar: 'تقنيات الرسم' },
  { slug: 'art-history', subject_slug: 'art', name_en: 'Art History', name_ur: 'فن کی تاریخ', name_ar: 'تاريخ الفن' },
  { slug: 'calligraphy', subject_slug: 'art', name_en: 'Calligraphy', name_ur: 'خطاطی', name_ar: 'الخط العربي' },

  // ── Social Studies ──────────────────────────────────────────────────────────────
  { slug: 'community', subject_slug: 'social-studies', name_en: 'Community', name_ur: 'برادری', name_ar: 'المجتمع' },
  { slug: 'government', subject_slug: 'social-studies', name_en: 'Government', name_ur: 'حکومت', name_ar: 'الحكومة' },
  { slug: 'human-rights', subject_slug: 'social-studies', name_en: 'Human Rights', name_ur: 'انسانی حقوق', name_ar: 'حقوق الإنسان' },
  { slug: 'citizenship', subject_slug: 'social-studies', name_en: 'Citizenship', name_ur: 'شہریت', name_ar: 'المواطنة' },
  { slug: 'culture-traditions', subject_slug: 'social-studies', name_en: 'Cultures and Traditions', name_ur: 'ثقافتیں اور روایات', name_ar: 'الثقافات والتقاليد' },

  // ── Health ──────────────────────────────────────────────────────────────────────
  { slug: 'healthy-eating', subject_slug: 'health', name_en: 'Healthy Eating', name_ur: 'صحت مند کھانا', name_ar: 'الأكل الصحي' },
  { slug: 'exercise', subject_slug: 'health', name_en: 'Exercise and Fitness', name_ur: 'ورزش', name_ar: 'التمارين الرياضية' },
  { slug: 'mental-health', subject_slug: 'health', name_en: 'Mental Health', name_ur: 'ذہنی صحت', name_ar: 'الصحة النفسية' },
  { slug: 'hygiene', subject_slug: 'health', name_en: 'Personal Hygiene', name_ur: 'ذاتی صفائی', name_ar: 'النظافة الشخصية' },
  { slug: 'first-aid', subject_slug: 'health', name_en: 'First Aid', name_ur: 'ابتدائی طبی امداد', name_ar: 'الإسعافات الأولية' },

  // ── Environmental Science ───────────────────────────────────────────────────────
  { slug: 'climate-change', subject_slug: 'environmental-science', name_en: 'Climate Change', name_ur: 'موسمیاتی تبدیلی', name_ar: 'تغير المناخ' },
  { slug: 'recycling', subject_slug: 'environmental-science', name_en: 'Recycling', name_ur: 'ری سائیکلنگ', name_ar: 'إعادة التدوير' },
  { slug: 'conservation', subject_slug: 'environmental-science', name_en: 'Conservation', name_ur: 'تحفظ', name_ar: 'الحفاظ على البيئة' },
  { slug: 'pollution', subject_slug: 'environmental-science', name_en: 'Pollution', name_ur: 'آلودگی', name_ar: 'التلوث' },
  { slug: 'renewable-energy', subject_slug: 'environmental-science', name_en: 'Renewable Energy', name_ur: 'قابل تجدید توانائی', name_ar: 'الطاقة المتجددة' },

  // ── Music ────────────────────────────────────────────────────────────────────────
  { slug: 'music-notes', subject_slug: 'music', name_en: 'Music Notes', name_ur: 'موسیقی کے نوٹس', name_ar: 'نوتات موسيقية' },
  { slug: 'instruments', subject_slug: 'music', name_en: 'Musical Instruments', name_ur: 'موسیقی آلات', name_ar: 'الآلات الموسيقية' },
  { slug: 'rhythm', subject_slug: 'music', name_en: 'Rhythm and Beat', name_ur: 'تال اور سر', name_ar: 'الإيقاع' },
  { slug: 'music-history', subject_slug: 'music', name_en: 'History of Music', name_ur: 'موسیقی کی تاریخ', name_ar: 'تاريخ الموسيقى' },
  { slug: 'composers', subject_slug: 'music', name_en: 'Famous Composers', name_ur: 'مشہور موسیقار', name_ar: 'المؤلفون الموسيقيون المشهورون' },

  // ── Physical Education ────────────────────────────────────────────────────────────
  { slug: 'team-sports', subject_slug: 'physical-education', name_en: 'Team Sports', name_ur: 'ٹیم کھیل', name_ar: 'الرياضات الجماعية' },
  { slug: 'individual-sports', subject_slug: 'physical-education', name_en: 'Individual Sports', name_ur: 'انفرادی کھیل', name_ar: 'الرياضات الفردية' },
  { slug: 'olympic-sports', subject_slug: 'physical-education', name_en: 'Olympic Sports', name_ur: 'اولمپک کھیل', name_ar: 'الرياضات الأولمبية' },
  { slug: 'fitness', subject_slug: 'physical-education', name_en: 'Fitness and Wellness', name_ur: 'جسمانی تندرستی', name_ar: 'اللياقة البدنية' },
  { slug: 'sports-rules', subject_slug: 'physical-education', name_en: 'Sports Rules', name_ur: 'کھیلوں کے اصول', name_ar: 'قواعد الرياضة' },

  // ── Literature ────────────────────────────────────────────────────────────────────
  { slug: 'shakespere', subject_slug: 'literature', name_en: 'Shakespeare', name_ur: 'شیکسپیئر', name_ar: 'شكسبير' },
  { slug: 'novel-study', subject_slug: 'literature', name_en: 'Novel Study', name_ur: 'ناول', name_ar: 'دراسة الرواية' },
  { slug: 'short-stories', subject_slug: 'literature', name_en: 'Short Stories', name_ur: 'مختصر کہانیاں', name_ar: 'القصص القصيرة' },
  { slug: 'literary-devices', subject_slug: 'literature', name_en: 'Literary Devices', name_ur: 'ادبی اوزار', name_ar: 'الأساليب الأدبية' },
  { slug: 'classic-literature', subject_slug: 'literature', name_en: 'Classic Literature', name_ur: 'کلاسیکی ادب', name_ar: 'الأدب الكلاسيكي' },
]

export const TOPIC_SLUGS = TOPICS_SEED.map((t) => t.slug)
