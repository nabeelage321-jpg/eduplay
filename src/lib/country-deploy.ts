// src/lib/countries/country-deploy.ts
// Generates .env.local for each country-specific Vercel deployment
// Run: npx ts-node -P tsconfig.node.json src/lib/countries/country-deploy.ts <COUNTRY_CODE>

import fs from 'fs'
import path from 'path'
import { COUNTRY_CONFIGS, CountryCode } from '@/lib/stripe/config'

interface DeployEnv {
  NEXT_PUBLIC_COUNTRY_CODE: string
  NEXT_PUBLIC_DEFAULT_LOCALE: string
  NEXT_PUBLIC_CURRENCY: string
  NEXT_PUBLIC_CURRENCY_SYMBOL: string
  NEXT_PUBLIC_RTL_DEFAULT: string
  NEXT_PUBLIC_PRO_PRICE_DISPLAY: string
  NEXT_PUBLIC_SCHOOL_PRICE_DISPLAY: string
  NEXT_PUBLIC_BASE_URL: string
  NEXT_PUBLIC_SITE_NAME: string
}

function generateEnvContent(envVars: DeployEnv): string {
  return Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

function getBaseUrl(code: CountryCode): string {
  const subdomainMap: Partial<Record<CountryCode, string>> = {
    PK: 'https://pk.eduplay.app',
    SA: 'https://sa.eduplay.app',
    AE: 'https://ae.eduplay.app',
    IN: 'https://in.eduplay.app',
    BR: 'https://br.eduplay.app',
  }
  return subdomainMap[code] ?? 'https://eduplay.app'
}

export function generateCountryEnv(countryCode: CountryCode): string {
  const config = COUNTRY_CONFIGS[countryCode]
  if (!config) throw new Error(`Unknown country code: ${countryCode}`)

  const envVars: DeployEnv = {
    NEXT_PUBLIC_COUNTRY_CODE: config.code,
    NEXT_PUBLIC_DEFAULT_LOCALE: config.defaultLocale,
    NEXT_PUBLIC_CURRENCY: config.currency,
    NEXT_PUBLIC_CURRENCY_SYMBOL: config.currencySymbol,
    NEXT_PUBLIC_RTL_DEFAULT: config.rtl ? 'true' : 'false',
    NEXT_PUBLIC_PRO_PRICE_DISPLAY: config.proTierPriceDisplay,
    NEXT_PUBLIC_SCHOOL_PRICE_DISPLAY: config.schoolTierPriceDisplay,
    NEXT_PUBLIC_BASE_URL: getBaseUrl(countryCode),
    NEXT_PUBLIC_SITE_NAME: `EduPlay ${config.name}`,
  }

  return generateEnvContent(envVars)
}

export function writeCountryEnvFile(
  countryCode: CountryCode,
  outputDir: string = process.cwd(),
): void {
  const content = generateCountryEnv(countryCode)
  const filePath = path.join(outputDir, `.env.${countryCode.toLowerCase()}.local`)
  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`✅ Written: ${filePath}`)
}

// CLI entry point
if (require.main === module) {
  const code = process.argv[2]?.toUpperCase() as CountryCode

  if (!code) {
    console.log('Usage: ts-node country-deploy.ts <COUNTRY_CODE>')
    console.log('Available:', Object.keys(COUNTRY_CONFIGS).join(', '))
    process.exit(1)
  }

  if (!COUNTRY_CONFIGS[code]) {
    console.error(`Unknown country: ${code}`)
    process.exit(1)
  }

  writeCountryEnvFile(code)
}
