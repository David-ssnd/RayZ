#!/usr/bin/env node

/**
 * Switch Prisma schema based on database mode
 * 
 * Usage:
 *   node scripts/switch-schema.js local   # Use SQLite schema
 *   node scripts/switch-schema.js cloud   # Use PostgreSQL schema
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const mode = process.argv[2] || process.env.DATABASE_MODE || 'cloud'
const prismaDir = join(__dirname, '..', 'prisma')

const schemaFiles = {
  cloud: join(prismaDir, 'schema.postgres.prisma'),
  local: join(prismaDir, 'schema.sqlite.prisma')
}

const targetSchema = join(prismaDir, 'schema.prisma')

// Validate mode
if (!['local', 'cloud'].includes(mode)) {
  console.error(`❌ Invalid mode: ${mode}`)
  console.error('   Valid modes: local, cloud')
  process.exit(1)
}

// Check if source schema exists
if (!existsSync(schemaFiles[mode])) {
  console.error(`❌ Schema file not found: ${schemaFiles[mode]}`)
  process.exit(1)
}

// Copy appropriate schema
try {
  copyFileSync(schemaFiles[mode], targetSchema)
  console.log(`✅ Switched to ${mode} mode schema`)
  console.log(`   Provider: ${mode === 'local' ? 'sqlite' : 'postgresql'}`)
  console.log(`   Schema: ${schemaFiles[mode]} → ${targetSchema}`)
} catch (error) {
  console.error(`❌ Failed to switch schema:`, error.message)
  process.exit(1)
}
