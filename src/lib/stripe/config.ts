// src/lib/countries/config.ts
// Per-country deployment configuration for EduPlay

export type CountryCode =
  | 'PK' | 'SA' | 'AE' | 'IN' | 'BR'
  | 'US' | 'GB' | 'NG' | 'EG' | 'ID' | 'BD'

export type SupportedLocale =
  | 'en' | 'ur' | 'ar' | 'hi' | 'es' | 'fr'
  | 'bn' | 'pt' | 'ru' | 'id' | 'zh'

export interface CountryConfig {
  code: CountryCode
  name: string
  currency: string
  currencySymbol: string
  defaultLocale: SupportedLocale
  supportedLocales: SupportedLocale[]
  boards: string[]
  /** USD equivalent monthly price for Pro tier — 0 means use global pricing */
  proTierPriceLocal: number
  /** Local currency price string, e.g. "PKR 1,500" */
  proTierPriceDisplay: string
  schoolTierPriceLocal: number
  schoolTierPriceDisplay: string
  /** Stripe currency code (lowercase) */
  stripeCurrency: string
  /** Phone country code */
  dialCode: string
  /** Whether this country has a dedicated Vercel deployment */
  hasDedicatedDeployment: boolean
  /** Launch phase (1 = first, higher = later) */
  launchPhase: number
  rtl: boolean
}

