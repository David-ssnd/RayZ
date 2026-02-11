# RayZ Quick Start Guide

Welcome to RayZ! This guide will help you get up and running in less than 10 minutes.

## What is RayZ?

RayZ is a laser tag game management system that runs on ESP32 devices. It includes:
- **ESP32 Firmware**: Target vests and weapon controllers
- **Web Dashboard**: Game management, player stats, and real-time monitoring
- **Local or Cloud Mode**: Run completely offline or connect to cloud services

## Choose Your Installation Method

### Option 1: Docker (Recommended for Production)

**Requirements**: Docker Desktop or Docker Engine installed

```bash
# Download docker-compose file
curl -O https://raw.githubusercontent.com/David-ssnd/RayZ/main/docker-compose.local.yml

# Start RayZ
docker-compose -f docker-compose.local.yml up -d

# Access at http://localhost:3000
```

### Option 2: Automatic Installation Script

**For Linux/macOS**:
```bash
curl -fsSL https://raw.githubusercontent.com/David-ssnd/RayZ/main/scripts/install-local.sh | bash
```

**For Windows (PowerShell)**:
```powershell
irm https://raw.githubusercontent.com/David-ssnd/RayZ/main/scripts/install-local.ps1 | iex
```

### Option 3: Manual Installation

**Requirements**: Node.js 18+, pnpm

```bash
# 1. Clone repository
git clone https://github.com/David-ssnd/RayZ.git
cd RayZ

# 2. Install dependencies
cd web
pnpm install

# 3. Setup local mode
cd packages/database
cp .env.local.example .env.local
# Edit .env.local with your settings

# 4. Initialize database
pnpm db:init:local

# 5. Start development server
cd ../..
pnpm dev
```

## First Login

After installation, open http://localhost:3000 and login with:
- **Email**: `admin@localhost`
- **Password**: `admin`

⚠️ **Important**: Change the default password immediately after first login!

## Quick Setup Steps

### 1. Scan for ESP32 Devices

1. Go to **Projects** → **Create New Project**
2. Click **"Scan Network"** in the device panel
3. Wait for devices to appear (they'll show up automatically)
4. Click **"Add Device"** for each ESP32 you want to use

### 2. Create a Game Mode

1. Go to **Game Modes**
2. Choose from:
   - **Deathmatch**: Free-for-all, first to reach score wins
   - **Team Deathmatch**: Team-based combat
   - **Last Man Standing**: Elimination mode
3. Customize settings (health, ammo, respawn time, etc.)

### 3. Start a Match

1. Go to **Projects** → Select your project
2. Assign players to devices
3. Configure teams (for team modes)
4. Click **"Start Game"**
5. Monitor live stats in real-time

## Troubleshooting

### Devices Not Appearing

**Check**:
- ESP32 devices are powered on
- Devices are connected to the same Wi-Fi network
- Auto-discovery is enabled (it's on by default)

**Manual Entry**: You can always add devices by IP address if auto-discovery doesn't work.

### Can't Connect to Database

**Local Mode**:
```bash
cd web/packages/database
pnpm db:switch:local
pnpm db:init:local
```

**Cloud Mode**:
- Make sure your `.env` has a valid `DATABASE_URL`
- Check internet connection

### Port Already in Use

If port 3000 or 8080 is already in use:

```bash
# Stop conflicting process
# On Linux/macOS:
lsof -ti:3000 | xargs kill -9

# On Windows (PowerShell):
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Or change the port in .env:
PORT=3001
WS_BRIDGE_PORT=8081
```

## Next Steps

- **[Local Mode Guide](./LOCAL_MODE.md)**: Detailed local deployment instructions
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)**: Common issues and solutions
- **[API Documentation](./API_DOCUMENTATION.md)**: For developers
- **[Contributing Guide](./CONTRIBUTING.md)**: Help improve RayZ

## Architecture Overview

```
┌─────────────────────────┐
│   Browser (Dashboard)   │
│   http://localhost:3000 │
└───────────┬─────────────┘
            │ HTTP/WebSocket
            ▼
┌─────────────────────────┐
│   Next.js + WS Bridge   │
│   - Frontend UI         │
│   - WebSocket relay     │
│   - SQLite database     │
└───────────┬─────────────┘
            │ WebSocket
            ▼
┌─────────────────────────┐
│   ESP32 Devices         │
│   - Targets (vests)     │
│   - Weapons             │
│   - Auto-discovered     │
└─────────────────────────┘
```

## System Requirements

### Server (Where RayZ Runs)
- **CPU**: 2+ cores recommended
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 500MB (database grows with match history)
- **OS**: Linux, macOS, Windows, or Docker

### ESP32 Devices
- **Board**: ESP32 or ESP32-S3
- **WiFi**: 2.4GHz network required
- **Power**: USB or battery pack (5V, 1A minimum)

### Network
- **Router**: Standard home/office WiFi router
- **Speed**: Any (system works on LAN only)
- **Internet**: Optional (required only for cloud mode)

## Support

- **Issues**: [GitHub Issues](https://github.com/David-ssnd/RayZ/issues)
- **Discord**: [Join our community](https://discord.gg/rayz) (if available)
- **Email**: support@rayz.example.com (update with actual)

## License

RayZ is open-source software. See [LICENSE](../LICENSE) for details.

---

Happy gaming! 🎮🔫
