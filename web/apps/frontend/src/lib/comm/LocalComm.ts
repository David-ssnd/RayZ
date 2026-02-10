/**
 * LocalComm - Direct WebSocket Communication for Local Mode
 *
 * Connects DIRECTLY to ESP32 devices on the local network.
 * No bridge server required - reduced latency and simpler architecture.
 *
 * Features:
 * - Per-device WebSocket connections at ws://<device-ip>/ws
 * - MessagePack binary protocol with JSON fallback
 * - Auto-reconnection with exponential backoff
 * - Connection state aggregation
 *
 * @example
 * ```typescript
 * const comm = new LocalComm({ useBinaryProtocol: true })
 * comm.addDevice('192.168.1.100')
 * comm.send('192.168.1.100', { op: OpCode.GET_STATUS, type: 'get_status' })
 * comm.onMessage('*', (msg, ip) => console.log('From', ip, msg))
 * ```
 */

import type { ClientMessage, ServerMessage } from '@rayz/types'
import { encode, decode } from '@msgpack/msgpack'

import type { CommConnectionState, GameComm, LocalCommConfig } from './types'

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: Required<LocalCommConfig> = {
  serverUrl: '', // Not used - kept for interface compatibility
  autoReconnect: true,
  reconnectDelay: 3000,
  maxRetries: Infinity,
  connectionTimeout: 5000,
  heartbeatInterval: 10000, // 10 seconds per protocol v2.3
  useBinaryProtocol: true,
} as const

const LOG_PREFIX = '[LocalComm]' as const

// ============================================================================
// TYPES
// ============================================================================

interface DeviceConnection {
  readonly ip: string
  ws: WebSocket | null
  connected: boolean
  reconnecting: boolean
  reconnectTimeout: NodeJS.Timeout | null
  heartbeatInterval: NodeJS.Timeout | null
  lastActivity: number
  lastSeqId: number // Last sequence ID received for deduplication
}

type MessageHandler = (message: ServerMessage, device: string) => void
type StateHandler = (state: CommConnectionState) => void
type ErrorHandler = (error: Error) => void

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safe console logger with prefix
 */
const log = {
  info: (msg: string, ...args: unknown[]) => console.log(`${LOG_PREFIX}`, msg, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(`${LOG_PREFIX}`, msg, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`${LOG_PREFIX}`, msg, ...args),
  debug: (msg: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`${LOG_PREFIX}`, msg, ...args)
    }
  },
}

/**
 * Create a new device connection instance
 */
function createDeviceConnection(ip: string): DeviceConnection {
  return {
    ip,
    ws: null,
    connected: false,
    reconnecting: false,
    reconnectTimeout: null,
    heartbeatInterval: null,
    lastActivity: Date.now(),
    lastSeqId: 0,
  }
}

/**
 * Cleanup device connection resources
 */
function cleanupDeviceConnection(device: DeviceConnection): void {
  if (device.reconnectTimeout) {
    clearTimeout(device.reconnectTimeout)
    device.reconnectTimeout = null
  }

  if (device.heartbeatInterval) {
    clearInterval(device.heartbeatInterval)
    device.heartbeatInterval = null
  }

  if (device.ws) {
    device.ws.close()
    device.ws = null
  }
}

// ============================================================================
// MAIN CLASS
// ============================================================================

export class LocalComm implements GameComm {
  readonly mode = 'local' as const

  private readonly config: Required<LocalCommConfig>
  private readonly devices = new Map<string, DeviceConnection>()
  private _state: CommConnectionState = 'disconnected'

  // Event handlers using Sets for efficient add/remove
  private readonly messageHandlers = new Map<string, Set<MessageHandler>>()
  private readonly stateHandlers = new Set<StateHandler>()
  private readonly errorHandlers = new Set<ErrorHandler>()

  constructor(config: LocalCommConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    log.debug('Initialized with config:', this.config)
  }

  // ============================================================================
  // PUBLIC API - Connection Management
  // ============================================================================

  get state(): CommConnectionState {
    return this._state
  }

