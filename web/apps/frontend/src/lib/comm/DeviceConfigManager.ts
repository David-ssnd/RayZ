/**
 * Device Configuration Manager for Web Interface
 *
 * Handles full device configuration including:
 * - Device identity (name, IDs, color)
 * - Game settings (health, ammo, damage)
 * - ESP-NOW peer management
 * - Audio/Visual settings
 *
 * @example
 * ```typescript
 * const config = new DeviceConfigManager(comm)
 * config.setDeviceInfo('192.168.1.100', {
 *   name: 'Player 1 - Target',
 *   deviceId: 1,
 *   playerId: 1,
 *   teamId: 1,
 *   color: 0xFF0000  // Red
 * })
 * config.setEspNowPeers('192.168.1.100', ['aa:bb:cc:dd:ee:ff', ...])
 * await config.sendFullConfig('192.168.1.100')
 * ```
 */

import type { ClientMessage, OpCode } from '@rayz/types'
import type { GameComm } from './types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Complete device configuration
 */
export interface DeviceFullConfig {
  // Identity
  deviceName?: string
  deviceId?: number
  playerId?: number
  teamId?: number
  colorRgb?: number // 0xRRGGBB

  // Hardware/AV
  irPower?: number // 0=Indoor, 1=Outdoor
  volume?: number // 0-100
  soundProfile?: number
  hapticEnabled?: boolean

  // Game Rules - Health
  enableHearts?: boolean
  spawnHearts?: number
  maxHearts?: number
  respawnTimeS?: number
  damageIn?: number // Damage received multiplier
  damageOut?: number // Damage dealt multiplier
  friendlyFire?: boolean

  // Game Rules - Ammo
  enableAmmo?: boolean
  maxAmmo?: number
  reloadTimeMs?: number

  // Game Timer
  gameDurationS?: number // 0 = Manual stop only

  // ESP-NOW Peers (MAC addresses of other devices)
  espnowPeers?: string[] // ['aa:bb:cc:dd:ee:ff', ...]
}

/**
 * Device info summary
 */
export interface DeviceInfo {
  ip: string
  name?: string
  deviceId?: number
  playerId?: number
  teamId?: number
  color?: number
  lastSeen?: Date
  connected: boolean
}

/**
 * Game session with multiple players
 */
export interface GameSession {
  sessionId: string
  devices: Map<string, DeviceInfo>
  gameSettings: GameSessionSettings
}

/**
 * Game-wide settings
 */
export interface GameSessionSettings {
  maxHearts: number
  maxAmmo: number
  respawnTimeS: number
  gameDurationS: number
  friendlyFire: boolean
  teamPlay: boolean
}

// ============================================================================
// DEVICE CONFIGURATION MANAGER
// ============================================================================

export class DeviceConfigManager {
  private devices = new Map<string, DeviceFullConfig>()
  private comm: GameComm

  constructor(comm: GameComm) {
    this.comm = comm
  }

  // ============================================================================
  // DEVICE INFO
  // ============================================================================

  /**
   * Set device identity information
   */
  setDeviceInfo(
    deviceIp: string,
    info: {
      name?: string
      deviceId?: number
      playerId?: number
      teamId?: number
      color?: number
    }
  ): void {
    const config = this.getOrCreateConfig(deviceIp)

    if (info.name !== undefined) config.deviceName = info.name
    if (info.deviceId !== undefined) config.deviceId = info.deviceId
    if (info.playerId !== undefined) config.playerId = info.playerId
    if (info.teamId !== undefined) config.teamId = info.teamId
    if (info.color !== undefined) config.colorRgb = info.color
  }

  /**
   * Set ESP-NOW peers for a device
   * @param deviceIp - Target device IP
   * @param macAddresses - Array of MAC addresses (e.g., ['aa:bb:cc:dd:ee:ff'])
   */
  setEspNowPeers(deviceIp: string, macAddresses: string[]): void {
    const config = this.getOrCreateConfig(deviceIp)
    config.espnowPeers = macAddresses
  }

  /**
   * Add an ESP-NOW peer to a device
   */
  addEspNowPeer(deviceIp: string, macAddress: string): void {
    const config = this.getOrCreateConfig(deviceIp)
    if (!config.espnowPeers) {
      config.espnowPeers = []
    }
    if (!config.espnowPeers.includes(macAddress)) {
      config.espnowPeers.push(macAddress)
    }
  }

  /**
   * Remove an ESP-NOW peer from a device
   */
  removeEspNowPeer(deviceIp: string, macAddress: string): void {
    const config = this.devices.get(deviceIp)
    if (config?.espnowPeers) {
      config.espnowPeers = config.espnowPeers.filter((mac) => mac !== macAddress)
    }
  }

  // ============================================================================
  // GAME SETTINGS
  // ============================================================================

  /**
   * Set game rules for a device
   */
  setGameRules(
    deviceIp: string,
    rules: {
      enableHearts?: boolean
      maxHearts?: number
      spawnHearts?: number
      respawnTimeS?: number
      damageIn?: number
      damageOut?: number
      friendlyFire?: boolean
      enableAmmo?: boolean
      maxAmmo?: number
      reloadTimeMs?: number
      gameDurationS?: number
    }
  ): void {
    const config = this.getOrCreateConfig(deviceIp)
    Object.assign(config, rules)
  }

