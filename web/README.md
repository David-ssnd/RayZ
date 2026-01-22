# RayZ Web Monorepo

This is a [Turborepo](https://turbo.build/repo) monorepo for the RayZ web application.

## What's inside?

This Turborepo includes the following packages/apps:

### Apps

- `apps/frontend`: Next.js frontend application
- `apps/backend`: Next.js backend API application

### Packages

- `packages/ui`: Shared UI components (shadcn/ui)
- `packages/types`: Shared TypeScript types
- `packages/eslint-config`: Shared ESLint configuration
- `packages/typescript-config`: Shared TypeScript configuration

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9.0.0+

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Run specific app
pnpm dev --filter=frontend
pnpm dev --filter=backend
```

### Build

```bash
# Build all apps
pnpm build

# Build specific app
pnpm build --filter=frontend
```

### Testing

```bash
# Run all tests
pnpm test
```

### Linting

```bash
# Lint all packages
pnpm lint

# Format all files
pnpm format
```

## Tech Stack

- **Framework**: Next.js 14+
- **Build System**: Turborepo
- **Package Manager**: pnpm
- **Styling**: TailwindCSS + shadcn/ui
- **Database**: PostgreSQL (Neon) + Prisma
- **Testing**: Jest + Playwright
- **Linting**: ESLint + Prettier

## Useful Links

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
