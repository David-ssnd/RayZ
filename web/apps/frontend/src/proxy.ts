import NextAuth from 'next-auth'
import createMiddleware from 'next-intl/middleware'

import { authConfig } from './auth.config'
import { routing } from './i18n/routing'

const { auth } = NextAuth(authConfig)
const intlMiddleware = createMiddleware(routing)

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  // API Protection
  if (nextUrl.pathname.startsWith('/api')) {
    // Public API routes
    if (nextUrl.pathname.startsWith('/api/auth') || nextUrl.pathname.startsWith('/api/health')) {
      return
    }

    // Protected API routes
    if (!isLoggedIn) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return
  }

  // i18n Routing for pages
  return intlMiddleware(req)
}) as any

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
