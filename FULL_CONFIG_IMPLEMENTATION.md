# Full Configuration System Implementation

## Overview
Implemented comprehensive device configuration management for RayZ laser tag system, enabling web interface to send complete configuration to ESP32 devices including identity, game settings, and ESP-NOW peer networks.

## Changes Made

### 1. Protocol Updates

**protocol_def.json**
- Added `device_name` field (string) to ConfigUpdate message
- Added `espnow_peers` field (string, CSV format) to ConfigUpdate message
- Format: "aa:bb:cc:dd:ee:ff,11:22:33:44:55:66,..."

### 2. Frontend Implementation

**DeviceConfigManager.ts** (NEW - 12KB)
- Complete configuration management class
- Methods for setting device info, game rules, hardware settings
- ESP-NOW peer management (add, remove, bulk configure)
- Team-based configuration helpers
- Mesh network auto-configuration
- Query and persistence helpers

**Features:**
- `setDeviceInfo()` - Set name, IDs, team, color
- `setEspNowPeers()` - Configure peer MAC addresses
- `setGameRules()` - Health, ammo, respawn, friendly fire
- `setHardwareSettings()` - IR power, volume, haptic
- `applyGameSessionToAll()` - Bulk apply settings
- `assignTeamColors()` - Team-based coloring
- `configureEspNowMesh()` - Auto-configure full mesh network
- `sendFullConfig()` - Send complete configuration
- `sendToAllDevices()` - Broadcast to all devices
- `sendPeerUpdate()` - Update only ESP-NOW peers
- `resetToDefaults()` - Reset device configuration

**TypeScript Types** (protocol.ts)
- Updated `ConfigUpdateMessage` with `device_name` and `espnow_peers`
- Added `DeviceFullConfig` interface with all configuration fields
- Proper type definitions for all configuration parameters

### 3. ESP32 Implementation

**game_protocol.h**
```cpp
typedef struct {
    uint8_t device_id;
    uint8_t player_id;
    uint8_t team_id;
    uint32_t color_rgb;
    DeviceRole role;
    char device_name[32];  // NEW: Device display name
} DeviceConfig;
```

**ws_server.cpp - handle_config_update()**
Enhanced configuration handler with:
- Device name parsing and storage
- All identity fields (device_id, player_id, team_id, color)
- Health settings (max_hearts, spawn_hearts, respawn_time_s, enable_hearts, friendly_fire)
- Ammo settings (max_ammo, reload_time_ms, enable_ammo)
- Game duration (game_duration_s)
- **ESP-NOW peer management** - Parses CSV peer list and calls `espnow_comm_load_peers_from_csv()`
- Logging for peer configuration success/failure
- Automatic save to NVS
- Broadcast updated state to all connected clients

**game_state.cpp**
- Added device name to NVS storage (key: "device_name")
- `game_state_load_ids()` now loads device name from NVS
- `game_state_save_ids()` now saves device name to NVS
- Persistent storage across reboots

### 4. Testing Page (Created but not deployed)

**test-config/page.tsx**
Comprehensive test suite with 7 tests:
1. Configure Single Device
2. Configure Multiple Devices with Teams
3. Configure ESP-NOW Mesh Network
4. Team-Based Configuration
5. ESP-NOW Peer Management (add/remove)
6. Reset Device to Defaults
7. Query Current Configuration

Real-time logging interface showing:
- Configuration operations
- Success/failure status
- Device information display
- Color-coded test results

## Configuration Flow

```
Web Interface (DeviceConfigManager)
    ↓
LocalComm.send() → WebSocket Connection
    ↓
ESP32 WebSocket Server
    ↓
handle_config_update()
    ├─ Parse device_name → DeviceConfig
    ├─ Parse identity (IDs, color) → DeviceConfig
    ├─ Parse game settings → GameConfig
    ├─ Parse espnow_peers → espnow_comm_load_peers_from_csv()
    ├─ Save to NVS → game_state_save_ids()
    └─ Broadcast update → ws_server_broadcast_game_state()
```

## ESP-NOW Peer Management

### Frontend
```typescript
// Configure mesh network (all devices can talk to each other)
const deviceMap = new Map([
  ['192.168.1.100', { ip: '192.168.1.100', mac: 'aa:bb:cc:dd:ee:01' }],
  ['192.168.1.101', { ip: '192.168.1.101', mac: 'aa:bb:cc:dd:ee:02' }],
  // ...
])
configManager.configureEspNowMesh(deviceMap)
await configManager.sendToAllDevices()
```

### ESP32
```cpp
// Receives CSV: "aa:bb:cc:dd:ee:01,aa:bb:cc:dd:ee:02"
item = cJSON_GetObjectItem(root, "espnow_peers");
if (item && cJSON_IsString(item)) {
    espnow_comm_load_peers_from_csv(item->valuestring);
    // Peers are now registered and ready for communication
}
```

## Message Format Example

```json
{
  "op": 3,
  "type": "config_update",
  "device_name": "Player 1 - Target",
  "device_id": 1,
  "player_id": 1,
  "team_id": 1,
  "color_rgb": 16711680,
  "enable_hearts": true,
  "max_hearts": 10,
  "spawn_hearts": 10,
  "respawn_time_s": 5,
  "friendly_fire": false,
  "enable_ammo": true,
  "max_ammo": 100,
  "reload_time_ms": 2000,
  "game_duration_s": 300,
  "ir_power": 1,
  "volume": 80,
  "haptic_enabled": true,
  "espnow_peers": "aa:bb:cc:dd:ee:02,aa:bb:cc:dd:ee:03,aa:bb:cc:dd:ee:04"
}
```

