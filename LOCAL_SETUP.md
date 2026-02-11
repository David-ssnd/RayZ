# 🚀 Local Mode Quick Setup

Run RayZ with SQLite database (no cloud/internet needed).

## ⚡ Quick Start

```bash
# 1. Navigate to database package
cd web/packages/database

# 2. Initialize local database
pnpm db:init:local

# 3. Start development (from web directory)
cd ../..
pnpm dev
```

## 🔑 Login

- **URL**: http://localhost:3000
- **Email**: `admin@localhost`
- **Password**: `admin`

⚠️ Change password after first login!

## 🎯 How It Works

The system **auto-detects** which mode to use:

### Local Development
- Looks for `.env.local` in `web/packages/database/`
- If `DATABASE_MODE=local` → Uses SQLite
- Database file: `rayz-local-new.db`

### Vercel Deployment  
- Uses `DATABASE_URL` from Vercel environment variables
- If `DATABASE_URL` starts with `postgres://` → Uses PostgreSQL
- No manual switching needed!

## 📁 Files Created

```
web/
├── packages/database/
│   ├── .env.local                    # Local mode config
│   ├── rayz-local-new.db            # SQLite database
│   └── scripts/
│       └── auto-detect-mode.js      # Auto mode detection
└── apps/frontend/
    └── .env.local                    # Frontend local config
```

## 🔄 Switch Modes

### Force Local Mode
```bash
cd web/packages/database
pnpm db:switch:local
pnpm db:init:local
```

### Force Cloud Mode
```bash
cd web/packages/database
rm .env.local  # Delete local config
pnpm db:switch:cloud
```

## 🐛 Troubleshooting

### "unknown variant postgres, expected sqlite"
**Fix**: Schema mismatch
```bash
cd web/packages/database
pnpm db:generate  # Auto-detects and fixes
```

### "Cannot find module '@prisma/client'"
**Fix**: Generate Prisma client
```bash
cd web/packages/database
pnpm db:generate
```

### Port 3000 already in use
**Fix**: Kill existing processes
```powershell
# Windows
Get-Process -Name node | Stop-Process -Force

# Then restart
pnpm dev
```

## 📚 More Documentation

- **[AUTO_MODE_SETUP.md](./web/packages/database/AUTO_MODE_SETUP.md)** - Detailed auto-mode guide
- **[LOCAL_MODE.md](./web/packages/database/LOCAL_MODE.md)** - Complete local mode documentation
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues & solutions

## ✅ Verification

After starting, you should see:
```
frontend:dev: 🏠 Using local SQLite database
@rayz/ws-bridge:dev: [WsBridge] Server started on ws://localhost:8080
frontend:dev:    ▲ Next.js 16.0.10 (Turbopack)
frontend:dev:    - Local:         http://localhost:3000
```

Done! 🎉