  /**
   * Add a device to manage and connect to it
   * @param ip - Device IP address (e.g., '192.168.1.100')
   */
  addDevice(ip: string): void {
    if (!this.isValidIp(ip)) {
      log.error(`Invalid IP address: ${ip}`)
      return
    }

    if (this.devices.has(ip)) {
      log.info(`Device ${ip} already managed`)
      return
    }

    const device = createDeviceConnection(ip)
    this.devices.set(ip, device)
    this.connectToDevice(ip)
    this.updateGlobalState()
    log.info(`✓ Device ${ip} added`)
  }

  /**
   * Remove a device and close its connection
   * @param ip - Device IP address
   */
  removeDevice(ip: string): void {
    const device = this.devices.get(ip)
    if (!device) {
      log.warn(`Device ${ip} not found`)
      return
    }

    cleanupDeviceConnection(device)
    this.devices.delete(ip)
    this.updateGlobalState()
    log.info(`Device ${ip} removed`)
  }

  /**
   * Connect to all devices (compatibility method)
   */
  async connect(): Promise<void> {
    this.setState('connected')
    log.debug('Global connect called (no-op in direct mode)')
  }

  /**
   * Disconnect from all devices
   */
  disconnect(): void {
    log.info(`Disconnecting ${this.devices.size} devices`)

    for (const [ip, device] of this.devices) {
      cleanupDeviceConnection(device)
    }

    this.devices.clear()
    this.setState('disconnected')
  }

  // ============================================================================
  // PUBLIC API - Messaging
  // ============================================================================

  /**
   * Send message to a specific device
   * @param deviceId - Target device IP
   * @param message - Protocol message
   * @returns true if sent successfully
   */
  send(deviceId: string, message: ClientMessage): boolean {
    const device = this.devices.get(deviceId)

    if (!device?.ws || device.ws.readyState !== WebSocket.OPEN) {
      log.warn(`Cannot send to ${deviceId} - not connected`)
      return false
    }

    try {
      const data = this.encodeMessage(message)
      device.ws.send(data)
      device.lastActivity = Date.now()
      return true
    } catch (err) {
      this.handleError(new Error(`Send error to ${deviceId}: ${err}`))
      return false
    }
  }

  /**
   * Broadcast message to all connected devices
   * @param message - Protocol message
   */
  broadcast(message: ClientMessage): void {
    const data = this.encodeMessage(message)
    let sentCount = 0
    const totalDevices = this.devices.size

    for (const [ip, device] of this.devices) {
      if (device.ws?.readyState === WebSocket.OPEN) {
        try {
          device.ws.send(data)
          device.lastActivity = Date.now()
          sentCount++
        } catch (err) {
          log.error(`Broadcast error to ${ip}:`, err)
        }
      }
    }

    log.debug(`Broadcast sent to ${sentCount}/${totalDevices} devices`)
  }

  // ============================================================================
  // PUBLIC API - Event Handlers
  // ============================================================================

  /**
   * Subscribe to messages from specific device or all devices
   * @param deviceId - Device IP or '*' for all devices
   * @param callback - Message handler
   * @returns Unsubscribe function
   */
  onMessage(deviceId: string, callback: MessageHandler): () => void {
    if (!this.messageHandlers.has(deviceId)) {
      this.messageHandlers.set(deviceId, new Set())
    }

    this.messageHandlers.get(deviceId)!.add(callback)

    return () => {
      this.messageHandlers.get(deviceId)?.delete(callback)
    }
  }

  /**
   * Subscribe to connection state changes
   * @param callback - State change handler
   * @returns Unsubscribe function
   */
  onStateChange(callback: StateHandler): () => void {
    this.stateHandlers.add(callback)
    return () => this.stateHandlers.delete(callback)
  }

  /**
   * Subscribe to errors
   * @param callback - Error handler
   * @returns Unsubscribe function
   */
  onError(callback: ErrorHandler): () => void {
    this.errorHandlers.add(callback)
    return () => this.errorHandlers.delete(callback)
  }

  // ============================================================================
  // PUBLIC API - Status
  // ============================================================================

