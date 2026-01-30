# RayZ WebSocket Protocol v2.3

**Last Updated:** 2026-01-26  
**Status:** Production Ready

## Overview

RayZ uses a WebSocket-based protocol for real-time communication between the web server and ESP32 devices (weapons and targets). This document defines the message format, operation codes, and data structures for protocol version 2.3.

### Key Features
- Bidirectional real-time communication
- JSON message format for simplicity
- Support for multiple game modes and win conditions
- Real-time game state updates
- Dynamic game control (pause/resume/extend)

---

## Table of Contents

1. [Connection & Authentication](#connection--authentication)
2. [Message Format](#message-format)
3. [Operation Codes (OpCodes)](#operation-codes-opcodes)
4. [Client → ESP32 Messages](#client--esp32-messages)
5. [ESP32 → Client Messages](#esp32--client-messages)
6. [Game Configuration](#game-configuration)
7. [Game Commands](#game-commands)
8. [Win Conditions](#win-conditions)
9. [Sequence Diagrams](#sequence-diagrams)
10. [Error Handling](#error-handling)
11. [Version History](#version-history)

---

## Connection & Authentication

### WebSocket Endpoint

```
ws://<device-ip>:81/ws
```

### Connection Flow

1. **Client initiates WebSocket connection** to ESP32 device
2. **ESP32 accepts connection** and waits for commands
3. **Client sends `GET_STATUS`** to retrieve device configuration
4. **ESP32 responds with `STATUS`** message containing full state
5. **Client sends periodic `HEARTBEAT`** (every 10 seconds)
6. **ESP32 responds with `HEARTBEAT_ACK`**

### Disconnection

- Client may close connection gracefully
- ESP32 detects disconnection via WebSocket events
- Automatic reconnection should be implemented on client side with exponential backoff

---

## Message Format

All messages are JSON objects with the following base structure:

```json
{
  "op": <number>,
  "type": "<string>",
  "req_id": "<uuid>" // Optional, for tracking acknowledgments
}
```

### Base Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `op` | integer | Yes | Operation code (see OpCodes table) |
| `type` | string | Yes | Message type identifier |
| `req_id` | string | No | UUID for request tracking (client→server only) |

---

## Operation Codes (OpCodes)

### Client → ESP32

| OpCode | Name | Description |
|--------|------|-------------|
| 1 | `GET_STATUS` | Request full device status |
| 2 | `HEARTBEAT` | Keep-alive ping |
| 3 | `CONFIG_UPDATE` | Update device configuration |
| 4 | `GAME_COMMAND` | Game control commands (start/stop/pause/etc) |
| 5 | `HIT_FORWARD` | Forward hit from another device |
| 6 | `KILL_CONFIRMED` | Confirm kill event |
| 7 | `REMOTE_SOUND` | Trigger sound effect |

### ESP32 → Client

| OpCode | Name | Description |
|--------|------|-------------|
| 10 | `STATUS` | Full device status response |
| 11 | `HEARTBEAT_ACK` | Heartbeat acknowledgment |
| 12 | `SHOT_FIRED` | Shot event notification |
| 13 | `HIT_REPORT` | Hit received notification |
| 14 | `RESPAWN` | Player respawned |
| 15 | `RELOAD_EVENT` | Reload completed |
| 16 | `GAME_OVER` | Game ended with winner info |
| 17 | `GAME_STATE_UPDATE` | Real-time game progress update |
| 20 | `ACK` | Generic acknowledgment |

---

## Client → ESP32 Messages

### 1. GET_STATUS (OpCode 1)

Request full device status and configuration.

```json
{
  "op": 1,
  "type": "get_status"
}
```

**Response:** `STATUS` message

---

### 2. HEARTBEAT (OpCode 2)

Keep-alive message sent every 10 seconds.

```json
{
  "op": 2,
  "type": "heartbeat"
}
```

**Response:** `HEARTBEAT_ACK` message

---

### 3. CONFIG_UPDATE (OpCode 3)

Update device configuration and game rules.

```json
{
  "op": 3,
  "type": "config_update",
  
  // Device Identity
  "device_id": 1,
  "player_id": 5,
  "team_id": 1,
  "color_rgb": 16711680,
  
  // Win Condition Settings
  "win_type": "time",              // "time" | "score" | "last_man_standing"
  "target_score": 100,             // Used in "score" mode
  "game_duration_s": 600,          // Used in "time" mode (seconds)
  
  // Health & Respawn
  "max_hearts": 5,                 // -1 = infinite
  "spawn_hearts": 3,               // Initial hearts on spawn
  "respawn_time_s": 10,
  "friendly_fire": false,
  "damage_in": 1,                  // Damage multiplier received
  "damage_out": 1,                 // Damage multiplier sent
  
  // Ammo & Weapons
  "enable_ammo": true,
  "max_ammo": 30,                  // -1 = infinite
  "reload_time_ms": 2500,
  
  // Scoring
  "hit_score": 10,                 // Points per hit
  "kill_score": 100,               // Points per kill
  
  // ESP-NOW Peers (for mesh communication)
  "espnow_peers": [
    {"mac": "AA:BB:CC:DD:EE:FF", "team_id": 2}
  ]
}
```

**Response:** `ACK` message

---

### 4. GAME_COMMAND (OpCode 4)

Control game flow with commands.

```json
{
  "op": 4,
  "type": "game_command",
  "command": 1,                    // See GameCommandType enum
  
  // Optional parameters (command-specific)
  "extend_minutes": 5,             // For EXTEND_TIME command
  "new_target": 150                // For UPDATE_TARGET command
}
```

#### GameCommandType Enum

| Value | Name | Description | Parameters |
|-------|------|-------------|------------|
| 0 | `STOP` | Stop current game | None |
| 1 | `START` | Start new game | None |
| 2 | `RESET` | Reset stats and runtime | None |
| 3 | `PAUSE` | Pause active game | None |
| 4 | `UNPAUSE` | Resume paused game | None |
| 5 | `EXTEND_TIME` | Add time to game (time mode) | `extend_minutes` |
| 6 | `UPDATE_TARGET` | Change target score (score mode) | `new_target` |

**Response:** `ACK` message

---

### 5. HIT_FORWARD (OpCode 5)

Forward a hit event from another device.

```json
{
  "op": 5,
  "type": "hit_forward",
  "shooter_id": 3,
  "target_id": 5,
  "damage": 1
}
```

---

### 6. KILL_CONFIRMED (OpCode 6)

Confirm a kill event (increments kill counter).

```json
{
  "op": 6,
  "type": "kill_confirmed"
}
```

---

### 7. REMOTE_SOUND (OpCode 7)

Trigger sound effect on device.

```json
{
  "op": 7,
  "type": "remote_sound",
  "sound_id": 1
}
```

---

## ESP32 → Client Messages

### 10. STATUS (OpCode 10)

Full device status response.

```json
{
  "op": 10,
  "type": "status",
  "uptime_ms": 123456789,
  
  "config": {
    "device_id": 1,
    "player_id": 5,
    "team_id": 1,
    "color_rgb": 16711680,
    "role": "weapon",              // "weapon" | "target"
    "device_name": "Player 1 - Weapon",
    
    // Game Config
    "win_type": "time",
    "target_score": 100,
    "time_limit_s": 600,
    "max_hearts": 5,
    "spawn_hearts": 3,
    "respawn_time_s": 10,
    "friendly_fire": false,
    "damage_in": 1,
    "damage_out": 1,
    "enable_ammo": true,
    "max_ammo": 30,
    "reload_time_ms": 2500,
    "hit_score": 10,
    "kill_score": 100
  },
  
  "stats": {
    "shots_fired": 150,
    "hits_landed": 75,
    "kills": 10,
    "deaths": 5,
    "friendly_fire_count": 2,
    "rx_count": 500,
    "tx_count": 450
  },
  
  "state": {
    "current_hearts": 3,
    "current_ammo": 20,
    "is_respawning": false,
    "is_reloading": false,
    "remaining_time_s": 450,       // Only in time mode
    "game_running": true,
    "game_paused": false,
    "game_over": false,
    "player_score": 850
  }
}
```

---

### 11. HEARTBEAT_ACK (OpCode 11)

Heartbeat acknowledgment with optional battery/signal info.

```json
{
  "op": 11,
  "type": "heartbeat_ack",
  "batt_voltage": 3.7,             // Optional
  "rssi": -65                      // Optional (WiFi signal strength)
}
```

---

### 12. SHOT_FIRED (OpCode 12)

Notification when device fires a shot.

```json
{
  "op": 12,
  "type": "shot_fired",
  "timestamp_ms": 123456789,
  "seq_id": 1
}
```

---

### 13. HIT_REPORT (OpCode 13)

Notification when device is hit.

```json
{
  "op": 13,
  "type": "hit_report",
  "timestamp_ms": 123456789,
  "seq_id": 1,
  "shooter_id": 3,
  "damage": 1,
  "fatal": false                   // true if hit caused death
}
```

---

### 14. RESPAWN (OpCode 14)

Notification when player respawns.

```json
{
  "op": 14,
  "type": "respawn",
  "timestamp_ms": 123456789,
  "current_hearts": 3              // Optional sync
}
```

---

### 15. RELOAD_EVENT (OpCode 15)

Notification when reload completes.

```json
{
  "op": 15,
  "type": "reload_event",
  "current_ammo": 30
}
```

---

### 16. GAME_OVER (OpCode 16)

Game ended with winner information.

```json
{
  "op": 16,
  "type": "game_over",
  
  // Win Information
  "win_type": "time",              // "time" | "score" | "elimination" | "draw"
  "winner_team_id": 1,             // Optional
  "winner_player_id": 5,           // Optional
  
  // Final Statistics
  "final_scores": [
    {
      "player_id": 5,
      "score": 850,
      "kills": 10,
      "deaths": 5
    },
    {
      "player_id": 6,
      "score": 620,
      "kills": 7,
      "deaths": 8
    }
  ],
  "match_duration_s": 600
}
```

---

### 17. GAME_STATE_UPDATE (OpCode 17)

Real-time game progress update (sent every 5 seconds during active game).

```json
{
  "op": 17,
  "type": "game_state_update",
  
  // Game Progress
  "game_running": true,
  "game_paused": false,
  "game_over": false,
  "time_remaining_s": 450,         // For time mode
  
  // Player Scores
  "current_scores": [
    {
      "player_id": 5,
      "score": 850,
      "hearts": 3
    }
  ],
  
  // Real-time Stats
  "total_kills": 15,
  "total_shots": 200,
  "total_hits": 100
}
```

---

### 20. ACK (OpCode 20)

Generic acknowledgment for commands.

```json
{
  "op": 20,
  "type": "ack",
  "reply_to": "<req_id>",          // Matches request req_id
  "success": true
}
```

---

## Game Configuration

### Win Types

#### 1. Time Mode (`"time"`)

Game runs for a fixed duration. Player/team with highest score wins.

**Required Config:**
- `win_type`: `"time"`
- `game_duration_s`: Duration in seconds (e.g., 600 for 10 minutes)

**Win Condition:**
- Game ends when `current_time >= game_start_time + game_duration_s`
- Winner: Highest score

#### 2. Score Mode (`"score"`)

First player/team to reach target score wins.

**Required Config:**
- `win_type`: `"score"`
- `target_score`: Points needed to win (e.g., 1000)

**Win Condition:**
- Game ends when any player's score >= `target_score`
- Winner: First to reach target

#### 3. Last Man Standing (`"last_man_standing"`)

Elimination mode. Last player/team with hearts remaining wins.

**Required Config:**
- `win_type`: `"last_man_standing"`
- `spawn_hearts`: Initial lives (e.g., 3)
- `max_hearts`: Maximum possible lives

**Win Condition:**
- Players eliminated when hearts reach 0
- Game ends when only one player/team has hearts > 0
- Winner: Last standing

**Special Rules:**
- Players with 0 hearts cannot shoot (`can_shoot = false`)
- Players with 0 hearts cannot take damage (`can_take_damage = false`)
- No respawning in LMS mode (hearts = lives)

---

## Game Commands

### START Command Flow

```
Client                          ESP32
  |                               |
  |-- CONFIG_UPDATE ------------->|  (Set game config)
  |<---------- ACK ---------------|
  |                               |
  |-- GAME_COMMAND (START) ------>|  (Start game)
  |                               |  - Reset runtime
  |                               |  - Set game_running = true
  |                               |  - Calculate game_end_time (time mode)
  |                               |  - Reset hearts to spawn_hearts (LMS)
  |<---------- ACK ---------------|
  |                               |
  |<-- GAME_STATE_UPDATE ---------|  (Periodic updates)
```

### PAUSE/RESUME Flow

```
Client                          ESP32
  |                               |
  |-- GAME_COMMAND (PAUSE) ------>|
  |                               |  - Set game_paused = true
  |                               |  - Record pause_time_ms
  |<---------- ACK ---------------|
  |                               |
  |                               |  (Game tick paused)
  |                               |
  |-- GAME_COMMAND (UNPAUSE) ---->|
  |                               |  - Calculate pause_duration
  |                               |  - Adjust game_end_time (time mode)
  |                               |  - Set game_paused = false
  |<---------- ACK ---------------|
```

### EXTEND_TIME Flow (Time Mode Only)

```
Client                          ESP32
  |                               |
  |-- GAME_COMMAND (EXTEND_TIME)->|
  |    extend_minutes: 5          |  - Add 5 minutes to game_end_time
  |                               |  - Update time_limit_s
  |<---------- ACK ---------------|
  |                               |
  |<-- GAME_STATE_UPDATE ---------|  (Updated time_remaining_s)
```

### UPDATE_TARGET Flow (Score Mode Only)

```
Client                          ESP32
  |                               |
  |-- GAME_COMMAND (UPDATE_TARGET)|
  |    new_target: 150            |  - Set target_score = 150
  |<---------- ACK ---------------|
  |                               |
  |<-- GAME_STATE_UPDATE ---------|  (Updated target)
```

---

## Win Conditions

### Time Mode Win Detection

**ESP32 Side:**
```c
void game_state_tick(void) {
    if (game_paused) return;
    
    uint32_t now = esp_timer_get_time() / 1000;
    if (now >= game_end_time_ms) {
        game_over = true;
        game_running = false;
        // Send GAME_OVER message
    }
}
```

**Server Side:**
- Aggregates scores from all devices
- Determines winner (highest score)
- Broadcasts final results to all clients

### Score Mode Win Detection

**ESP32 Side:**
```c
void game_state_tick(void) {
    player_score = (kills * kill_score) + (hits * hit_score);
    
    if (player_score >= target_score) {
        game_over = true;
        game_running = false;
        // Send GAME_OVER message with winner info
    }
}
```

### Last Man Standing Win Detection

**ESP32 Side:**
- Tracks hearts locally
- Sets `can_shoot = false` when hearts == 0
- Marks player as eliminated

**Server Side:**
- Aggregates hearts from all devices
- Counts active players (hearts > 0)
- Declares winner when only one player/team active

---

## Sequence Diagrams

### Full Game Session

```
Client          Server          ESP32-A         ESP32-B
  |               |               |               |
  |-- Connect Devices ----------->|               |
  |               |               |               |
  |-- Broadcast CONFIG_UPDATE --->|-------------->|
  |<------------- ACK ------------|<--------------|
  |               |               |               |
  |-- Broadcast GAME_COMMAND(START)               |
  |               |               |-------------->|
  |<------------- ACK ------------|<--------------|
  |               |               |               |
  |               |               |-- Shot Fired->|
  |<-- SHOT_FIRED ----------------|               |
  |               |               |               |
  |               |               |<-- Hit -------|
  |<-- HIT_REPORT ----------------|               |
  |               |               |               |
  |               |-- Record Hit --|               |
  |               |   Update Stats|               |
  |               |               |               |
  |<-- GAME_STATE_UPDATE ---------|               |
  |<-- GAME_STATE_UPDATE -------------------------|
  |               |               |               |
  |               |  (Time expires or target reached)
  |               |               |               |
  |<-- GAME_OVER -----------------|-------------->|
  |               |               |               |
  |-- Display Results             |               |
```

### Pause/Resume with Time Adjustment

```
Client          ESP32
  |               |
  |   Game Running (Time Mode: 10 minutes)
  |               |
  |-- PAUSE ----->|
  |               |  pause_time = now
  |<----- ACK ----|
  |               |
  |   (5 minutes real time passes)
  |               |
  |-- RESUME ---->|
  |               |  pause_duration = now - pause_time (5 min)
  |               |  game_end_time += pause_duration
  |               |  Effective time remaining: 10 min
  |<----- ACK ----|
```

---

## Error Handling

### Error Response Format

```json
{
  "op": 20,
  "type": "ack",
  "reply_to": "<req_id>",
  "success": false,
  "error": {
    "code": "INVALID_CONFIG",
    "message": "max_hearts must be >= spawn_hearts"
  }
}
```

### Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| `INVALID_CONFIG` | Configuration validation failed | Fix config and resend |
| `GAME_RUNNING` | Cannot update config during game | Stop game first |
| `INVALID_COMMAND` | Unknown game command | Check command enum |
| `INVALID_WIN_TYPE` | Unknown win type | Use "time", "score", or "last_man_standing" |
| `PARSE_ERROR` | JSON parsing failed | Check JSON syntax |
| `PEER_LIMIT_EXCEEDED` | Too many ESP-NOW peers | Reduce peer count |

### Connection Errors

**Timeout:**
- Client should implement 30-second timeout for responses
- Retry with exponential backoff (1s, 2s, 4s, 8s max)

**Disconnection:**
- ESP32 clears WebSocket state
- Client should auto-reconnect
- Resend GET_STATUS on reconnect to sync state

---

## Version History

### v2.3 (2026-01-26) - Current
**Added:**
- `GAME_STATE_UPDATE` message (OpCode 17)
- `EXTEND_TIME` and `UPDATE_TARGET` game commands
- `PAUSE` and `UNPAUSE` game commands
- `game_paused` flag in game state
- Parameter support in `GAME_COMMAND` messages
- Dynamic game updates during active session

**Enhanced:**
- `GAME_OVER` message with detailed winner info and final scores
- Time adjustment on pause/resume
- Real-time game progress updates

### v2.2 (2026-01-25)
**Added:**
- Win condition system (`win_type`, `target_score`, `game_duration_s`)
- `spawn_hearts` configuration
- `damage_in` and `damage_out` multipliers
- `player_score` in game state
- `game_running`, `game_over` flags

**Changed:**
- Removed `enable_hearts` (always used in LMS mode)
- Reorganized config fields into categories

### v2.1 (2026-01-20)
**Added:**
- ESP-NOW peer management
- Friendly fire configuration
- Hit and kill score values

### v2.0 (2026-01-15)
**Initial release** with core protocol features

---

## Best Practices

### For Client Developers

1. **Always send HEARTBEAT every 10 seconds** to maintain connection
2. **Handle reconnection gracefully** with exponential backoff
3. **Validate configs client-side** before sending CONFIG_UPDATE
4. **Use req_id** for tracking critical commands
5. **Subscribe to GAME_STATE_UPDATE** for real-time UI updates
6. **Cache last known state** for reconnection recovery

### For ESP32 Firmware Developers

1. **Call game_state_tick() every 100ms** in main loop
2. **Broadcast GAME_STATE_UPDATE every 5 seconds** during active game
3. **Send GAME_OVER immediately** when win condition met
4. **Log all state changes** for debugging
5. **Validate all JSON inputs** before parsing
6. **Respond with ACK** for all commands (success or error)

### For Server Developers

1. **Aggregate stats from all devices** for authoritative game state
2. **Persist match results to database** immediately on game over
3. **Broadcast commands to all devices** simultaneously
4. **Handle device disconnection** gracefully (partial game completion)
5. **Validate game mode consistency** across all devices

---

## Testing

### Unit Tests

Test each message type with valid and invalid data:

```javascript
// Example: Test CONFIG_UPDATE parsing
test('CONFIG_UPDATE with valid data', () => {
  const message = {
    op: 3,
    type: 'config_update',
    win_type: 'time',
    game_duration_s: 600
  }
  expect(parseMessage(message)).toBeTruthy()
})

test('CONFIG_UPDATE with invalid win_type', () => {
  const message = {
    op: 3,
    type: 'config_update',
    win_type: 'invalid'
  }
  expect(parseMessage(message)).toThrow()
})
```

### Integration Tests

Test full game flows:

1. **Time Mode Game:** Connect → Config → Start → Wait → Game Over
2. **Score Mode Game:** Connect → Config → Start → Shoot until target → Game Over
3. **LMS Mode Game:** Connect → Config → Start → Eliminate all → Game Over
4. **Pause/Resume:** Start → Pause → Wait → Resume → Continue
5. **Extend Time:** Start (time mode) → Extend → Verify new end time

---

## Support

For questions or issues:
- GitHub Issues: https://github.com/yourusername/rayz/issues
- Documentation: https://docs.rayz.example.com
- Email: support@rayz.example.com

---

## License

This protocol documentation is part of the RayZ project.
