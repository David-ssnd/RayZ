# Auto-Mode Setup Guide

RayZ automatically detects whether to use **local mode** (SQLite) or **cloud mode** (PostgreSQL) based on environment variables.

## How It Works

The system auto-detects mode using this priority:

1. **`DATABASE_MODE`** environment variable (`local` or `cloud`)
2. **`DATABASE_URL`** format:
   - Starts with `file:` → Local mode
   - Starts with `postgres:` or `postgresql:` → Cloud mode
3. **Default**: Cloud mode (for Vercel deployments)

## Local Development Setup

### 1. Create `.env.local` in `web/packages/database/`

```bash
cd C:\Users\dado7\Desktop\RayZ\web\packages\database
cp .env.local.example .env.local
```

### 2. Edit `.env.local`

```env
# Local Mode Configuration
DATABASE_MODE=local
DATABASE_URL=file:./rayz-local.db

# Auth (generate secret: openssl rand -base64 32)
AUTH_SECRET=your-random-secret-here
```

### 3. Initialize Local Database

```bash
pnpm db:init:local
```

This creates:
- `rayz-local.db` SQLite database
- Admin user: `admin@localhost` / `admin`
- 3 default game modes

### 4. Start Development Server

```bash
cd ../..
pnpm dev
```

✅ **Auto-detects local mode** from `.env.local` and uses SQLite!

---

## Vercel (Cloud) Setup

### Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgres://user:password@host/database?sslmode=require

# Auth
AUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://your-app.vercel.app

# Optional: OAuth
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

**DO NOT** set `DATABASE_MODE=local` on Vercel!

### How It Works on Vercel

1. Vercel injects `DATABASE_URL` (PostgreSQL) at build time
2. Auto-detect script sees `postgres://` → switches to cloud mode
3. Prisma generates PostgreSQL client
4. App runs with cloud database

✅ **No manual schema switching needed!**

---

## Commands Reference

### Auto-Mode (Recommended)

```bash
# Build (auto-detects mode)
pnpm build

# Generate Prisma client (auto-detects mode)
pnpm db:generate

# Push schema (auto-detects mode)
pnpm db:push
```

### Manual Override

```bash
# Force local mode
pnpm db:switch:local

# Force cloud mode
pnpm db:switch:cloud
```

---

## Troubleshooting

### Error: "unknown variant postgres, expected sqlite"

**Cause**: Schema mismatch (SQLite schema but PostgreSQL URL)

**Solution**:
```bash
cd web/packages/database
pnpm db:generate  # Auto-detects and fixes
```

### Error: "unknown variant sqlite, expected postgres"

**Cause**: Schema mismatch (PostgreSQL schema but SQLite URL)

**Solution**:
```bash
cd web/packages/database
pnpm db:generate  # Auto-detects and fixes
```

### Vercel Build Fails

**Check**:
1. `DATABASE_URL` is set in Vercel environment variables
2. `DATABASE_MODE` is **NOT** set (or set to `cloud`)
3. Database is accessible from Vercel IPs

---

## File Structure

```
web/packages/database/
├── .env.local          # Local development ONLY (gitignored)
├── .env.local.example  # Template for local setup
├── prisma/
│   ├── schema.postgres.prisma  # Cloud mode schema
│   ├── schema.sqlite.prisma    # Local mode schema
│   └── schema.prisma           # Active schema (auto-generated)
├── scripts/
│   ├── auto-detect-mode.js     # 🆕 Auto-detection logic
│   ├── switch-schema.js        # Manual schema switcher
│   └── init-local.js           # Local DB seeder
└── rayz-local.db       # SQLite database (local only, gitignored)
```

---

## Summary

### Local Development
```bash
# One-time setup
cd web/packages/database
cp .env.local.example .env.local
# Edit .env.local: DATABASE_MODE=local, DATABASE_URL=file:./rayz-local.db
pnpm db:init:local

# Daily usage
cd ../..
pnpm dev  # Auto-detects local mode ✅
```

### Vercel Deployment
```bash
# Set environment variables in Vercel dashboard
# DATABASE_URL=postgres://...
# (Do NOT set DATABASE_MODE)

# Push to GitHub
git push origin main  # Auto-deploys, auto-detects cloud mode ✅
```

**No manual switching needed!** 🎉
