# Frontend App

Next.js frontend application for RayZ.

## Getting Started

```bash
# Development
pnpm dev

# Build
pnpm build

# Start production server
pnpm start
```

## Features

- Next.js 14+ with App Router
- TypeScript
- TailwindCSS
- Shared types from `@rayz/types`

## Authentication

- Auth.js (NextAuth v5) lives in `src/auth.config.ts` with `src/auth.ts` exporting the route `handlers`.
- The API route is delegated through `src/app/api/auth/[...nextauth]/route.ts` so Next.js can handle GET/POST requests.
- Global session state is provided via `src/app/providers.tsx`, which wraps the App Router in `src/app/layout.tsx`.
- Visit `/{locale}/session` while running `pnpm dev` to verify sign-in/sign-out flows with `useSession`.

## Environment variables

Create `apps/frontend/.env.local` (or copy from `.env.example`) and fill in the values that match your workspace:

```bash
# Auth.js core
AUTH_SECRET=openssl-rand-hex-32-output
AUTH_URL=http://localhost:3000

# Backend connectivity
BACKEND_API_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
ADAPTER_SECRET=shared-secret-with-backend

# OAuth providers
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# Optional legacy variable names (keeps generic tutorials happy)
NEXTAUTH_SECRET=duplicate-auth-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Generate strong secrets with `openssl rand -hex 32` (available via WSL, Git Bash, or any OpenSSL install) and reuse those values for the optional `NEXTAUTH_*` keys when a third-party tutorial expects them.
