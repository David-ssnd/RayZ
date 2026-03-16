# RayZ Project: Comprehensive Audit of player_id and device_id

**Audit Date:** 2026-03-09 11:01:42

## EXECUTIVE SUMMARY - CRITICAL FINDINGS

**player_id specification**: 5 bits, max 31 (0-31)  
**device_id specification**: 6 bits, max 63 (0-63)

### VULNERABILITIES FOUND: 11 CRITICAL

1. ❌ ESP32 generates IDs with rand_u8() → 0-255, not masked to limits
2. ❌ ESP32 loads IDs from NVS without validation
3. ❌ ESP32 accepts WebSocket config updates without validation
4. ❌ Prisma schema has NO constraints on device_id
5. ❌ Prisma schema has NO constraints on player.number
6. ❌ Prisma schema has NO constraints on team.number
7. ❌ TypeScript types don't specify valid ranges
8. ❌ DeviceConfigManager passes values through without validation
9. ❌ DeviceConfigPanel doesn't validate parsed values
10. ❌ Protocol definition uses uint32_t instead of 6-bit/5-bit
11. ❌ No frontend form validation for ID fields

---

## PART 1: ESP32 FIRMWARE AUDIT

### 1.1 CRITICAL: ID Generation Bug

**File**: esp32/shared/src/game_state.cpp  
**Lines**: 36-39, 135-143

**Current Code**:
\\\cpp
static uint8_t rand_u8()
{
    return (uint8_t)(esp_random() & 0xFF);  // Returns 0-255
}

void game_state_generate_ids(void)
{
    LOCK();
    if (s_config.device_id == 0)
        s_config.device_id = rand_u8();  // ⚠️ Can be 0-255, but max should be 63
    if (s_config.player_id == 0)
        s_config.player_id = s_config.device_id;  // ⚠️ Inherits invalid value
    UNLOCK();
}
\\\

**Issue**: 
- device_id: ~75% of generated values will EXCEED limit (64-255 out of range)
- player_id: ~87.5% of generated values will EXCEED limit (32-255 out of range)

**Fix**:
\\\cpp
void game_state_generate_ids(void)
{
    LOCK();
    if (s_config.device_id == 0)
        s_config.device_id = rand_u8() & 0x3F;  // Mask to 6 bits
    if (s_config.player_id == 0)
        s_config.player_id = (rand_u8() & 0x1F);  // Mask to 5 bits
    UNLOCK();
}
\\\

---

### 1.2 CRITICAL: NVS Load Without Validation

**File**: esp32/shared/src/game_state.cpp  
**Lines**: 80-114

**Current Code**:
\\\cpp
bool game_state_load_ids(void)
{
    LOCK();
    bool loaded = false;
    uint8_t id = 0;
    if (nvs_store_read_u8(NVS_GAME_NS, NVS_KEY_DEVICE_ID, &id))
    {
        s_config.device_id = id;  // ⚠️ Direct assignment, no validation!
        loaded = true;
    }
    if (nvs_store_read_u8(NVS_GAME_NS, NVS_KEY_PLAYER_ID, &id))
    {
        s_config.player_id = id;  // ⚠️ Direct assignment, no validation!
    }
    ...
    UNLOCK();
    return loaded;
}
\\\

**Issue**: Previously corrupted NVS values (>63 for device, >31 for player) will be loaded without correction

**Fix**:
\\\cpp
if (nvs_store_read_u8(NVS_GAME_NS, NVS_KEY_DEVICE_ID, &id)) {
    s_config.device_id = id & 0x3F;  // Validate
    loaded = true;
}
if (nvs_store_read_u8(NVS_GAME_NS, NVS_KEY_PLAYER_ID, &id)) {
    s_config.player_id = id & 0x1F;  // Validate
}
\\\

---

### 1.3 CRITICAL: WebSocket Config Update - No Validation

**File**: esp32/shared/src/ws_server.cpp  
**Lines**: 131-162

**Current Code**:
\\\cpp
static void handle_config_update(cJSON* root)
{
    DeviceConfig* dev = game_state_get_config_mut();
    cJSON* item;
    
    // Identity
    item = cJSON_GetObjectItem(root, "device_id");
    if (item && !cJSON_IsNull(item))
        dev->device_id = item->valueint;  // ⚠️ ACCEPTS ANY INT!
    
    item = cJSON_GetObjectItem(root, "player_id");
    if (item && !cJSON_IsNull(item))
        dev->player_id = item->valueint;  // ⚠️ ACCEPTS ANY INT!
    
    item = cJSON_GetObjectItem(root, "team_id");
    if (item && !cJSON_IsNull(item))
        dev->team_id = item->valueint;
    ...
}
\\\