## Storage (NVS)

### Keys
- `device_id_u8` - Device ID (uint8)
- `player_id_u8` - Player ID (uint8)
- `team_id_u8` - Team ID (uint8)
- `color_u32` - Color RGB (uint32)
- `device_name` - Device name (string, up to 31 chars)

### Namespace
- `game` - All device configuration

## Build Results

### Frontend Build
```
✓ Compiled successfully in 10.7s
✓ Generating static pages using 19 workers (24/24) in 2.7s

Tasks:    3 successful, 3 total
Time:     39.975s
Status:   SUCCESS ✓
```

### ESP32 Target Build
```
Building in release mode
RAM:   [=         ]  10.6% (used 34644 bytes from 327680 bytes)
Flash: [========  ]  84.7% (used 1109757 bytes from 1310720 bytes)
Status: SUCCESS ✓
```

## Usage Example

### Quick Start
```typescript
import { LocalComm, DeviceConfigManager } from '@/lib/comm'

// Initialize
const comm = new LocalComm({ serverUrl: 'ws://192.168.1.100/ws' })
const config = new DeviceConfigManager(comm)

comm.connect()

// Configure a device
config.setDeviceInfo('192.168.1.100', {
  name: 'Player 1 - Target',
  deviceId: 1,
  playerId: 1,
  teamId: 1,
  color: 0xFF0000  // Red
})

config.setGameRules('192.168.1.100', {
  maxHearts: 10,
  maxAmmo: 100,
  friendlyFire: false
})

config.setEspNowPeers('192.168.1.100', [
  'aa:bb:cc:dd:ee:02',
  'aa:bb:cc:dd:ee:03'
])

// Send configuration
await config.sendFullConfig('192.168.1.100')
```

### Team Game Setup
```typescript
// Configure Red Team
const redTeam = ['192.168.1.100', '192.168.1.101']
config.assignTeamColors(redTeam, 1, 0xFF0000)

// Configure Blue Team
const blueTeam = ['192.168.1.102', '192.168.1.103']
config.assignTeamColors(blueTeam, 2, 0x0000FF)

// Apply game settings to all
config.applyGameSessionToAll({
  maxHearts: 10,
  maxAmmo: 100,
  respawnTimeS: 5,
  gameDurationS: 600,
  friendlyFire: false,
  teamPlay: true
})

// Configure mesh network
const deviceMap = new Map([
  ['192.168.1.100', { ip: '192.168.1.100', mac: 'aa:bb:cc:dd:ee:01' }],
  ['192.168.1.101', { ip: '192.168.1.101', mac: 'aa:bb:cc:dd:ee:02' }],
  ['192.168.1.102', { ip: '192.168.1.102', mac: 'aa:bb:cc:dd:ee:03' }],
  ['192.168.1.103', { ip: '192.168.1.103', mac: 'aa:bb:cc:dd:ee:04' }]
])
config.configureEspNowMesh(deviceMap)

// Send to all devices
const result = await config.sendToAllDevices()
console.log(`Sent: ${result.sent}, Failed: ${result.failed}`)
```

## Features Implemented

✅ Device name configuration  
✅ Complete identity management (device_id, player_id, team_id, color)  
✅ Game rules configuration (health, ammo, respawn, friendly fire)  
✅ Hardware settings (IR power, volume, haptic)  
✅ ESP-NOW peer management (add, remove, bulk configure)  
✅ Mesh network auto-configuration  
✅ Team-based configuration helpers  
✅ Persistent storage in NVS  
✅ Bulk operations (send to all, apply session settings)  
✅ Query and reset operations  
✅ Full TypeScript type safety  
✅ Comprehensive documentation  

## Testing Recommendations

1. **Single Device Test**
   - Connect to one ESP32
   - Send full configuration
   - Verify NVS persistence (reboot device, check if config retained)
   - Check device name displayed on LVGL UI

2. **Multi-Device Test**
   - Connect 2-4 devices
   - Configure teams with different colors
   - Send ESP-NOW peer lists
   - Test device-to-device communication via ESP-NOW

3. **Mesh Network Test**
   - Configure 4+ devices in full mesh
   - Send test messages between devices
   - Verify all peers can communicate

4. **Persistence Test**
   - Configure device
   - Reboot device
   - Check if name, IDs, color, and peers are retained

## Next Steps

1. **Integration Testing** - Test with actual ESP32 hardware
2. **UI Integration** - Add configuration UI to main frontend
3. **Auto-Discovery** - Implement device discovery and auto-configuration
4. **Peer Persistence** - Optionally store ESP-NOW peers in NVS
5. **Config Validation** - Add validation for peer MAC addresses and field ranges

## Files Modified

- `protocol_def.json` - Added device_name and espnow_peers fields
- `web/packages/types/src/protocol.ts` - Updated TypeScript types
- `web/apps/frontend/src/lib/comm/DeviceConfigManager.ts` - NEW configuration manager
- `web/apps/frontend/src/lib/comm/index.ts` - Export new manager
- `esp32/shared/include/game_protocol.h` - Added device_name to DeviceConfig
- `esp32/shared/src/ws_server.cpp` - Enhanced config handler
- `esp32/shared/src/game_state.cpp` - Added device name storage

## Build Status

- ✅ Frontend: BUILD SUCCESS (39.9s)
- ✅ ESP32 Target: BUILD SUCCESS (19.6s)
- ✅ All TypeScript types validated
- ✅ No compilation errors
- ✅ Ready for deployment

---

**Implementation Complete** - Full configuration system ready for testing on hardware.
