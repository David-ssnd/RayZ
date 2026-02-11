import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import ws from 'ws'

import { PrismaClient } from './generated/client'

export * from './generated/client'
export { PrismaClient }

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws

// Global Prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

function getConnectionUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Make sure it is defined in your environment variables.'
    )
  }
  return url
}

function createPrismaClient(): PrismaClient {
  const connectionString = getConnectionUrl()
  const isLocalMode = process.env.DATABASE_MODE === 'local' || connectionString.startsWith('file:')

  if (isLocalMode) {
    // Local mode: Use SQLite with LibSQL adapter
    console.log('🗄️  Using local SQLite database')
    const adapter = new PrismaLibSql({ url: connectionString })
    
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  } else {
    // Cloud mode: Use Neon adapter for PostgreSQL
    console.log('☁️  Using cloud PostgreSQL database')
    const adapter = new PrismaNeon({ connectionString })
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
