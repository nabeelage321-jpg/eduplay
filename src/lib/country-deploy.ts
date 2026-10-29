// src/lib/countries/country-deploy.ts
// Generates .env.local for each country-specific Vercel deployment
// Run: npx ts-node -P tsconfig.node.json src/lib/countries/country-deploy.ts <COUNTRY_CODE>

import fs from 'fs'
import path from 'path'
import { COUNTRY_CONFIGS, CountryCode } from '@/lib/stripe/config'
import { getBaseUrl } from '@/lib/seo/base-url'

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

// Country subdomains DISABLED 2026-10-29: eduplay.app is NOT owned by
// the owner, so no country deployment may point at it or its subdomains.
// Every country build uses the single live URL from getBaseUrl()
// (https://eduplay-self.vercel.app unless NEXT_PUBLIC_BASE_URL is set
// to a domain that is actually owned). Do not re-add the subdomain map
// until a custom domain is owned and verified.
function getCountryBaseUrl(_code: CountryCode): string {
  return getBaseUrl()
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
    NEXT_PUBLIC_BASE_URL: getCountryBaseUrl(countryCode),
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