export const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
  PK: {
    code: 'PK',
    name: 'Pakistan',
    currency: 'PKR',
    currencySymbol: '₨',
    defaultLocale: 'ur',
    supportedLocales: ['ur', 'en'],
    boards: ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Federal', 'AJK', 'Cambridge', 'IB'],
    proTierPriceLocal: 1400,
    proTierPriceDisplay: '₨1,400/mo',
    schoolTierPriceLocal: 8000,
    schoolTierPriceDisplay: '₨8,000/mo',
    stripeCurrency: 'pkr',
    dialCode: '+92',
    hasDedicatedDeployment: true,
    launchPhase: 1,
    rtl: true,
  },

  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    currency: 'SAR',
    currencySymbol: 'ر.س',
    defaultLocale: 'ar',
    supportedLocales: ['ar', 'en'],
    boards: ['MOE Saudi', 'Cambridge', 'IB'],
    proTierPriceLocal: 19,
    proTierPriceDisplay: '19 SAR/mo',
    schoolTierPriceLocal: 109,
    schoolTierPriceDisplay: '109 SAR/mo',
    stripeCurrency: 'sar',
    dialCode: '+966',
    hasDedicatedDeployment: true,
    launchPhase: 2,
    rtl: true,
  },

  AE: {
    code: 'AE',
    name: 'UAE',
    currency: 'AED',
    currencySymbol: 'د.إ',
    defaultLocale: 'ar',
    supportedLocales: ['ar', 'en'],
    boards: ['MOE UAE', 'Cambridge', 'IB', 'CBSE'],
    proTierPriceLocal: 19,
    proTierPriceDisplay: '19 AED/mo',
    schoolTierPriceLocal: 109,
    schoolTierPriceDisplay: '109 AED/mo',
    stripeCurrency: 'aed',
    dialCode: '+971',
    hasDedicatedDeployment: true,
    launchPhase: 2,
    rtl: true,
  },

  IN: {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    defaultLocale: 'hi',
    supportedLocales: ['hi', 'en', 'bn'],
    boards: ['CBSE', 'ICSE', 'Maharashtra SSC', 'Karnataka SSLC', 'Tamil Nadu', 'IB', 'Cambridge'],
    proTierPriceLocal: 399,
    proTierPriceDisplay: '₹399/mo',
    schoolTierPriceLocal: 2299,
    schoolTierPriceDisplay: '₹2,299/mo',
    stripeCurrency: 'inr',
    dialCode: '+91',
    hasDedicatedDeployment: true,
    launchPhase: 2,
    rtl: false,
  },

  BR: {
    code: 'BR',
    name: 'Brazil',
    currency: 'BRL',
    currencySymbol: 'R$',
    defaultLocale: 'pt',
    supportedLocales: ['pt', 'en'],
    boards: ['BNCC'],
    proTierPriceLocal: 25,
    proTierPriceDisplay: 'R$25/mo',
    schoolTierPriceLocal: 149,
    schoolTierPriceDisplay: 'R$149/mo',
    stripeCurrency: 'brl',
    dialCode: '+55',
    hasDedicatedDeployment: true,
    launchPhase: 3,
    rtl: false,
  },

  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    defaultLocale: 'en',
    supportedLocales: ['en', 'es'],
    boards: ['Common Core', 'State Standards', 'AP', 'IB'],
    proTierPriceLocal: 5,
    proTierPriceDisplay: '$5/mo',
    schoolTierPriceLocal: 29,
    schoolTierPriceDisplay: '$29/mo',
    stripeCurrency: 'usd',
    dialCode: '+1',
    hasDedicatedDeployment: false,
    launchPhase: 4,
    rtl: false,
  },

  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    defaultLocale: 'en',
    supportedLocales: ['en'],
    boards: ['AQA', 'Edexcel', 'OCR', 'Cambridge IGCSE', 'IB'],
    proTierPriceLocal: 4,
    proTierPriceDisplay: '£4/mo',
    schoolTierPriceLocal: 24,
    schoolTierPriceDisplay: '£24/mo',
    stripeCurrency: 'gbp',
    dialCode: '+44',
    hasDedicatedDeployment: false,
    launchPhase: 4,
    rtl: false,
  },

  NG: {
    code: 'NG',
    name: 'Nigeria',
    currency: 'NGN',
    currencySymbol: '₦',
    defaultLocale: 'en',
    supportedLocales: ['en'],
    boards: ['WAEC', 'NECO', 'JAMB'],
    proTierPriceLocal: 4000,
    proTierPriceDisplay: '₦4,000/mo',
    schoolTierPriceLocal: 23000,
    schoolTierPriceDisplay: '₦23,000/mo',
    stripeCurrency: 'ngn',
    dialCode: '+234',
    hasDedicatedDeployment: false,
    launchPhase: 5,
    rtl: false,
  },

  EG: {
    code: 'EG',
    name: 'Egypt',
    currency: 'EGP',
    currencySymbol: 'E£',
    defaultLocale: 'ar',
    supportedLocales: ['ar', 'en'],
    boards: ['Egyptian National', 'Cambridge', 'IB'],
    proTierPriceLocal: 155,
    proTierPriceDisplay: 'E£155/mo',
    schoolTierPriceLocal: 899,
    schoolTierPriceDisplay: 'E£899/mo',
    stripeCurrency: 'egp',
    dialCode: '+20',
    hasDedicatedDeployment: false,
    launchPhase: 3,
    rtl: true,
  },

  ID: {
    code: 'ID',
    name: 'Indonesia',
    currency: 'IDR',
    currencySymbol: 'Rp',
    defaultLocale: 'id',
    supportedLocales: ['id', 'en'],
    boards: ['Kurikulum Merdeka', 'K13'],
    proTierPriceLocal: 75000,
    proTierPriceDisplay: 'Rp75.000/bln',
    schoolTierPriceLocal: 435000,
    schoolTierPriceDisplay: 'Rp435.000/bln',
    stripeCurrency: 'idr',
    dialCode: '+62',
    hasDedicatedDeployment: false,
    launchPhase: 5,
    rtl: false,
  },

  BD: {
    code: 'BD',
    name: 'Bangladesh',
    currency: 'BDT',
    currencySymbol: '৳',
    defaultLocale: 'bn',
    supportedLocales: ['bn', 'en'],
    boards: ['NCTB', 'Cambridge', 'IB'],
    proTierPriceLocal: 550,
    proTierPriceDisplay: '৳550/mo',
    schoolTierPriceLocal: 3200,
    schoolTierPriceDisplay: '৳3,200/mo',
    stripeCurrency: 'bdt',
    dialCode: '+880',
    hasDedicatedDeployment: false,
    launchPhase: 4,
    rtl: false,
  },
}

/** Lookup country config, falling back to US defaults */
export function getCountryConfig(code: string): CountryConfig {
  return COUNTRY_CONFIGS[code as CountryCode] ?? COUNTRY_CONFIGS.US
}

/** Get default locale for a country */
export function getDefaultLocale(countryCode: string): SupportedLocale {
  return getCountryConfig(countryCode).defaultLocale
}

/** Get all boards for a country */
export function getBoards(countryCode: string): string[] {
  return getCountryConfig(countryCode).boards
}

/** Is the given locale RTL? */
export function isRTLLocale(locale: string): boolean {
  return locale === 'ur' || locale === 'ar'
}

/** Get all countries in launch phase order */
export function getCountriesByPhase(): CountryConfig[] {
  return Object.values(COUNTRY_CONFIGS).sort(
    (a, b) => a.launchPhase - b.launchPhase,
  )
}