**Issue**: Malicious or buggy WebSocket clients can send:
- device_id: 500, player_id: 200, etc.
- These INVALID values are accepted and stored

**Attack Example**:
\\\json
{
  "op": 3,
  "type": "config_update",
  "device_id": 255,
  "player_id": 255
}
\\\

**Fix**:
\\\cpp
item = cJSON_GetObjectItem(root, "device_id");
if (item && !cJSON_IsNull(item)) {
    int val = item->valueint;
    dev->device_id = (val >= 0 && val <= 63) ? val : dev->device_id;
}

item = cJSON_GetObjectItem(root, "player_id");
if (item && !cJSON_IsNull(item)) {
    int val = item->valueint;
    dev->player_id = (val >= 0 && val <= 31) ? val : dev->player_id;
}
\\\

---

### 1.4 Status: IR Encoding - PROTECTED

**File**: esp32/shared/include/hash.h  
**Lines**: 20-31

**Current Code**:
\\\cpp
inline uint16_t createLaserMessage(uint8_t player_id, uint8_t device_id)
{
    // Limit to bit ranges
    player_id = player_id & 0x1F;  // ✅ 5 bits max
    device_id = device_id & 0x3F;  // ✅ 6 bits max
    
    uint8_t hash = calculateHash5bit(player_id, device_id);
    uint16_t msg = ((uint16_t)player_id << 11) | ((uint16_t)device_id << 5) | hash;
    return msg;
}
\\\

**Status**: ✅ **PROTECTED** - Uses bitwise masking, so IR messages are safe even with invalid IDs

**BUT**: Invalid IDs can still corrupt WebSocket state and game logic

---

### 1.5 Configuration Structure

**File**: esp32/shared/include/game_protocol.h  
**Lines**: 53-61

\\\cpp
typedef struct
{
    uint8_t device_id;  // ⚠️ uint8_t allows 0-255
    uint8_t player_id;  // ⚠️ uint8_t allows 0-255
    uint8_t team_id;
    uint32_t color_rgb;
    DeviceRole role;
    char device_name[32];
} DeviceConfig;
\\\

**Issue**: uint8_t allows any value 0-255. No enforcement.

---

## PART 2: WEB APPLICATION AUDIT

### 2.1 CRITICAL: Prisma Schema - No Constraints

**File**: web/packages/database/prisma/schema.prisma  
**Lines**: 79-101

\\\prisma
model Device {
  ...
  deviceId        Int         @unique
  // ⚠️ NO CONSTRAINT! Allows any Int from -2B to +2B
  ...
}

model Player {
  ...
  // PROTOCOL ID: The integer (0-255) sent to ESP32
  // ⚠️ Comment says 0-255, but stored as unconstrained Int!
  number          Int
  ...
}

model Team {
  ...
  // PROTOCOL ID: The integer (1-255) sent to ESP32
  // ⚠️ Comment says 1-255, but stored as unconstrained Int!
  number          Int
  ...
}
\\\

**Impact**:
- Database accepts device_id: 999999
- Database accepts player.number: 1000000
- Database accepts team.number: -5

**Fix** (Prisma 5.12+):
\\\prisma
model Device {
  deviceId        Int         @unique
  
  @@check("deviceId >= 0 AND deviceId <= 63")
}

model Player {
  number          Int
  @@check("number >= 0 AND number <= 31")
}

model Team {
  number          Int
  @@check("number >= 1 AND number <= 31")
}
\\\

Or use runtime validation before save.

---

### 2.2 CRITICAL: DeviceConfigManager - No Validation

**File**: web/apps/frontend/src/lib/comm/DeviceConfigManager.ts  
**Lines**: 125-142, 384-395

\\\	ypescript
setDeviceInfo(
  deviceIp: string,
  info: {
    deviceId?: number  // ⚠️ No validation!
    playerId?: number  // ⚠️ No validation!
    ...
  }
): void {
  const config = this.getOrCreateConfig(deviceIp)
  if (info.deviceId !== undefined) config.deviceId = info.deviceId
  if (info.playerId !== undefined) config.playerId = info.playerId
}

private buildConfigMessage(config: DeviceFullConfig): ClientMessage {
  const message = {
    op: 3,
    type: 'config_update',
  } as any
  
  // ⚠️ Direct pass-through - no validation!
  if (config.deviceId !== undefined) message.device_id = config.deviceId
  if (config.playerId !== undefined) message.player_id = config.playerId
  ...
  return message as ClientMessage
}
\\\

**Issue**: Values flow directly from database → config manager → WebSocket message  
No validation at any step

**Fix**:
\\\	ypescript
function validateDeviceId(id: number | undefined): boolean {
  return id === undefined || (id >= 0 && id <= 63)
}

function validatePlayerId(id: number | undefined): boolean {
  return id === undefined || (id >= 0 && id <= 31)
}

