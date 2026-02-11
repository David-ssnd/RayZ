import { PrismaClient } from './generated/client'

export * from './generated/client'
export { PrismaClient }

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

async function createPrismaClient(): Promise<PrismaClient> {
  const connectionString = getConnectionUrl()
  const isLocalMode = process.env.DATABASE_MODE === 'local' || connectionString.startsWith('file:')

  if (isLocalMode) {
    // Local mode: Use SQLite with LibSQL adapter
    // Dynamic import to avoid bundling issues with native modules
    console.log('🗄️  Using local SQLite database')
    const { PrismaLibSql } = await import('@prisma/adapter-libsql')
    const adapter = new PrismaLibSql({ url: connectionString })
    
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  } else {
    // Cloud mode: Use Neon adapter for PostgreSQL
    console.log('☁️  Using cloud PostgreSQL database')
    const { neonConfig } = await import('@neondatabase/serverless')
    const { PrismaNeon } = await import('@prisma/adapter-neon')
    const ws = await import('ws')
    
    // Configure WebSocket for Node.js environment
    neonConfig.webSocketConstructor = ws.default
    
    const adapter = new PrismaNeon({ connectionString })
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }
}

// Create client lazily - this avoids issues with edge runtime
let prismaPromise: Promise<PrismaClient> | null = null

export async function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }
  
  if (!prismaPromise) {
    prismaPromise = createPrismaClient()
  }
  
  const client = await prismaPromise
  
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  
  return client
}

// Export synchronous version for backwards compatibility (will be deprecated)
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    throw new Error(
      'Direct prisma access is deprecated. Use getPrisma() instead: const prisma = await getPrisma()'
    )
  }
})
