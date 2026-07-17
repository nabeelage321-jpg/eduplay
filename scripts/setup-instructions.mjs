#!/usr/bin/env node

/**
 * Alternative setup using SQL file directly
 * This will guide the user to manually run SQL if psql is unavailable
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function detectPsql() {
  try {
    const { stdout } = await execAsync('psql --version')
    return stdout.includes('psql')
  } catch {
    return false
  }
}

async function main() {
  console.log('📋 EduPlay Database Setup\n')

  const hasPsql = await detectPsql()

  if (hasPsql) {
    console.log('✅ PostgreSQL psql found!\n')
    console.log('To run migrations:')
    console.log('  psql postgresql://user:password@host:port/database < supabase/migrations/001_create_activities_table.sql')
  } else {
    console.log('📖 Manual Setup Required\n')
    console.log('Since psql is not available, please run the SQL manually:\n')
    console.log('1. Go to https://app.supabase.com')
    console.log('2. Select your EduPlay project')
    console.log('3. Go to SQL Editor → New Query')
    console.log('4. Copy and paste the SQL below:')
    console.log('\n' + '='.repeat(60) + '\n')

    const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '001_create_activities_table.sql')
    const sql = fs.readFileSync(sqlFile, 'utf-8')
    console.log(sql)

    console.log('\n' + '='.repeat(60))
    console.log('\n5. Click Run')
    console.log('6. Then run: node scripts/setup-prek.mjs\n')
  }
}

main().catch(console.error)
