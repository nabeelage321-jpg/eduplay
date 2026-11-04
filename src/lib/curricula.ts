/**
 * Worldwide curriculum seed — WORLDWIDE CURRICULUM v1 (2026-11-04).
 *
 * Static seed FIRST, same single-source pattern as src/lib/filters.ts:
 * no migration, no owner SQL step, reviewable in a PR. Supabase tables
 * come only at ~50+ countries, or when the owner wants code-free edits
 * (see the research file for the later table design).
 *
 * SOURCE RULE — hard: every syllabus name below comes from
 * research/competitors/worldwide-curriculum-research-2026-11-04.md.
 * Nothing here was invented. Groq is an LLM API, NOT a syllabus
 * fetcher: it cannot browse, fetch board PDFs, verify official
 * content, reproduce copyrighted textbooks, or guarantee alignment.
 * It only supplies question CONTENT in a named syllabus's style, and
 * only after the teacher picks the syllabus from this seed.
 *
 * LABEL RULES baked into this seed:
 * - "Oxford" is NOT a national syllabus. OxfordAQA is an international
 *   exam board, filed under International, never as a country's
 *   national syllabus.
 * - England is its own entry. Scotland / Wales / Northern Ireland are
 *   separate systems (Phase 2), never folded into one "UK" row.
 * - The USA has NO national curriculum. Its entries are labelled
 *   "Standards" (or Board / International) — never "National".
 * - Pakistan's label is a DEFAULT for owner correction: sources in
 *   the research pass disagree on SNC vs "National Curriculum 2022".
 *   This seed uses "National Curriculum of Pakistan (2022)" with
 *   status 'partial' until the owner corrects it.
 * - Tier 1 countries added by the owner (Canada, Australia, New
 *   Zealand, Germany, France, Singapore, Japan, South Korea) ship as
 *   General-only in v1: the research file names them only in its
 *   Phase 2 list, with NO verified syllabus tables and no sources.
 *   Shipping an invented list would break the source rule, so their
 *   syllabus list is empty on purpose — a teacher there picks
 *   "Not sure / General" or an International row until a verified
 *   list is researched and approved.
 *
 * DROPPED, deliberately, from the research file (reported here so
 * nobody re-adds them as syllabuses): Kenya's CBC assessments
 * (KPSEA / KJSEA / KCBE are exams, not syllabuses) and the
 * Philippines' TVL track (a track inside K to 12 SHS, not a separate
 * syllabus). Kenya 8-4-4 and Indonesia Kurikulum 2013 stay, labelled
 * legacy. Egypt's Baccalaureate stays, labelled new / first exams
 * 2027. UAE's CBSE Global Curriculum stays only as a dated note on
 * the Indian-curriculum row, never as its own entry.
 */

export type CurriculumKind = 'national' | 'board' | 'international' | 'standards'

export const CURRICULUM_KIND_LABELS: Record<CurriculumKind, string> = {
  national: 'National',
  board: 'Board',
  international: 'International',
  standards: 'Standards',
}

export interface CurriculumEntry {
  /** Globally unique slug, stored on the game as a tag. */
  slug: string
  /** Full name, never an abbreviation alone. */
  name: string
  /** Short name used inside the "Not official … material" label. */
  shortName: string
  kind: CurriculumKind
  /** e.g. 'Key Stages 1–4, ages 5–16', 'Class IX–XII'. */
  scope?: string
  /** Plain-language note shown in the dropdown (legacy, new, date). */
  note?: string
  /** Where the name was verified (ministry / board source). */
  source: string
  /** 'partial' = the research pass flagged a naming/rollout conflict. */
  status: 'verified' | 'partial'
  /** Shown in the main list; false = shown under "More / Other". */
  isMain: boolean
}

export interface CurriculumCountry {
  /** ISO 3166-1 alpha-2 where it exists; 'GB-ENG' for England, 'INT'. */
  code: string
  name: string
  /** How the school level is called here ('Class', 'Year', 'Grade').
   *  Absent = EduPlay's default "Grade" wording, no claim made. */
  gradeLabel?: string
  /** Official / medium languages from the research file. Empty for
   *  Tier 1 General-only rows: not verified in this pass, left blank
   *  rather than guessed. Languages are seed data only in v1 — the
   *  create flow does not yet offer a language choice from them. */
  languages: string[]
  /** false = General-only in v1 (no verified syllabus list yet). */
  verified: boolean
  syllabuses: CurriculumEntry[]
}

/** Shared international entries, reused across country lists. */
const IB: Omit<CurriculumEntry, 'isMain'> = {
  slug: 'international-ib',
  name: 'IB — PYP / MYP / DP / CP',
  shortName: 'IB',
  kind: 'international',
  scope: 'Ages 3–19',
  source: 'ibo.org',
  status: 'verified',
}

