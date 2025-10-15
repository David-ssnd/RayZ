# Backend API App

Next.js backend API application for RayZ.

## Getting Started

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/rayz?schema=public"
```

### Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

The backend will run on `http://localhost:3001`

### Database Management

```bash
# Open Prisma Studio
pnpm db:studio

# Generate Prisma client after schema changes
pnpm db:generate

# Push schema changes to database
pnpm db:push
```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/targets` - List all targets
- `GET /api/weapons` - List all weapons

## Features

- Next.js 14+ API routes
- TypeScript
- Prisma ORM
- PostgreSQL database
- Shared types from `@rayz/types`
