# Local Mode Setup Guide

This guide explains how to run RayZ in **local mode** without requiring a cloud database or internet connection.

## Prerequisites

- Node.js 18+ and pnpm installed
- ESP32 devices on the same network
- Basic knowledge of terminal/command line

## Quick Start

### 1. Set Up Local Database

```bash
# Navigate to database package
cd web/packages/database

# Copy environment template
cp .env.local.example .env.local

# Initialize SQLite database with default data
pnpm db:init:local
```

This creates:
- `rayz-local.db` - Local SQLite database file
- Default admin user (email: `admin@localhost`, password: `admin`)
- System game modes (Deathmatch, Team Deathmatch, Last Man Standing)

### 2. Start the Application

```bash
# From the web directory
cd ../..
pnpm dev
```

The application will:
- Run Next.js frontend on http://localhost:3000
- Start WebSocket bridge on ws://localhost:8080
- Use local SQLite database (no internet required)

### 3. Login

- Email: `admin@localhost`
- Password: `admin`

⚠️ **Change the default password after first login!**

---

## Architecture

### Local Mode vs Cloud Mode

| Feature | Cloud Mode | Local Mode |
|---------|-----------|------------|
| Database | Neon PostgreSQL (cloud) | SQLite (local file) |
| Internet | Required | Not required |
| WebSocket | Local bridge | Local bridge |
| ESP32 Discovery | Manual IP entry | Manual IP entry (auto-discovery coming soon) |

### How It Works

```
┌─────────────────────────────────────────────┐
│  Browser (http://localhost:3000)            │
└────────────┬────────────────────────────────┘
             │
             │ HTTP/WebSocket
             ▼
┌─────────────────────────────────────────────┐
│  Next.js App + WS Bridge                    │
│  - Reads: rayz-local.db (SQLite)            │
│  - Serves: Frontend UI                      │
│  - Bridges: WebSocket ↔ ESP32               │
└────────────┬────────────────────────────────┘
             │
             │ WebSocket (ws://192.168.x.x)
             ▼
┌─────────────────────────────────────────────┐
│  ESP32 Devices (Targets & Weapons)          │
│  - Connected to same LAN                    │
│  - Communicate via WebSocket                │
└─────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

The `.env.local` file contains all local mode configuration:

```env
# Database
DATABASE_MODE=local
DATABASE_URL=file:./rayz-local.db

# Next.js
NEXT_PUBLIC_MODE=local
NEXT_PUBLIC_LOCAL_WS_URL=ws://localhost:8080

# Authentication
AUTH_SECRET=<random-secret>
AUTH_URL=http://localhost:3000
```

**Note**: The `AUTH_SECRET` is auto-generated when you create `.env.local`

---

## Database Management

### View Database Contents

```bash
cd web/packages/database
pnpm db:studio
```

Opens Prisma Studio in your browser to view/edit database records.

### Reset Database

```bash
# Delete the database file
rm rayz-local.db

# Reinitialize
pnpm db:init:local
```

### Backup Database

```bash
# Simple file copy
cp rayz-local.db rayz-local-backup-$(date +%Y%m%d).db
```

---

## ESP32 Setup

### Add Devices Manually

1. Make sure ESP32s are connected to the same WiFi network
2. Note their IP addresses (check router or serial monitor)
3. In the web UI:
   - Go to **Devices** page
   - Click **Add Device**
   - Enter device name and IP address
   - Save

### WebSocket Configuration

ESP32 devices connect to the WS Bridge at:
```
ws://[YOUR_COMPUTER_IP]:8080
```

Replace `YOUR_COMPUTER_IP` with your computer's local IP (e.g., `192.168.1.100`).

---

## Troubleshooting

### Database Errors

**Problem**: `DATABASE_URL is not set`

**Solution**: Make sure `.env.local` exists and contains `DATABASE_URL=file:./rayz-local.db`

---

**Problem**: `ENOENT: no such file or directory, open 'rayz-local.db'`

**Solution**: Run `pnpm db:init:local` to create the database

---

### Connection Issues

**Problem**: ESP32 can't connect to WebSocket

**Solution**: 
1. Check computer firewall (allow port 8080)
2. Verify ESP32 and computer are on same network
3. Use computer's local IP, not `localhost`

---

**Problem**: Frontend can't reach backend

**Solution**:
1. Ensure `pnpm dev` is running
2. Check if port 3000 and 8080 are available
3. Try restarting the dev server

---

## Advanced

### Production Deployment

For production deployment (single binary), see the Docker guide:

```bash
# Build Docker image
docker build -t rayz-local -f Dockerfile.local .

# Run container
docker run -p 3000:3000 -p 8080:8080 -v $(pwd)/data:/data rayz-local
```

### Export/Import Data

**Export** (coming soon):
```bash
# Export all game data to JSON
pnpm export-data > backup.json
```

**Import** (coming soon):
```bash
# Import from JSON backup
pnpm import-data < backup.json
```

---

## Next Steps

- [ ] **Auto-Discovery**: ESP32 devices will advertise themselves via mDNS
- [ ] **Setup Wizard**: First-time setup guide in the web UI
- [ ] **Export/Import**: Backup and restore game data
- [ ] **Docker Packaging**: One-command deployment

---

## FAQ

**Q: Can I switch between cloud and local mode?**

A: Yes! Just change the `.env` file. However, databases are separate (cloud data won't automatically sync to local).

---

**Q: Can I use both modes simultaneously?**

A: No, the app runs in one mode at a time based on `DATABASE_MODE` environment variable.

---

**Q: Is local mode slower than cloud mode?**

A: No! SQLite is often faster for local operations. You'll likely see better performance.

---

**Q: Can I access the local deployment from other devices?**

A: Yes! Use your computer's local IP instead of `localhost`. Example: `http://192.168.1.100:3000`

---

## Support

For issues or questions:
1. Check the [main README](../../../README.md)
2. Review [troubleshooting](#troubleshooting) section
3. Open an issue on GitHub