const CAMBRIDGE: Omit<CurriculumEntry, 'isMain'> = {
  slug: 'international-cambridge',
  name: 'Cambridge International — IGCSE / International AS & A-Level',
  shortName: 'Cambridge International',
  kind: 'international',
  source: 'Cambridge International',
  status: 'verified',
}

const EDEXCEL: Omit<CurriculumEntry, 'isMain'> = {
  slug: 'international-edexcel',
  name: 'Pearson Edexcel — International GCSE / International A-Level',
  shortName: 'Pearson Edexcel',
  kind: 'international',
  source: 'Pearson Edexcel',
  status: 'verified',
}

const OXFORD_AQA: Omit<CurriculumEntry, 'isMain'> = {
  slug: 'international-oxfordaqa',
  name: 'OxfordAQA — International GCSE / A-Level',
  shortName: 'OxfordAQA',
  kind: 'international',
  note: 'An international exam board, not a national syllabus.',
  source: 'oxfordaqa.com',
  status: 'verified',
}

const main = (e: Omit<CurriculumEntry, 'isMain'>): CurriculumEntry => ({ ...e, isMain: true })
const more = (e: Omit<CurriculumEntry, 'isMain'>): CurriculumEntry => ({ ...e, isMain: false })

export const CURRICULUM_COUNTRIES: CurriculumCountry[] = [
  // International FIRST (dropdown rule), then alphabetical by name.
  {
    code: 'INT',
    name: 'International',
    languages: ['English'],
    verified: true,
    syllabuses: [main(IB), main(CAMBRIDGE), main(EDEXCEL), main(OXFORD_AQA)],
  },
  {
    code: 'AU',
    name: 'Australia',
    languages: [],
    verified: false,
    syllabuses: [],
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    gradeLabel: 'Class',
    languages: ['Bengali', 'English'],
    verified: true,
    syllabuses: [
      main({
        slug: 'bangladesh-nctb-bangla',
        name: 'NCTB National Curriculum (Bangla Medium)',
        shortName: 'NCTB',
        kind: 'national',
        source: 'NCTB',
        status: 'verified',
      }),
      main({
        slug: 'bangladesh-nctb-english',
        name: 'NCTB National Curriculum (English Version)',
        shortName: 'NCTB English Version',
        kind: 'national',
        note: 'Same NCTB curriculum translated into English — distinct from English Medium below.',
        source: 'NCTB',
        status: 'verified',
      }),
      main({
        slug: 'bangladesh-madrasah-bmeb',
        name: 'Madrasah — Bangladesh Madrasah Education Board (BMEB, Alia)',
        shortName: 'BMEB',
        kind: 'board',
        source: 'Bangladesh Madrasah Education Board',
        status: 'verified',
      }),
      main({
        slug: 'bangladesh-cambridge-edexcel',
        name: 'Cambridge International / Pearson Edexcel (English Medium)',
        shortName: 'Cambridge / Edexcel',
        kind: 'international',
        source: 'Cambridge International / Pearson Edexcel',
        status: 'verified',
      }),
      more(IB),
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    languages: [],
    verified: false,
    syllabuses: [],
  },
  {
    code: 'EG',
    name: 'Egypt',
    languages: ['Arabic'],
    verified: true,
    syllabuses: [
      main({
        slug: 'egypt-national',
        name: 'Egyptian National Curriculum (Ministry of Education)',
        shortName: 'Egyptian National Curriculum',
        kind: 'national',
        source: 'Egyptian Ministry of Education',
        status: 'verified',
      }),
      main({
        slug: 'egypt-baccalaureate',
        name: 'Egyptian Baccalaureate',
        shortName: 'Egyptian Baccalaureate',
        kind: 'national',
        note: 'New — first exams 2027. Optional alternative to Thanaweya Amma, not the default.',
        source: 'Egyptian Ministry of Education',
        status: 'verified',
      }),
      main({
        slug: 'egypt-british',
        name: 'British Curriculum (Cambridge / Edexcel IGCSE → A-Level)',
        shortName: 'British Curriculum',
        kind: 'international',
        source: 'Cambridge International / Pearson Edexcel',
        status: 'verified',
      }),
      main({
        slug: 'egypt-american',
        name: 'American Curriculum (High School Diploma + SAT / AP)',
        shortName: 'American Curriculum',
        kind: 'international',
        source: 'College Board',
        status: 'verified',
      }),
      main(IB),
    ],
  },
  {
    code: 'FR',
    name: 'France',
    languages: [],
    verified: false,
    syllabuses: [],
  },
  {
    code: 'DE',
    name: 'Germany',
    languages: [],
    verified: false,
    syllabuses: [],
  },
  {
    code: 'IN',
    name: 'India',
    gradeLabel: 'Class',
    languages: ['Hindi', 'English'],
    verified: true,
    syllabuses: [
      main({
        slug: 'india-cbse',
        name: 'CBSE — Central Board of Secondary Education',
        shortName: 'CBSE',
        kind: 'board',
        source: 'cbse.gov.in',
        status: 'verified',
      }),
      main({
        slug: 'india-cisce',
        name: 'CISCE — ICSE (Class X) / ISC (Class XII)',
        shortName: 'CISCE',
        kind: 'board',
        source: 'cisce.org',
        status: 'verified',
      }),
      main({
        slug: 'india-nios',
        name: 'NIOS — National Institute of Open Schooling',
        shortName: 'NIOS',
        kind: 'board',
        source: 'nios.ac.in',
        status: 'verified',
      }),
      more({
        slug: 'india-state-board',
        name: 'State Board (specific state not selected)',
        shortName: 'State Board',
        kind: 'board',
        note: 'State detail — which state — is Phase 2. Picking this stores a general state-board tag, not a specific state.',
        source: 'State Boards of India',
        status: 'verified',
      }),
      more(CAMBRIDGE),
      more(IB),
    ],
  },
  {
    code: 'ID',
    name: 'Indonesia',
    languages: ['Indonesian'],
    verified: true,
    syllabuses: [
      main({
        slug: 'indonesia-merdeka',
        name: 'Kurikulum Merdeka (Independent Curriculum)',
        shortName: 'Kurikulum Merdeka',
        kind: 'national',
        source: 'Kemendikbudristek Reg. 12/2024',
        status: 'verified',
      }),
      main({
        slug: 'indonesia-k13',
        name: 'Kurikulum 2013 (K13)',
        shortName: 'Kurikulum 2013',
        kind: 'national',
        note: 'Legacy — previous national curriculum, still in some schools during transition.',
        source: 'Kemendikbudristek',
        status: 'verified',
      }),
      main({
        slug: 'indonesia-madrasah',
        name: 'Madrasah Curriculum (Ministry of Religious Affairs)',
        shortName: 'Madrasah Curriculum',
        kind: 'national',
        note: 'National curriculum plus religious subjects, under a distinct administration.',
        source: 'Ministry of Religious Affairs',
        status: 'verified',
      }),
      main(CAMBRIDGE),
      main(IB),
    ],
  },
  {
    code: 'JP',
    name: 'Japan',
    languages: [],
    verified: false,
    syllabuses: [],
  },
  {
    code: 'KE',
    name: 'Kenya',
    languages: ['English', 'Kiswahili'],
    verified: true,
    syllabuses: [
      main({
        slug: 'kenya-cbc',
        name: 'Competency-Based Curriculum (CBC), 2-6-3-3-3',
        shortName: 'CBC',
        kind: 'national',
        source: 'Ministry of Education / KICD',
        status: 'verified',
      }),
      main({
        slug: 'kenya-844-legacy',
        name: '8-4-4 (legacy)',
        shortName: '8-4-4',
        kind: 'national',
        note: 'Legacy — phasing out. Included only for parents/teachers still on it, not as the current system.',
        source: 'Ministry of Education / KICD',
        status: 'verified',
      }),
      main(CAMBRIDGE),
      main(IB),
    ],
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    languages: [],
    verified: false,
    syllabuses: [],
  },
  {
    code: 'NG',
    name: 'Nigeria',
    languages: ['English'],
    verified: true,
    syllabuses: [
      main({
        slug: 'nigeria-nerdc',
        name: 'Nigerian National Curriculum (NERDC)',
        shortName: 'NERDC',
        kind: 'national',
        note: 'Revised 2025/26.',
        source: 'Federal Ministry of Education / NERDC',
        status: 'verified',
      }),
      main({
        slug: 'nigeria-waec',
        name: 'WAEC — WASSCE',
        shortName: 'WAEC',
        kind: 'board',
        source: 'West African Examinations Council',
        status: 'verified',
      }),
      main({
        slug: 'nigeria-neco',
        name: 'NECO — SSCE / BECE',
        shortName: 'NECO',
        kind: 'board',
        source: 'National Examinations Council',
        status: 'verified',
      }),
      main({
        slug: 'nigeria-cambridge-edexcel',
        name: 'Cambridge International / Pearson Edexcel (British curriculum, private schools)',
        shortName: 'Cambridge / Edexcel',
        kind: 'international',
        source: 'Cambridge International / Pearson Edexcel',
        status: 'verified',
      }),
      more(IB),
    ],
  },
  {
    code: 'PK',
    name: 'Pakistan',
    gradeLabel: 'Class',
    languages: ['Urdu', 'English'],
    verified: true,
    syllabuses: [
      main({
        slug: 'pakistan-ncp-2022',
        name: 'National Curriculum of Pakistan (2022)',
        shortName: 'National Curriculum of Pakistan',
        kind: 'national',
        note: 'Default label — sources disagree on SNC vs National Curriculum 2022 naming. Owner check pending; correct this label when the owner decides.',
        source: 'Ministry of Federal Education & Professional Training / National Curriculum Council',
        status: 'partial',
      }),
      main({
        slug: 'pakistan-bise',
        name: 'BISE / FBISE Board Syllabuses (SSC / HSSC)',
        shortName: 'BISE / FBISE',
        kind: 'board',
        scope: 'Class IX–XII',
        source: 'BISE / FBISE',
        status: 'verified',
      }),
      main({
        slug: 'pakistan-aku-eb',
        name: 'Aga Khan University Examination Board (AKU-EB)',
        shortName: 'AKU-EB',
        kind: 'board',
        source: 'AKU-EB',
        status: 'verified',
      }),
      more(CAMBRIDGE),
      more(IB),
    ],
  },
  {
    code: 'PH',
    name: 'Philippines',
    gradeLabel: 'Grade',
    languages: ['Filipino', 'English'],
    verified: true,
    syllabuses: [
      main({
        slug: 'philippines-k12',
        name: 'K to 12 Basic Education Curriculum (DepEd)',
        shortName: 'K to 12',
        kind: 'national',
        source: 'DepEd',
        status: 'verified',
      }),
      main({
        slug: 'philippines-matatag',
        name: 'MATATAG Curriculum (K–10)',
        shortName: 'MATATAG',
        kind: 'national',
        note: 'From SY 2024–25, phased implementation.',
        source: 'DepEd',
        status: 'verified',
      }),
      main(CAMBRIDGE),
      main(IB),
      main({
        slug: 'philippines-american',
        name: 'American-style / US Diploma (private international schools)',
        shortName: 'American Diploma',
        kind: 'international',
        source: 'Private international schools',
        status: 'verified',
      }),
    ],
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    languages: ['Arabic'],
    verified: true,
    syllabuses: [
      main({
        slug: 'saudi-moe',
        name: 'Saudi Ministry of Education National Curriculum',
        shortName: 'Saudi MoE',
        kind: 'national',
        source: 'Saudi MoE / National Curriculum Center',
        status: 'verified',
      }),
      main({
        slug: 'saudi-british',
        name: 'British Curriculum (IGCSE / A-Level)',
        shortName: 'British Curriculum',
        kind: 'international',
        source: 'Cambridge International / Pearson Edexcel',
        status: 'verified',
      }),
      main({
        slug: 'saudi-american',
        name: 'American Curriculum (Diploma + AP)',
        shortName: 'American Curriculum',
        kind: 'international',
        source: 'College Board',
        status: 'verified',
      }),
      main(IB),
      main({
        slug: 'saudi-indian',
        name: 'Indian Curriculum (CBSE / ICSE)',
        shortName: 'CBSE / ICSE',
        kind: 'international',
        source: 'CBSE / CISCE',
        status: 'verified',
      }),
    ],
  },
  {
    code: 'SG',
    name: 'Singapore',
    languages: [],
    verified: false,
    syllabuses: [],
  },
  {
    code: 'KR',
    name: 'South Korea',
    languages: [],
    verified: false,
    syllabuses: [],
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    languages: ['Arabic', 'English'],
    verified: true,
    syllabuses: [
      main({
        slug: 'uae-moe',
        name: 'UAE Ministry of Education (MoE) National Curriculum',
        shortName: 'UAE MoE',
        kind: 'national',
        source: 'UAE Ministry of Education',
        status: 'verified',
      }),
      main({
        slug: 'uae-british',
        name: 'British Curriculum (UK National Curriculum → IGCSE → A-Level)',
        shortName: 'British Curriculum',
        kind: 'international',
        source: 'Cambridge International / Pearson Edexcel / OxfordAQA',
        status: 'verified',
      }),
      main({
        slug: 'uae-american',
        name: 'American Curriculum (US K-12 → High School Diploma + AP)',
        shortName: 'American Curriculum',
        kind: 'international',
        source: 'College Board',
        status: 'verified',
      }),
      main(IB),
      main({
        slug: 'uae-indian',
        name: 'Indian Curriculum (CBSE / ICSE)',
        shortName: 'CBSE / ICSE',
        kind: 'international',
        note: 'CBSE Global Curriculum for UAE schools from April 2026 is reported, not yet in force — labelled with date.',
        source: 'CBSE / CISCE',
        status: 'verified',
      }),
    ],
  },
  {
    code: 'GB-ENG',
    name: 'United Kingdom — England',
    gradeLabel: 'Year',
    languages: ['English'],
    verified: true,
    syllabuses: [
      main({
        slug: 'england-national-curriculum',
        name: 'National Curriculum for England',
        shortName: 'National Curriculum for England',
        kind: 'national',
        scope: 'Key Stages 1–4, ages 5–16',
        source: 'DfE (gov.uk)',
        status: 'verified',
      }),
      main({
        slug: 'england-gcse-alevel',
        name: 'GCSE / A-Level (AQA, Pearson Edexcel, OCR)',
        shortName: 'GCSE / A-Level boards',
        kind: 'board',
        source: 'AQA / Pearson Edexcel / OCR',
        status: 'verified',
      }),
      main(CAMBRIDGE),
      main(EDEXCEL),
      main(OXFORD_AQA),
    ],
  },
  {
    code: 'US',
    name: 'United States',
    gradeLabel: 'Grade',
    languages: ['English'],
    verified: true,
    syllabuses: [
      main({
        slug: 'us-common-core',
        name: 'Common Core State Standards (ELA + Mathematics)',
        shortName: 'Common Core',
        kind: 'standards',
        note: 'Standards, not a curriculum — districts write the curriculum. The USA has no national curriculum.',
        source: 'NGA / CCSSO',
        status: 'verified',
      }),
      main({
        slug: 'us-state-standards',
        name: 'State Standards (specific state not selected)',
        shortName: 'State Standards',
        kind: 'standards',
        note: 'State detail — which state — is Phase 2. Picking this stores a general state-standards tag, not a specific state.',
        source: 'State education agencies',
        status: 'verified',
      }),
      main({
        slug: 'us-ngss',
        name: 'Next Generation Science Standards (NGSS)',
        shortName: 'NGSS',
        kind: 'standards',
        source: 'NGSS',
        status: 'verified',
      }),
      main({
        slug: 'us-ap',
        name: 'Advanced Placement (AP) — College Board',
        shortName: 'AP',
        kind: 'board',
        source: 'College Board',
        status: 'verified',
      }),
      main(IB),
    ],
  },
]

export function getCurriculumCountry(code: string): CurriculumCountry | undefined {
  return CURRICULUM_COUNTRIES.find((c) => c.code === code)
}

export function getSyllabus(countryCode: string, slug: string): CurriculumEntry | undefined {
  return getCurriculumCountry(countryCode)?.syllabuses.find((s) => s.slug === slug)
}

export interface CurriculumTag {
  countryCode: string
  syllabusSlug: string
}

/**
 * Allowlist validation for anything the client sends (create save,
 * prompt-to-game context). Returns the validated tag, or null when the
 * country is unknown, General-only, or the syllabus is not in that
 * country's verified list. Never trust a client-supplied name.
 */
export function resolveCurriculumTag(
  countryCode: unknown,
  syllabusSlug: unknown
): CurriculumTag | null {
  if (typeof countryCode !== 'string' || typeof syllabusSlug !== 'string') return null
  const country = getCurriculumCountry(countryCode)
  if (!country || !country.verified) return null
  if (!country.syllabuses.some((s) => s.slug === syllabusSlug)) return null
  return { countryCode, syllabusSlug }
}

/** Display data for a validated tag, or null when it is not valid. */
export function curriculumTagDisplay(tag: CurriculumTag): {
  countryName: string
  syllabus: CurriculumEntry
} | null {
  const country = getCurriculumCountry(tag.countryCode)
  const syllabus = getSyllabus(tag.countryCode, tag.syllabusSlug)
  if (!country || !syllabus) return null
  return { countryName: country.name, syllabus }
}

/**
 * MANDATORY label on every Groq-made syllabus-tagged game, shown on
 * the draft review and on the game's detail page. A General (no-claim)
 * game carries no syllabus label at all — this function returns null
 * for anything that is not a validated tag.
 */
export function curriculumTagLabel(tag: CurriculumTag | null): string | null {
  if (!tag) return null
  const display = curriculumTagDisplay(tag)
  if (!display) return null
  return (
    `Made with AI for ${display.syllabus.name} topics — teacher review required. ` +
    `Not official ${display.syllabus.shortName} material.`
  )
}
