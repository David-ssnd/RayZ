# Dual-Mode Communication Architecture

This document describes the dual-mode communication system that allows RayZ to work in both **local** (offline/LAN) and **cloud** (Vercel/Ably) environments.

## Overview

The app automatically detects which mode to use based on:

1. Environment variable `NEXT_PUBLIC_MODE` (explicit override)
2. Runtime detection (Electron, Tauri, localhost vs cloud domain)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser UI                               │
│                    (Next.js React App)                           │
├─────────────────────────────────────────────────────────────────┤
│                        GameComm Interface                        │
│                 send() / broadcast() / onMessage()               │
├─────────────────┬───────────────────────────────────────────────┤
│   LocalComm     │              CloudComm                         │
│   (WebSocket)   │              (Ably)                            │
├─────────────────┼───────────────────────────────────────────────┤
│ ws://localhost  │          Ably Channels                         │
│    :8080        │      (rayz-game:session)                       │
├─────────────────┼───────────────────────────────────────────────┤
│   WS Bridge     │          Ably SDK                              │
│   Server        │                                                │
├─────────────────┴───────────────────────────────────────────────┤
│                       ESP32 Devices                              │
│              (WebSocket ws:// or Ably client)                    │
└─────────────────────────────────────────────────────────────────┘
```

## Files Structure

```
web/apps/frontend/src/lib/comm/
├── index.ts              # Main exports & createGameComm factory
├── types.ts              # TypeScript interfaces
├── mode.ts               # Mode detection utilities
├── features.ts           # Feature flags per mode
├── FeatureGate.tsx       # React components for conditional rendering
├── GameCommContext.tsx   # React context provider
├── LocalComm.ts          # WebSocket implementation
└── CloudComm.ts          # Ably implementation

web/apps/ws-bridge/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts          # Local WebSocket bridge server
```

## Usage

### Basic Setup

```tsx
import { GameCommProvider, useGameCommContext } from '@/lib/comm'

function App() {
  return (
    <GameCommProvider sessionId="my-game-session">
      <GameUI />
    </GameCommProvider>
  )
}

function GameUI() {
  const { state, send, broadcast, connectedDevices } = useGameCommContext()

  const startGame = () => {
    broadcast({
      op: OpCode.GAME_COMMAND,
      type: 'game_command',
      command: GameCommandType.START,
    })
  }

  return (
    <div>
      <p>Connection: {state}</p>
      <p>Devices: {connectedDevices.length}</p>
      <button onClick={startGame}>Start Game</button>
    </div>
  )
}
```

### Feature Gating

```tsx
import { CloudOnly, Feature, LocalOnly } from '@/lib/comm'

function Dashboard() {
  return (
    <div>
      {/* Always visible */}
      <GameControls />

      {/* Cloud-only features */}
      <CloudOnly>
        <Leaderboard />
        <MatchHistory />
        <Achievements />
      </CloudOnly>

      {/* Local-only features */}
      <LocalOnly>
        <ServerControlPanel />
        <DirectDeviceManager />
      </LocalOnly>

      {/* Specific feature check */}
      <Feature name="adminDashboard">
        <AdminPanel />
      </Feature>
    </div>
  )
}
```

### Mode Detection

```tsx
import { isCloudMode, isLocalMode, useAppMode } from '@/lib/comm'

function MyComponent() {
  const { mode, isCloud, isLocal } = useAppMode()

  return <div>Running in {mode} mode</div>
}

// Or use functions directly
if (isCloudMode()) {
  // Cloud-specific logic
}
```

## Environment Variables

| Variable                     | Description             | Values                |
| ---------------------------- | ----------------------- | --------------------- |
| `NEXT_PUBLIC_MODE`           | Force specific mode     | `local` \| `cloud`    |
| `NEXT_PUBLIC_LOCAL_WS_URL`   | Local WS server URL     | `ws://localhost:8080` |
| `NEXT_PUBLIC_WS_BRIDGE_URL`  | WS bridge URL (legacy)  | `ws://...`            |
| `NEXT_PUBLIC_ABLY_API_KEY`   | Ably API key (dev only) | `xxxxx:yyyyy`         |
| `NEXT_PUBLIC_ABLY_TOKEN_URL` | Ably token endpoint     | `/api/ably/token`     |

## Local Mode Setup

### 1. Install Dependencies

```bash
cd web
pnpm install
```

### 2. Start the WS Bridge Server

```bash
cd apps/ws-bridge
pnpm dev
```

This starts the WebSocket bridge on `ws://localhost:8080`.

### 3. Start the Frontend

```bash
cd apps/frontend
NEXT_PUBLIC_MODE=local pnpm dev
```

### 4. Configure ESP32 Devices

ESP32 devices connect directly to the bridge server:

```cpp
// In ESP32 firmware config
#define WS_SERVER_IP "192.168.1.100"  // Computer running bridge
#define WS_SERVER_PORT 8080
```

### Packaging for Download (Optional)

For a downloadable local app, you can:

1. **Static Export + Node Server**

   ```bash
   cd apps/frontend
   pnpm build
   # Bundle with ws-bridge server
   ```

2. **Electron** (recommended for desktop)
   - Wrap Next.js in Electron
   - Bundle ws-bridge as main process
   - See `electron-builder` for packaging

3. **Tauri** (lighter weight)
   - Use Tauri for the desktop shell
   - Run ws-bridge as sidecar process

## Cloud Mode Setup

### 1. Create Ably Account

Sign up at [ably.com](https://ably.com) and create an app.

### 2. Configure Environment

```env
# .env.local
NEXT_PUBLIC_ABLY_API_KEY=your-api-key  # For development only
# OR
NEXT_PUBLIC_ABLY_TOKEN_URL=/api/ably/token  # For production
```

### 3. Create Token Endpoint (Production)

```ts
// app/api/ably/token/route.ts
import { NextResponse } from 'next/server'
import Ably from 'ably'

const ably = new Ably.Rest(process.env.ABLY_API_KEY!)

export async function GET() {
  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: `browser-${Date.now()}`,
  })
  return NextResponse.json(tokenRequest)
}
```

### 4. Deploy to Vercel

```bash
vercel deploy
```

### 5. Configure ESP32 for Cloud

ESP32 devices need Ably client library:

```cpp
// Using Ably MQTT or REST API
// See: https://ably.com/docs/mqtt

#include <PubSubClient.h>

// Connect to Ably MQTT broker
const char* mqtt_server = "mqtt.ably.io";
const int mqtt_port = 8883;
const char* mqtt_user = "YOUR_API_KEY";  // First part of API key
const char* mqtt_pass = "YOUR_API_SECRET";  // Second part

void setup() {
  // Connect to Ably MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.connect("esp32-device-id", mqtt_user, mqtt_pass);

  // Subscribe to commands
  client.subscribe("rayz-game:session:devices");
}

void publishMessage(const char* payload) {
  client.publish("rayz-game:session:devices", payload);
}
```

## ESP32 Integration Notes

### Local Mode (WebSocket)

ESP32 connects directly via WebSocket:

```cpp
#include <WebSocketsClient.h>

WebSocketsClient ws;

void setup() {
  ws.begin("192.168.1.100", 8080, "/");
  ws.onEvent(webSocketEvent);
}

void loop() {
  ws.loop();
}

void sendMessage(const char* json) {
  ws.sendTXT(json);
}
```

### Cloud Mode (Ably)

Options for ESP32 Ably integration:

1. **MQTT Protocol** (recommended)
   - Native ESP32 support via PubSubClient
   - Lower overhead than WebSocket
   - See Ably MQTT documentation

2. **REST API**
   - Simple HTTP POST for publishing
   - Use for low-frequency updates
   - Higher latency

3. **WebSocket via Proxy**
   - Run a cloud proxy (AWS Lambda, Cloudflare Worker)
   - Proxy translates ESP32 WS to Ably

### Message Format

Both modes use the same message format:

```json
{
  "op": 10,
  "type": "status",
  "uptime_ms": 123456,
  "config": { ... },
  "stats": { ... },
  "state": { ... }
}
```

For cloud mode, messages are wrapped:

```json
{
  "source": "device-ip-or-id",
  "payload": {
    /* actual message */
  }
}
```

## Feature Flags Reference

| Feature                  | Local | Cloud | Description            |
| ------------------------ | ----- | ----- | ---------------------- |
| `gameControl`            | ✅    | ✅    | Start/stop/reset games |
| `deviceManagement`       | ✅    | ✅    | Add/remove devices     |
| `teamSetup`              | ✅    | ✅    | Configure teams        |
| `gameRules`              | ✅    | ✅    | Set game rules         |
| `leaderboards`           | ❌    | ✅    | Global rankings        |
| `globalStats`            | ❌    | ✅    | Cross-game statistics  |
| `adminDashboard`         | ❌    | ✅    | Admin controls         |
| `userAccounts`           | ❌    | ✅    | User authentication    |
| `matchHistory`           | ❌    | ✅    | Past game records      |
| `achievements`           | ❌    | ✅    | Achievement system     |
| `cloudBackup`            | ❌    | ✅    | Cloud data sync        |
| `directDeviceConnection` | ✅    | ❌    | Direct WS to ESP32     |
| `offlinePlay`            | ✅    | ❌    | No internet required   |
| `localServerControl`     | ✅    | ❌    | Manage local server    |

## Troubleshooting

### "Cannot connect in HTTPS mode"

ESP32 devices only support `ws://` (unencrypted). When accessing the app over HTTPS:

- **Local**: Run over HTTP (`http://localhost:3000`)
- **Cloud**: Use Ably (handles encryption)

### "Ably connection failed"

1. Check API key is correct
2. Verify token endpoint returns valid token
3. Check browser console for CORS errors

### "Devices not appearing"

1. **Local**: Ensure ws-bridge is running
2. **Cloud**: Verify ESP32 is publishing to correct channel
3. Check device IP/ID in bridge logs

### "Mode detection wrong"

Override with environment variable:

```bash
NEXT_PUBLIC_MODE=local pnpm dev
```
