# WebSocket Bridge Server

Local WebSocket bridge server that connects the browser UI to ESP32 devices on the LAN.

## Overview

In **local mode**, the browser cannot connect directly to ESP32 devices when served over HTTPS (mixed content security). This bridge server runs locally and:

1. Accepts connections from the browser (`ws://localhost:8080`)
2. Maintains connections to ESP32 devices on the LAN
3. Forwards messages bidirectionally

```
┌─────────────┐     ws://localhost:8080     ┌─────────────┐
│   Browser   │ ◄─────────────────────────► │  WS Bridge  │
│   (Next.js) │                             │   Server    │
└─────────────┘                             └──────┬──────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              │                    │                    │
                        ws://192.168.x.1    ws://192.168.x.2    ws://192.168.x.3
                              │                    │                    │
                         ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
                         │  ESP32  │          │  ESP32  │          │  ESP32  │
                         │ Device  │          │ Device  │          │ Device  │
                         └─────────┘          └─────────┘          └─────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start the Server

```bash
pnpm dev
```

The server starts on `ws://localhost:8080` by default.

### 3. Configure Port (Optional)

```bash
WS_BRIDGE_PORT=9000 pnpm dev
```

## Protocol

### Browser → Bridge

**Add a device to manage:**

```json
{
  "type": "add_device",
  "ip": "192.168.1.100"
}
```

**Remove a device:**

```json
{
  "type": "remove_device",
  "ip": "192.168.1.100"
}
```

**Send to specific device:**

```json
{
  "target": "192.168.1.100",
  "payload": {
    "op": 4,
    "type": "game_command",
    "command": 1
  }
}
```

**Broadcast to all devices:**

```json
{
  "broadcast": true,
  "payload": {
    "op": 4,
    "type": "game_command",
    "command": 1
  }
}
```

### Bridge → Browser

**Device list on connect:**

```json
{
  "type": "device_list",
  "devices": [
    { "ip": "192.168.1.100", "connected": true },
    { "ip": "192.168.1.101", "connected": false }
  ]
}
```

**Device connected:**

```json
{
  "type": "device_connected",
  "ip": "192.168.1.100"
}
```

**Device disconnected:**

```json
{
  "type": "device_disconnected",
  "ip": "192.168.1.100"
}
```

**Message from device:**

```json
{
  "source": "192.168.1.100",
  "payload": {
    "op": 10,
    "type": "status",
    "uptime_ms": 123456,
    "config": { ... },
    "stats": { ... },
    "state": { ... }
  }
}
```

## Building for Production

```bash
pnpm build
node dist/index.js
```

## Integration with Desktop App

When packaging RayZ as a desktop app (Electron/Tauri):

### Electron

```js
// main.js
const { fork } = require('child_process')
const path = require('path')

let bridgeProcess

function startBridge() {
  bridgeProcess = fork(path.join(__dirname, 'ws-bridge/dist/index.js'), [], {
    env: { ...process.env, WS_BRIDGE_PORT: '8080' },
  })
}

app.on('ready', () => {
  startBridge()
  createWindow()
})

app.on('quit', () => {
  bridgeProcess?.kill()
})
```

### Tauri

Use Tauri's sidecar feature to bundle and run the bridge:

```json
// tauri.conf.json
{
  "tauri": {
    "bundle": {
      "externalBin": ["ws-bridge"]
    }
  }
}
```

```rust
// main.rs
use tauri::api::process::Command;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            Command::new_sidecar("ws-bridge")
                .expect("failed to create sidecar")
                .spawn()
                .expect("failed to spawn ws-bridge");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}
```

## Environment Variables

| Variable         | Default | Description                   |
| ---------------- | ------- | ----------------------------- |
| `WS_BRIDGE_PORT` | `8080`  | Port for the WebSocket server |

## Troubleshooting

### "Connection refused"

- Ensure no other service is using port 8080
- Check firewall settings

### "Cannot connect to ESP32"

- Verify ESP32 is on the same network
- Check ESP32 IP address is correct
- Ensure ESP32 WebSocket server is running on `/ws` path

### "Mixed content blocked"

- Access the frontend over `http://` not `https://`
- Or use the cloud mode with Ably instead
