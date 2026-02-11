import path from 'path'
import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'
import { existsSync } from 'fs'

// Load .env.local first (takes precedence), then .env
const envLocalPath = path.resolve(process.cwd(), '.env.local')
const envPath = path.resolve(process.cwd(), '.env')

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath })
} else if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
})
