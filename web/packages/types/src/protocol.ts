// WebSocket Protocol Types — Matches ESP32 Firmware Protocol v2.2
// Gamemode is UI-only; firmware receives explicit config values, not a gamemode label.

// ============= Enums & Constants =============

export enum OpCode {
  // Client -> ESP32
  GET_STATUS = 1,
  HEARTBEAT = 2,
  CONFIG_UPDATE = 3,
  GAME_COMMAND = 4,
  HIT_FORWARD = 5,
  KILL_CONFIRMED = 6,
  REMOTE_SOUND = 7,

  // ESP32 -> Client
  STATUS = 10,
  HEARTBEAT_ACK = 11,
  SHOT_FIRED = 12,
  HIT_REPORT = 13,
  RESPAWN = 14,
  RELOAD_EVENT = 15,
  GAME_OVER = 16,
  ACK = 20,
}

export enum GameCommandType {
  STOP = 0,
  START = 1,
  RESET = 2,
  PAUSE = 3,
  UNPAUSE = 4,
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export type DeviceRole = 'player' | 'admin' | 'spectator'
export type GameState = 'idle' | 'running' | 'paused' | 'finished'
export type GameMode = 'free' | 'deathmatch' | 'team' | 'capture_flag' | 'timed'

// ============= Messages: Browser → ESP32 =============

export interface BaseClientMessage {
  op: OpCode
  type: string
  req_id?: string // Optional UUID for tracking acknowledgments
}

export interface GetStatusMessage extends BaseClientMessage {
  op: OpCode.GET_STATUS
  type: 'get_status'
}

export interface HeartbeatMessage extends BaseClientMessage {
  op: OpCode.HEARTBEAT
  type: 'heartbeat'
}

export interface ConfigUpdateMessage extends BaseClientMessage {
  op: OpCode.CONFIG_UPDATE
  type: 'config_update'

  reset_to_defaults?: boolean

  // Identity
  device_name?: string
  device_id?: number
  player_id?: number
  team_id?: number // 0=Solo, 255=Admin, 1..N=Teams

  // Hardware / AV
  color_rgb?: number
  ir_power?: number // 0=Indoor, 1=Outdoor
  volume?: number // 0-100
  sound_profile?: number
  haptic_enabled?: boolean

  // Rules & Mechanics (Health)
  enable_hearts?: boolean // If false, player is immortal/health hidden
  spawn_hearts?: number
  max_hearts?: number
  respawn_time_s?: number
  damage_in?: number
  damage_out?: number
  friendly_fire?: boolean

  // Rules & Mechanics (Ammo)
  enable_ammo?: boolean // If false, infinite shots, no reload needed
  max_ammo?: number
  reload_time_ms?: number

  // Game Timer
  game_duration_s?: number // 0 = Manual Stop only

  // ESP-NOW Peer Management
  espnow_peers?: string // Comma-separated MAC addresses "aa:bb:cc:dd:ee:ff,11:22:33:44:55:66"
}

export interface GameCommandMessage extends BaseClientMessage {
  op: OpCode.GAME_COMMAND
  type: 'game_command'
  command: GameCommandType
}

export interface HitForwardMessage extends BaseClientMessage {
  op: OpCode.HIT_FORWARD
  type: 'hit_forward'
  shooter_id: number
}

export interface KillConfirmedMessage extends BaseClientMessage {
  op: OpCode.KILL_CONFIRMED
  type: 'kill_confirmed'
}

export interface RemoteSoundMessage extends BaseClientMessage {
  op: OpCode.REMOTE_SOUND
  type: 'remote_sound'
  sound_id: number // 0=Whistle, 1=Horn, etc.
}

export interface DeviceFullConfig {
  // Identity
  deviceName?: string
  deviceId?: number
  playerId?: number
  teamId?: number
  colorRgb?: number // 0xRRGGBB

  // Hardware/AV
  irPower?: number
  volume?: number
  soundProfile?: number
  hapticEnabled?: boolean

  // Game Rules - Health
  enableHearts?: boolean
  spawnHearts?: number
  maxHearts?: number
  respawnTimeS?: number
  damageIn?: number
  damageOut?: number
  friendlyFire?: boolean

  // Game Rules - Ammo
  enableAmmo?: boolean
  maxAmmo?: number
  reloadTimeMs?: number