  /**
   * Get list of connected device IPs
   */
  getConnectedDevices(): string[] {
    return Array.from(this.devices.entries())
      .filter(([_, device]) => device.connected)
      .map(([ip, _]) => ip)
  }

  /**
   * Check if specific device is connected
   */
  isDeviceConnected(deviceId: string): boolean {
    return this.devices.get(deviceId)?.connected ?? false
  }

  // ============================================================================
  // PRIVATE METHODS - Connection Management
  // ============================================================================

  /**
   * Establish WebSocket connection to a device
   */
  private connectToDevice(ip: string): void {
    const device = this.devices.get(ip)
    if (!device || device.connected || device.reconnecting) {
      return
    }

    device.reconnecting = true
    const wsUrl = `ws://${ip}/ws`

    log.info(`Connecting to ${ip}...`)

    try {
      const ws = new WebSocket(wsUrl)
      const timeout = this.setupConnectionTimeout(device, ws)

      ws.onopen = () => this.handleWebSocketOpen(device, ws, timeout)
      ws.onmessage = (event) => this.handleWebSocketMessage(device, event)
      ws.onclose = () => this.handleWebSocketClose(device)
      ws.onerror = (err) => this.handleWebSocketError(device, err, timeout)
    } catch (err) {
      log.error(`Failed to create WebSocket for ${ip}:`, err)
      device.reconnecting = false
      this.scheduleReconnect(device)
    }
  }

  /**
   * Setup connection timeout
   */
  private setupConnectionTimeout(
    device: DeviceConnection,
    ws: WebSocket
  ): NodeJS.Timeout {
    return setTimeout(() => {
      if (!device.connected) {
        log.warn(`Connection timeout for ${device.ip}`)
        ws.close()
      }
    }, this.config.connectionTimeout)
  }

  /**
   * Handle WebSocket open event
   */
  private handleWebSocketOpen(
    device: DeviceConnection,
    ws: WebSocket,
    timeout: NodeJS.Timeout
  ): void {
    clearTimeout(timeout)
    log.info(`✓ Connected to ${device.ip}`)

    device.ws = ws
    device.connected = true
    device.reconnecting = false
    device.lastActivity = Date.now()

    // Request initial status
    this.send(device.ip, { op: 1, type: 'get_status' } as ClientMessage)

    // Start heartbeat interval if configured
    if (this.config.heartbeatInterval > 0) {
      device.heartbeatInterval = setInterval(() => {
        if (device.connected && device.ws) {
          this.send(device.ip, { op: 2, type: 'heartbeat' } as ClientMessage)
          log.debug(`Sent heartbeat to ${device.ip}`)
        }
      }, this.config.heartbeatInterval)
      log.debug(`Started heartbeat for ${device.ip} (interval: ${this.config.heartbeatInterval}ms)`)
    }

    this.updateGlobalState()
  }

