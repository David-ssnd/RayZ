import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  session: {
    strategy: 'jwt',
  },
  providers: [], // Providers are configured in auth.ts to avoid edge runtime issues with Prisma
} satisfies NextAuthConfig
