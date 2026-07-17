// src/lib/countries/config.ts
// Country-specific configuration for EduPlay deployment

export interface CountryConfig {
  code: string
  name: string
  languages: string[]
  currency: string
  timezone: string
}

export const getCountryConfig = (code: string): CountryConfig | null => {
  const configs: Record<string, CountryConfig> = {
    US: {
      code: 'US',
      name: 'United States',
      languages: ['en'],
      currency: 'USD',
      timezone: 'America/New_York',
    },
    PK: {
      code: 'PK',
      name: 'Pakistan',
      languages: ['ur', 'en'],
      currency: 'PKR',
      timezone: 'Asia/Karachi',
    },
    IN: {
      code: 'IN',
      name: 'India',
      languages: ['hi', 'en'],
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    },
    BD: {
      code: 'BD',
      name: 'Bangladesh',
      languages: ['bn', 'en'],
      currency: 'BDT',
      timezone: 'Asia/Dhaka',
    },
  }
  return configs[code] ?? null
}

export const getAllCountries = (): CountryConfig[] => {
  return Object.values({
    US: {
      code: 'US',
      name: 'United States',
      languages: ['en'],
      currency: 'USD',
      timezone: 'America/New_York',
    },
    PK: {
      code: 'PK',
      name: 'Pakistan',
      languages: ['ur', 'en'],
      currency: 'PKR',
      timezone: 'Asia/Karachi',
    },
    IN: {
      code: 'IN',
      name: 'India',
      languages: ['hi', 'en'],
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    },
    BD: {
      code: 'BD',
      name: 'Bangladesh',
      languages: ['bn', 'en'],
      currency: 'BDT',
      timezone: 'Asia/Dhaka',
    },
  })
}