setDeviceInfo(deviceIp: string, info: {...}): void {
  if (!validateDeviceId(info.deviceId) || !validatePlayerId(info.playerId)) {
    throw new Error(\Invalid IDs: device=\, player=\\)
  }
  ...
}
\\\

---

### 2.3 CRITICAL: DeviceConfigPanel - Direct DB to Config

**File**: web/apps/frontend/src/components/DeviceConfigPanel.tsx  
**Lines**: 68-72

\\\	ypescript
const config = {
  deviceName: device.name || \Device \\,
  deviceId: parseInt(device.id) || 0,  // ⚠️ From DB, no validation!
  playerId: player?.id ? parseInt(player.id) : undefined,  // ⚠️ No validation!
  teamId: team?.id ? parseInt(team.id) : 0,
  ...
}
\\\

**Issue**: Parses database values directly without checking limits

---

### 2.4 TypeScript Protocol Types - No Range Specs

**File**: web/packages/types/src/protocol.ts  
**Lines**: 62-101

\\\	ypescript
export interface ConfigUpdateMessage extends BaseClientMessage {
  op: OpCode.CONFIG_UPDATE
  type: 'config_update'
  device_id?: number      // ⚠️ No @min, @max metadata
  player_id?: number      // ⚠️ No @min, @max metadata
  team_id?: number
  ...
}
\\\

**Issue**: Type system doesn't enforce ranges

**Fix**:
\\\	ypescript
export interface ConfigUpdateMessage extends BaseClientMessage {
  op: OpCode.CONFIG_UPDATE
  type: 'config_update'
  device_id?: number & { readonly __brand: 'DeviceId' }  // Branded type
  player_id?: number & { readonly __brand: 'PlayerId' }
  ...
}

// Type guards
export function isValidDeviceId(id: unknown): id is number {
  return typeof id === 'number' && id >= 0 && id <= 63
}

export function isValidPlayerId(id: unknown): id is number {
  return typeof id === 'number' && id >= 0 && id <= 31
}
\\\

---

## PART 3: PROTOCOL DEFINITION AUDIT

### 3.1 CRITICAL: protocol_def.json Uses Wrong Type

**File**: protocol_def.json  
**Lines**: 54-56, 107-108

\\\json
{
  "name": "ConfigUpdate",
  "fields": [
    { "name": "device_id", "type": "uint32_t", "required": false },
    { "name": "player_id", "type": "uint32_t", "required": false },
  ]
}

{
  "name": "Status",
  "fields": [
    { "name": "config.device_id", "type": "uint32_t", "required": true },
    { "name": "config.player_id", "type": "uint32_t", "required": true },
  ]
}
\\\

**Issue**: 
- ❌ Uses uint32_t (32-bit, 0-4,294,967,295) instead of 6-bit/5-bit
- ❌ No min/max constraints specified

**Fix**:
\\\json
{
  "name": "ConfigUpdate",
  "fields": [
    { "name": "device_id", "type": "uint8_t", "min": 0, "max": 63, "required": false },
    { "name": "player_id", "type": "uint8_t", "min": 0, "max": 31, "required": false },
  ]
}
\\\

---

## PART 4: WHERE IDs ARE USED

### Locations with Device/Player IDs:

| File | Lines | Usage | Validation |
|------|-------|-------|-----------|
| game_state.cpp | 24-26, 87,92,120,121 | NVS storage | ❌ None |
| game_state.cpp | 138-141 | Generate | ❌ None (rand_u8) |
| ws_server.cpp | 153,156 | Config update | ❌ None |
| hash.h | 20-31 | IR encode | ✅ Masked |
| protocol.ts | 70,71,179,180 | Type def | ❌ None |
| DeviceConfigManager.ts | 138-140,392,393 | Set config | ❌ None |
| DeviceConfigPanel.tsx | 69-70 | Parse config | ❌ None |
| espnow_comm.h | 25,26 | Message struct | ❌ None (uint8_t) |

---

## RISK LEVELS

**🔴 CRITICAL**: Can cause protocol violations, game corruption, cross-player interference
- ID generation with rand_u8()
- WebSocket config update without validation
- Database with no constraints

**🟡 HIGH**: Can allow invalid values to propagate
- TypeScript types without ranges
- Prisma schema without constraints

**🟢 LOW/MITIGATED**: IR encoding is masked anyway

---

## SUMMARY TABLE

| Category | Total Issues | Critical | High |
|----------|-------------|----------|------|
| ESP32 Firmware | 4 | 3 | 1 |
| Web Backend | 3 | 3 | 0 |
| Web Frontend | 2 | 2 | 0 |
| Protocol Def | 2 | 2 | 0 |
| **TOTAL** | **11** | **10** | **1** |

