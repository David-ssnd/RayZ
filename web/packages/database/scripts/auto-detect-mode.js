#!/usr/bin/env node

/**
 * Auto-detect database mode and switch schema accordingly
 * 
 * Detects mode based on:
 * 1. DATABASE_MODE environment variable
 * 2. DATABASE_URL format (file: = local, postgres: = cloud)
 * 3. Default: cloud mode
 * 
 * Usage:
 *   node scripts/auto-detect-mode.js
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from multiple sources
const rootDir = join(__dirname, '..')
const envLocalPath = join(rootDir, '.env.local')
const envPath = join(rootDir, '.env')

// Load .env.local first (takes precedence), then .env
if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath })
  console.log('📄 Loaded .env.local')
}
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
  console.log('📄 Loaded .env')
}

// Detect mode
let mode = process.env.DATABASE_MODE

if (!mode) {
  const databaseUrl = process.env.DATABASE_URL || ''
  
  if (databaseUrl.startsWith('file:')) {
    mode = 'local'
    console.log('🔍 Auto-detected: local mode (DATABASE_URL starts with "file:")')
  } else if (databaseUrl.startsWith('postgres:') || databaseUrl.startsWith('postgresql:')) {
    mode = 'cloud'
    console.log('🔍 Auto-detected: cloud mode (DATABASE_URL is PostgreSQL)')
  } else {
    // Default to cloud if no URL is set (Vercel will inject it)
    mode = 'cloud'
    console.log('🔍 No DATABASE_URL found, defaulting to cloud mode')
  }
} else {
  console.log(`🔍 DATABASE_MODE explicitly set to: ${mode}`)
}

// Validate mode
if (!['local', 'cloud'].includes(mode)) {
  console.error(`❌ Invalid mode: ${mode}`)
  console.error('   Valid modes: local, cloud')
  process.exit(1)
}

// Switch schema
try {
  console.log(`🔄 Switching to ${mode} mode...`)
  execSync(`node scripts/switch-schema.js ${mode}`, {
    cwd: rootDir,
    stdio: 'inherit'
  })
  console.log(`✅ Schema switched to ${mode} mode`)
} catch (error) {
  console.error(`❌ Failed to switch schema:`, error.message)
  process.exit(1)
}
