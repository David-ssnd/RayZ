import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
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

function createClient(): PrismaClient {
  const connectionString = getConnectionUrl()

  // Pass connectionString directly to PrismaNeon adapter (new API in Prisma 7+)
  const adapter = new PrismaNeon({ connectionString })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