  /**
   * Set hardware/AV settings
   */
  setHardwareSettings(
    deviceIp: string,
    settings: {
      irPower?: number
      volume?: number
      soundProfile?: number
      hapticEnabled?: boolean
    }
  ): void {
    const config = this.getOrCreateConfig(deviceIp)
    Object.assign(config, settings)
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Apply game session settings to all devices
   */
  applyGameSessionToAll(session: GameSessionSettings): void {
    for (const [deviceIp, config] of this.devices) {
      config.maxHearts = session.maxHearts
      config.maxAmmo = session.maxAmmo
      config.respawnTimeS = session.respawnTimeS
      config.gameDurationS = session.gameDurationS
      config.friendlyFire = session.friendlyFire
    }
  }

  /**
   * Auto-assign team colors to devices
   */
  assignTeamColors(deviceIps: string[], teamId: number, color: number): void {
    for (const ip of deviceIps) {
      const config = this.getOrCreateConfig(ip)
      config.teamId = teamId
      config.colorRgb = color
    }
  }

  /**
   * Auto-configure ESP-NOW mesh network for all devices
   * Each device can communicate with all other devices
   */
  configureEspNowMesh(deviceConfigs: Map<string, { ip: string; mac: string }>): void {
    const allMacs = Array.from(deviceConfigs.values()).map((d) => d.mac)

    // Each device gets all other devices as peers
    for (const [deviceIp, deviceInfo] of deviceConfigs) {
      const peers = allMacs.filter((mac) => mac !== deviceInfo.mac)
      this.setEspNowPeers(deviceIp, peers)
    }
  }

  // ============================================================================
  // SENDING CONFIGURATION
  // ============================================================================

  /**
   * Send full configuration to a device
   * @returns true if sent successfully
   */
  async sendFullConfig(deviceIp: string): Promise<boolean> {
    const config = this.devices.get(deviceIp)
    if (!config) {
      console.warn(`[DeviceConfig] No config found for ${deviceIp}`)
      return false
    }

    const message = this.buildConfigMessage(config)
    return this.comm.send(deviceIp, message)
  }

  /**
   * Send configuration to all devices
   */
  async sendToAllDevices(): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0

    for (const [deviceIp, config] of this.devices) {
      const success = await this.sendFullConfig(deviceIp)
      if (success) {
        sent++
      } else {
        failed++
      }
    }

    return { sent, failed }
  }

  /**
   * Send only ESP-NOW peer list to a device
   */
  async sendPeerUpdate(deviceIp: string): Promise<boolean> {
    const config = this.devices.get(deviceIp)
    if (!config?.espnowPeers) {
      console.warn(`[DeviceConfig] No peers configured for ${deviceIp}`)
      return false
    }

    const message = {
      op: 3,
      type: 'config_update',
      espnow_peers: config.espnowPeers.join(','),
    } as ClientMessage

    return this.comm.send(deviceIp, message)
  }

  /**
   * Reset device to defaults
   */
  async resetToDefaults(deviceIp: string): Promise<boolean> {
    const message = {
      op: 3,
      type: 'config_update',
      reset_to_defaults: true,
    } as ClientMessage

    return this.comm.send(deviceIp, message)
  }

  // ============================================================================
  // QUERY
  // ============================================================================

  /**
   * Get current configuration for a device
   */
  getConfig(deviceIp: string): DeviceFullConfig | undefined {
    return this.devices.get(deviceIp)
  }

  /**
   * Get all configured devices
   */
  getAllDevices(): Map<string, DeviceFullConfig> {
    return new Map(this.devices)
  }

  /**
   * Clear configuration for a device
   */
  clearDevice(deviceIp: string): void {
    this.devices.delete(deviceIp)
  }

  /**
   * Clear all configurations
   */
  clearAll(): void {
    this.devices.clear()
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Get or create config for a device
   */
  private getOrCreateConfig(deviceIp: string): DeviceFullConfig {
    let config = this.devices.get(deviceIp)
    if (!config) {
      config = {}
      this.devices.set(deviceIp, config)
    }
    return config
  }

  /**
   * Build config update message from full config
   */
  private buildConfigMessage(config: DeviceFullConfig): ClientMessage {
    const message = {
      op: 3,
      type: 'config_update',
    } as any

    // Identity
    if (config.deviceName !== undefined) message.device_name = config.deviceName
    if (config.deviceId !== undefined) message.device_id = config.deviceId
    if (config.playerId !== undefined) message.player_id = config.playerId
    if (config.teamId !== undefined) message.team_id = config.teamId
    if (config.colorRgb !== undefined) message.color_rgb = config.colorRgb

    // Hardware/AV
    if (config.irPower !== undefined) message.ir_power = config.irPower
    if (config.volume !== undefined) message.volume = config.volume
    if (config.soundProfile !== undefined) message.sound_profile = config.soundProfile
    if (config.hapticEnabled !== undefined) message.haptic_enabled = config.hapticEnabled

    // Game Rules - Health
    if (config.enableHearts !== undefined) message.enable_hearts = config.enableHearts
    if (config.spawnHearts !== undefined) message.spawn_hearts = config.spawnHearts
    if (config.maxHearts !== undefined) message.max_hearts = config.maxHearts
    if (config.respawnTimeS !== undefined) message.respawn_time_s = config.respawnTimeS
    if (config.damageIn !== undefined) message.damage_in = config.damageIn
    if (config.damageOut !== undefined) message.damage_out = config.damageOut
    if (config.friendlyFire !== undefined) message.friendly_fire = config.friendlyFire

    // Game Rules - Ammo
    if (config.enableAmmo !== undefined) message.enable_ammo = config.enableAmmo
    if (config.maxAmmo !== undefined) message.max_ammo = config.maxAmmo
    if (config.reloadTimeMs !== undefined) message.reload_time_ms = config.reloadTimeMs

    // Game Timer
    if (config.gameDurationS !== undefined) message.game_duration_s = config.gameDurationS

    // ESP-NOW Peers (comma-separated MAC addresses)
    if (config.espnowPeers !== undefined && config.espnowPeers.length > 0) {
      message.espnow_peers = config.espnowPeers.join(',')
    }

    return message as ClientMessage
  }
}