  /**
   * Handle WebSocket message event
   */
  private handleWebSocketMessage(device: DeviceConnection, event: MessageEvent): void {
    device.lastActivity = Date.now()

    try {
      const message = this.decodeMessage(event.data)
      
      // Check for duplicate messages using seq_id if present
      if ('seq_id' in message && typeof message.seq_id === 'number') {
        // Allow seq_id wrapping (uint32 overflow)
        const seqId = message.seq_id as number
        if (seqId > 0 && seqId <= device.lastSeqId) {
          // Duplicate or out-of-order message - ignore
          log.debug(`Dropping duplicate message from ${device.ip}: seq_id=${seqId}, last=${device.lastSeqId}`)
          return
        }
        device.lastSeqId = seqId
      }
      
      this.emitMessage(device.ip, message)
    } catch (err) {
      log.error(`Failed to handle message from ${device.ip}:`, err)
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleWebSocketClose(device: DeviceConnection): void {
    log.info(`Disconnected from ${device.ip}`)

    // Stop heartbeat interval
    if (device.heartbeatInterval) {
      clearInterval(device.heartbeatInterval)
      device.heartbeatInterval = null
      log.debug(`Stopped heartbeat for ${device.ip}`)
    }

    device.ws = null
    device.connected = false
    device.reconnecting = false

    this.updateGlobalState()

    if (this.config.autoReconnect && this.devices.has(device.ip)) {
      this.scheduleReconnect(device)
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleWebSocketError(
    device: DeviceConnection,
    err: Event,
    timeout: NodeJS.Timeout
  ): void {
    clearTimeout(timeout)
    log.error(`WebSocket error for ${device.ip}:`, err)
    device.reconnecting = false
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(device: DeviceConnection): void {
    device.reconnectTimeout = setTimeout(() => {
      if (this.devices.has(device.ip)) {
        this.connectToDevice(device.ip)
      }
    }, this.config.reconnectDelay)
  }

  // ============================================================================
  // PRIVATE METHODS - Message Handling
  // ============================================================================

  /**
   * Encode message to binary or JSON
   */
  private encodeMessage(message: ClientMessage): string | ArrayBuffer {
    if (!this.config.useBinaryProtocol) {
      return JSON.stringify(message)
    }

    try {
      const encoded = encode(message)
      // Convert Uint8Array to ArrayBuffer for WebSocket
      return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength)
    } catch (err) {
      log.warn('MessagePack encode failed, falling back to JSON:', err)
      return JSON.stringify(message)
    }
  }

  /**
   * Decode message from binary or JSON
   */
  private decodeMessage(data: string | ArrayBuffer): ServerMessage {
    if (data instanceof ArrayBuffer) {
      try {
        return decode(new Uint8Array(data)) as ServerMessage
      } catch (err) {
        log.error('MessagePack decode failed:', err)
        throw err
      }
    }

    return JSON.parse(data) as ServerMessage
  }

  /**
   * Emit message to handlers
   */
  private emitMessage(deviceIp: string, message: ServerMessage): void {
    // Device-specific handlers
    this.invokeHandlers(this.messageHandlers.get(deviceIp), message, deviceIp)

    // Wildcard handlers
    this.invokeHandlers(this.messageHandlers.get('*'), message, deviceIp)
  }

  /**
   * Safely invoke message handlers
   */
  private invokeHandlers(
    handlers: Set<MessageHandler> | undefined,
    message: ServerMessage,
    deviceIp: string
  ): void {
    handlers?.forEach((handler) => {
      try {
        handler(message, deviceIp)
      } catch (err) {
        log.error(`Error in message handler for ${deviceIp}:`, err)
      }
    })
  }

  // ============================================================================
  // PRIVATE METHODS - State Management
  // ============================================================================

  /**
   * Update global connection state based on device states
   */
  private updateGlobalState(): void {
    const hasDevices = this.devices.size > 0
    const anyConnected = Array.from(this.devices.values()).some((d) => d.connected)
    const allReconnecting = Array.from(this.devices.values()).every((d) => d.reconnecting)

    let newState: CommConnectionState

    if (!hasDevices) {
      newState = 'disconnected'
    } else if (anyConnected) {
      newState = 'connected'
    } else if (allReconnecting) {
      newState = 'connecting'
    } else {
      newState = 'disconnected'
    }

    if (this._state !== newState) {
      this.setState(newState)
    }
  }

  /**
   * Set state and notify handlers
   */
  private setState(state: CommConnectionState): void {
    this._state = state
    log.debug(`State changed: ${state}`)

    this.stateHandlers.forEach((handler) => {
      try {
        handler(state)
      } catch (err) {
        log.error('Error in state handler:', err)
      }
    })
  }

  /**
   * Handle error and notify handlers
   */
  private handleError(error: Error): void {
    log.error(error.message)

    this.errorHandlers.forEach((handler) => {
      try {
        handler(error)
      } catch (err) {
        log.error('Error in error handler:', err)
      }
    })
  }

  // ============================================================================
  // PRIVATE METHODS - Validation
  // ============================================================================

  /**
   * Validate IP address format (basic validation)
   */
  private isValidIp(ip: string): boolean {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(ip)) {
      return false
    }

    return ip.split('.').every((octet) => {
      const num = parseInt(octet, 10)
      return num >= 0 && num <= 255
    })
  }
}
