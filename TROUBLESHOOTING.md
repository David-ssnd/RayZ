# RayZ Troubleshooting Guide

This guide covers common issues and their solutions.

## Table of Contents

1. [Database Issues](#database-issues)
2. [Device Connection Problems](#device-connection-problems)
3. [Network Discovery Issues](#network-discovery-issues)
4. [WebSocket Connection Errors](#websocket-connection-errors)
5. [Installation Problems](#installation-problems)
6. [Performance Issues](#performance-issues)

---

## Database Issues

### Error: "unknown variant `postgres`, expected `sqlite`"

**Cause**: The Prisma client was generated for one database type but your `.env` points to another.

**Solution**:

**For Cloud Mode (PostgreSQL)**:
```bash
cd web/packages/database
rm .env.local  # Remove local config
pnpm db:switch:cloud
cd ../..
pnpm dev
```

**For Local Mode (SQLite)**:
```bash
cd web/packages/database
cp .env.local.example .env.local
pnpm db:switch:local
cd ../..
pnpm dev
```

### Error: "Database file is locked"

**Cause**: Multiple processes trying to access SQLite database simultaneously.

**Solution**:
```bash
# Stop all RayZ processes
pkill -f "node.*rayz" # Linux/macOS
# OR on Windows:
# Get-Process | Where-Object {$_.Path -like "*rayz*"} | Stop-Process

# Restart RayZ
pnpm dev
```

### Database Corruption

**Symptoms**: Random crashes, data inconsistencies

**Solution**:
```bash
# Backup current database
cp web/packages/database/rayz-local.db rayz-backup.db

# Reinitialize database
cd web/packages/database
rm rayz-local.db*
pnpm db:init:local
```

---

## Device Connection Problems

### Devices Show as "Offline"

**Check**:
1. ESP32 power supply is connected
2. WiFi credentials are correct on ESP32
3. Devices are on same network as server

**Debug Steps**:
```bash
# Check ESP32 WiFi connection
# Via Serial Monitor (Arduino IDE):
# - Should show "WiFi connected" message
# - Should display IP address

# Test connectivity from server
ping [ESP32_IP_ADDRESS]

# Check WebSocket bridge is running
curl http://localhost:8080
```

### "Connection Refused" Error

**Cause**: WebSocket bridge not running

**Solution**:
```bash
# Check if WS bridge is running
ps aux | grep ws-bridge

# If not running, start it:
cd web/apps/ws-bridge
pnpm start

# Or restart everything:
cd web
pnpm dev
```

### Devices Disconnect Randomly

**Causes**:
- Poor WiFi signal
- Power issues
- Network congestion

**Solutions**:
1. **Improve WiFi signal**: Move router closer or add WiFi extender
2. **Check power**: Use quality USB cables, stable power source
3. **Reduce network load**: Pause downloads, limit other devices

---

## Network Discovery Issues

### "Scan Network" Finds No Devices

**Check**:
1. **Auto-discovery is enabled**:
   ```env
   # In .env or .env.local:
   ENABLE_AUTO_DISCOVERY=true
   ```

2. **mDNS service is running on ESP32**:
   ```cpp
   // Check ESP32 serial output for:
   // "mDNS started: rayz-target-xxx.local"
   ```

3. **Firewall settings**:
   - Allow UDP port 5353 (mDNS)
   - Allow incoming connections on port 8080

**Manual Firewall Configuration**:

**Linux (ufw)**:
```bash
sudo ufw allow 5353/udp
sudo ufw allow 8080/tcp
```

**macOS**:
```bash
# Go to System Preferences → Security & Privacy → Firewall
# Click "Firewall Options"
# Add RayZ app to allowed list
```

**Windows**:
```powershell
# Allow mDNS
New-NetFirewallRule -DisplayName "RayZ mDNS" -Direction Inbound -Protocol UDP -LocalPort 5353 -Action Allow

# Allow WS Bridge
New-NetFirewallRule -DisplayName "RayZ WS Bridge" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

### Discovery Works But "Add Device" Fails

**Cause**: Device already exists in database

**Solution**:
1. Go to **Hardware** → **Devices**
2. Find existing device entry
3. Either:
   - **Edit** the existing device
   - **Delete** and re-add

---

## WebSocket Connection Errors

### Error: "Failed to connect to WS Bridge"

**Check**:
1. **WS Bridge is running**:
   ```bash
   curl http://localhost:8080
   # Should return connection info or not error
   ```

2. **Correct URL in environment**:
   ```env
   # In frontend/.env.local:
   NEXT_PUBLIC_LOCAL_WS_URL=ws://localhost:8080
   ```

3. **Port not blocked**:
   ```bash
   # Check if port 8080 is available
   netstat -an | grep 8080
   ```

### WebSocket Connects But No Data

**Debug Steps**:
```javascript
// Open browser console (F12) and check for:
// - Connection messages
// - Error logs
// - Network tab for WebSocket frames

// Should see:
// [WS] Connected to bridge
// [WS] Received: {...}
```

**Solution**: Restart WS Bridge
```bash
cd web/apps/ws-bridge
pnpm build && pnpm start
```

---

## Installation Problems

### "pnpm: command not found"

**Solution**:
```bash
npm install -g pnpm

# Verify installation
pnpm --version
```

### "Node version not supported"

**Check Version**:
```bash
node --version
# Should be v18.0.0 or higher
```

**Update Node.js**:
- **Linux/macOS**: Use [nvm](https://github.com/nvm-sh/nvm)
  ```bash
  nvm install 18
  nvm use 18
  ```
- **Windows**: Download from [nodejs.org](https://nodejs.org/)

### Dependencies Fail to Install

**Solution**:
```bash
# Clear npm/pnpm cache
pnpm store prune
rm -rf node_modules

# Reinstall
pnpm install --force
```

---

## Performance Issues

### Slow Dashboard Load Times

**Causes**:
- Large match history
- Too many active WebSocket connections
- Insufficient system resources

**Solutions**:
1. **Archive old matches**:
   ```bash
   # Export old data
   # Go to Settings → Export Data
   
   # Clear old matches (SQL)
   sqlite3 web/packages/database/rayz-local.db
   DELETE FROM Match WHERE createdAt < date('now', '-30 days');
   .quit
   ```

2. **Limit active connections**:
   - Close unnecessary dashboard tabs
   - Disconnect inactive devices

3. **Upgrade hardware**:
   - Minimum: 2GB RAM
   - Recommended: 4GB+ RAM, SSD storage

### High CPU Usage

**Check**:
```bash
# Monitor CPU usage
top  # or htop on Linux/macOS
# Task Manager on Windows
```

**Solutions**:
- Reduce log verbosity in `.env`:
  ```env
  LOG_LEVEL=error  # Instead of 'debug'
  ```
- Disable unused features
- Consider running in production mode:
  ```bash
  pnpm build
  pnpm start  # Instead of pnpm dev
  ```

---

## ESP32 Firmware Issues

### ESP32 Won't Flash

**Solutions**:
1. **Hold BOOT button** while connecting USB
2. **Check USB cable** (must be data cable, not charge-only)
3. **Select correct board** in Arduino IDE/PlatformIO
4. **Install CP210x/CH340 drivers** if needed

### ESP32 Boots But Won't Connect to WiFi

**Check Serial Monitor** for error messages:

**Common Issues**:
```cpp
// Wrong credentials
"WiFi connection failed"
→ Check SSID and password in config

// 5GHz network (ESP32 only supports 2.4GHz)
"WiFi not found"
→ Use 2.4GHz network

// Network hidden
→ Make SSID visible or configure hidden SSID properly
```

### Firmware Crashes or Reboots

**Debug**:
```cpp
// Check serial output for crash reason:
// - Stack overflow
// - WDT reset
// - Brownout detector

// Increase stack size if needed
// Improve power supply (>500mA)
// Add delay() in loops
```

---

## Still Having Issues?

If your problem isn't listed here:

1. **Check logs**:
   ```bash
   # Frontend logs
   tail -f web/apps/frontend/.next/server.log
   
   # WS Bridge logs
   tail -f web/apps/ws-bridge/logs/bridge.log
   
   # ESP32 logs
   # Open Arduino IDE Serial Monitor (115200 baud)
   ```

2. **Enable debug mode**:
   ```env
   # In .env:
   LOG_LEVEL=debug
   ```

3. **Search existing issues**: [GitHub Issues](https://github.com/David-ssnd/RayZ/issues)

4. **Create new issue**: Provide:
   - Operating system & version
   - Node.js version (`node --version`)
   - Error messages (full text)
   - Steps to reproduce
   - Screenshots if applicable

---

## Useful Commands

**Check System Status**:
```bash
# All services
docker-compose -f docker-compose.local.yml ps

# Database status
cd web/packages/database
pnpm db:studio  # Opens Prisma Studio
```

**Reset Everything**:
```bash
# Nuclear option - start fresh
rm -rf web/node_modules
rm -rf web/packages/database/rayz-local.db*
cd web
pnpm install
pnpm db:init:local
pnpm dev
```

**View Logs**:
```bash
# Docker logs
docker-compose -f docker-compose.local.yml logs -f

# Development logs
cd web
pnpm dev  # Logs appear in terminal
```

---

**Last Updated**: 2026-02-11  
**Version**: 1.0.0

For more help, visit our [GitHub repository](https://github.com/David-ssnd/RayZ) or open an issue.
