/**
 * Seed data for the `curricula` table.
 * Pakistan boards + international curricula.
 */

export interface CurriculumSeed {
  slug: string
  country: string
  board_name: string
  board_name_local?: string
  is_primary: boolean // Primary curriculum for this country
  grades: string[] // Grade slugs this curriculum applies to
}

export const CURRICULA_SEED: CurriculumSeed[] = [
  // ── Pakistan ──────────────────────────────────────────────────────────────────
  {
    slug: 'punjab-board',
    country: 'PK',
    board_name: 'Punjab Board',
    board_name_local: 'پنجاب بورڈ',
    is_primary: true,
    grades: ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5', 'grade-6', 'grade-7', 'grade-8', 'grade-9', 'grade-10'],
  },
  {
    slug: 'sindh-board',
    country: 'PK',
    board_name: 'Sindh Board',
    board_name_local: 'سندھ بورڈ',
    is_primary: false,
    grades: ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5', 'grade-6', 'grade-7', 'grade-8', 'grade-9', 'grade-10'],
  },
  {
    slug: 'kpk-board',
    country: 'PK',
    board_name: 'KPK Board',
    board_name_local: 'خیبر پختونخوا بورڈ',
    is_primary: false,
    grades: ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5', 'grade-6', 'grade-7', 'grade-8', 'grade-9', 'grade-10'],
  },
  {
    slug: 'federal-board',
    country: 'PK',
    board_name: 'Federal Board',
    board_name_local: 'وفاقی بورڈ',
    is_primary: false,
    grades: ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5', 'grade-6', 'grade-7', 'grade-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12'],
  },
  {
    slug: 'balochistan-board',
    country: 'PK',
    board_name: 'Balochistan Board',
    board_name_local: 'بلوچستان بورڈ',
    is_primary: false,
    grades: ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5', 'grade-6', 'grade-7', 'grade-8', 'grade-9', 'grade-10'],
  },
  {
    slug: 'cambridge-pakistan',
    country: 'PK',
    board_name: 'Cambridge (O & A Level)',
    board_name_local: 'کیمبرج',
    is_primary: false,
    grades: ['grade-7', 'grade-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12'],
  },
  {
    slug: 'agha-khan-board',
    country: 'PK',
    board_name: 'Aga Khan Board (AKUEB)',
    board_name_local: 'آغا خان بورڈ',
    is_primary: false,
    grades: ['grade-9', 'grade-10', 'grade-11', 'grade-12'],
  },

  // ── Saudi Arabia ──────────────────────────────────────────────────────────────
  {
    slug: 'saudi-moe',
    country: 'SA',
    board_name: 'Saudi Ministry of Education',
    board_name_local: 'وزارة التعليم السعودية',
    is_primary: true,
    grades: ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5', 'grade-6', 'grade-7', 'grade-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12'],
  },

  // ── India ──────────────────────────────────────────────────────────────────────
  {
    slug: 'cbse',
    country: 'IN',
    board_name: 'CBSE',
    board_name_local: 'केंद्रीय माध्यमिक शिक्षा बोर्ड',
    is_primary: true,
    grades: ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5', 'grade-6', 'grade-7', 'grade-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12'],
  },
  {
    slug: 'icse',
    country: 'IN',
    board_name: 'ICSE',
    is_primary: false,
    grades: ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5', 'grade-6', 'grade-7', 'grade-8', 'grade-9', 'grade-10'],
  },

  // ── UK ────────────────────────────────────────────────────────────────────────
  {
    slug: 'uk-national',
    country: 'GB',
    board_name: 'UK National Curriculum',
    is_primary: true,
    grades: ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5', 'grade-6', 'grade-7', 'grade-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12'],
  },

  // ── International ─────────────────────────────────────────────────────────────
  {
    slug: 'cambridge-igcse',
    country: 'INT',
    board_name: 'Cambridge IGCSE',
    is_primary: false,
    grades: ['grade-9', 'grade-10', 'grade-11', 'grade-12'],
  },
  {
    slug: 'ib-myp',
    country: 'INT',
    board_name: 'IB Middle Years Programme',
    is_primary: false,
    grades: ['grade-6', 'grade-7', 'grade-8', 'grade-9', 'grade-10'],
  },
  {
    slug: 'ib-dp',
    country: 'INT',
    board_name: 'IB Diploma Programme',
    is_primary: false,
    grades: ['grade-11', 'grade-12'],
  },
]

export const CURRICULUM_SLUGS = CURRICULA_SEED.map((c) => c.slug)