  // Game Timer
  gameDurationS?: number

  // ESP-NOW Peers
  espnowPeers?: string[]
}

export type ClientMessage =
  | GetStatusMessage
  | HeartbeatMessage
  | ConfigUpdateMessage
  | GameCommandMessage
  | HitForwardMessage
  | KillConfirmedMessage
  | RemoteSoundMessage

// ============= Messages: ESP32 → Browser =============

// Sub-interfaces for the nested Status object
export interface DeviceConfigStatus {
  device_id: number
  player_id: number
  team_id: number
  color_rgb: number

  // Health
  enable_hearts: boolean
  max_hearts: number
  spawn_hearts: number

  // Ammo
  enable_ammo: boolean
  max_ammo: number

  // General
  game_duration_s: number
  friendly_fire: boolean
}

export interface DeviceLiveStats {
  shots: number
  enemy_kills: number
  friendly_kills: number
  deaths: number
  hits_received?: number
}

export interface DeviceLiveState {
  current_hearts: number
  current_ammo: number
  is_respawning: boolean
  is_reloading: boolean
  remaining_time_s?: number // Only if game timer is active
}

export interface DeviceStatusMessage {
  op: OpCode.STATUS
  type: 'status'
  uptime_ms: number

  // v2.2 Protocol nests these
  config: DeviceConfigStatus
  stats: DeviceLiveStats
  state: DeviceLiveState
}

export interface HeartbeatAckMessage {
  op: OpCode.HEARTBEAT_ACK
  type: 'heartbeat_ack'
  batt_voltage?: number
  rssi?: number // Signal strength
}

export interface ShotFiredMessage {
  op: OpCode.SHOT_FIRED
  type: 'shot_fired'
  timestamp_ms: number
  seq_id: number
}

export interface HitReportMessage {
  op: OpCode.HIT_REPORT
  type: 'hit_report'
  timestamp_ms: number
  seq_id: number
  shooter_id: number
  damage: number
  fatal: boolean // Did this hit cause death?
}

export interface RespawnMessage {
  op: OpCode.RESPAWN
  type: 'respawn'
  timestamp_ms: number
  current_hearts?: number // Optional sync
}

export interface ReloadMessage {
  op: OpCode.RELOAD_EVENT
  type: 'reload_event'
  current_ammo: number
}

export interface GameOverMessage {
  op: OpCode.GAME_OVER
  type: 'game_over'
}

export interface AckMessage {
  op: OpCode.ACK
  type: 'ack'
  reply_to?: string // matches req_id
  success: boolean
}

export type ServerMessage =
  | DeviceStatusMessage
  | HeartbeatAckMessage
  | ShotFiredMessage
  | HitReportMessage
  | RespawnMessage
  | ReloadMessage
  | GameOverMessage
  | AckMessage

// ============= Device State (for UI Store) =============

export interface DeviceState {
  // Connection Metadata
  ipAddress: string
  connectionState: ConnectionState
  lastConnected?: Date
  lastError?: string
  lastHeartbeat?: Date
  lastStatusUpdate?: Date
  rssi?: number
  batteryVoltage?: number

  // Identity & Config
  deviceId: number
  playerId: number
  teamId: number
  colorRgb: number

  // Mechanics Config
  enableHearts: boolean
  maxHearts: number
  enableAmmo: boolean
  maxAmmo: number

  // Live Stats
  kills: number
  deaths: number
  shots: number
  friendlyKills: number
  hitsReceived: number

  // Live State
  hearts: number
  ammo: number
  isRespawning: boolean
  isReloading: boolean
  gameRemainingTime?: number
}

// Initial state factory
export const initialDeviceState = (ipAddress: string): DeviceState => ({
  ipAddress,
  connectionState: 'disconnected',

  // Defaults
  deviceId: 0,
  playerId: 0,
  teamId: 0,
  colorRgb: 0xffffff,

  // Mechanics Defaults
  enableHearts: false,
  maxHearts: 0,
  enableAmmo: false,
  maxAmmo: 0,

  kills: 0,
  deaths: 0,
  shots: 0,
  friendlyKills: 0,
  hitsReceived: 0,

  hearts: 0,
  ammo: 0,
  isRespawning: false,
  isReloading: false,
})
