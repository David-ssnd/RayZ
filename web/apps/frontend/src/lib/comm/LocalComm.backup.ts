/**
 * LocalComm - Direct WebSocket Communication for Local Mode
 *
 * Connects DIRECTLY to ESP32 devices on the local network.
 * No bridge server required - reduced latency and simpler architecture.
 *
 * Each device maintains its own WebSocket connection at ws://<device-ip>/ws
 */

import type { ClientMessage, ServerMessage } from '@rayz/types'
import { encode, decode } from '@msgpack/msgpack'

import type { CommConnectionState, GameComm, LocalCommConfig } from './types'

const DEFAULT_CONFIG: Required<LocalCommConfig> = {
  serverUrl: '', // Not used anymore - direct device connections
  autoReconnect: true,
  reconnectDelay: 3000,
  maxRetries: Infinity, // Always try to reconnect
  connectionTimeout: 5000,
  heartbeatInterval: 0, // Use native WebSocket ping/pong
  useBinaryProtocol: true, // Use MessagePack by default
}

interface DeviceConnection {
  ip: string
  ws: WebSocket | null
  connected: boolean
  reconnecting: boolean
  reconnectTimeout: NodeJS.Timeout | null
  lastActivity: number
}

export class LocalComm implements GameComm {
  readonly mode = 'local' as const

  private config: Required<LocalCommConfig>
  private devices: Map<string, DeviceConnection> = new Map()
  private _state: CommConnectionState = 'disconnected'

  // Event handlers
  private messageHandlers: Map<string, Set<(message: ServerMessage, device: string) => void>> =
    new Map()
  private stateHandlers: Set<(state: CommConnectionState) => void> = new Set()
  private errorHandlers: Set<(error: Error) => void> = new Set()

  constructor(config: LocalCommConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  get state(): CommConnectionState {
    return this._state
  }

  /**
   * Add a device to manage and connect to it
   */
  addDevice(ip: string): void {
    if (this.devices.has(ip)) {
      console.log(`[LocalComm] Device ${ip} already added`)
      return
    }

    const device: DeviceConnection = {
      ip,
      ws: null,
      connected: false,
      reconnecting: false,
      reconnectTimeout: null,
      lastActivity: Date.now(),
    }

    this.devices.set(ip, device)
    this.connectToDevice(ip)
    this.updateGlobalState()
  }

  /**
   * Remove a device and close its connection
   */
  removeDevice(ip: string): void {
    const device = this.devices.get(ip)
    if (!device) return

    if (device.reconnectTimeout) {
      clearTimeout(device.reconnectTimeout)
    }

    if (device.ws) {
      device.ws.close()
    }

    this.devices.delete(ip)
    this.updateGlobalState()
  }

  async connect(): Promise<void> {
    // For compatibility - LocalComm now manages connections per device
    // No global connection needed
    this.setState('connected')
    return Promise.resolve()
  }

  disconnect(): void {
    // Close all device connections
    for (const [ip, device] of this.devices) {
      if (device.reconnectTimeout) {
        clearTimeout(device.reconnectTimeout)
      }
      if (device.ws) {
        device.ws.close()
      }
    }
    this.devices.clear()
    this.setState('disconnected')
  }

  send(deviceId: string, message: ClientMessage): boolean {
    const device = this.devices.get(deviceId)
    if (!device?.ws || device.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[LocalComm] Cannot send to ${deviceId} - not connected`)
      return false
    }

    try {
      const data = this.encodeMessage(message)
      device.ws.send(data)
      device.lastActivity = Date.now()
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error(`[LocalComm] Send error to ${deviceId}:`, error)
      this.handleError(error)
      return false
    }
  }

  broadcast(message: ClientMessage): void {
    const data = this.encodeMessage(message)
    let sentCount = 0

    for (const [ip, device] of this.devices) {
      if (device.ws?.readyState === WebSocket.OPEN) {
        try {
          device.ws.send(data)
          device.lastActivity = Date.now()
          sentCount++
        } catch (err) {
          console.error(`[LocalComm] Broadcast error to ${ip}:`, err)
        }
      }
    }

    console.log(`[LocalComm] Broadcast sent to ${sentCount}/${this.devices.size} devices`)
  }

  onMessage(
    deviceId: string,
    callback: (message: ServerMessage, fromDevice: string) => void
  ): () => void {
    if (!this.messageHandlers.has(deviceId)) {
      this.messageHandlers.set(deviceId, new Set())
    }
    this.messageHandlers.get(deviceId)!.add(callback)

    return () => {
      this.messageHandlers.get(deviceId)?.delete(callback)
    }
  }

  onStateChange(callback: (state: CommConnectionState) => void): () => void {
    this.stateHandlers.add(callback)
    return () => {
      this.stateHandlers.delete(callback)
    }
  }

  onError(callback: (error: Error) => void): () => void {
    this.errorHandlers.add(callback)
    return () => {
      this.errorHandlers.delete(callback)
    }
  }

  getConnectedDevices(): string[] {
    return Array.from(this.devices.entries())
      .filter(([_, device]) => device.connected)
      .map(([ip, _]) => ip)
  }

  isDeviceConnected(deviceId: string): boolean {
    return this.devices.get(deviceId)?.connected ?? false
  }

  // ============= Private Methods =============

  /**
   * Connect to a specific ESP32 device
   */
  private connectToDevice(ip: string): void {
    const device = this.devices.get(ip)
    if (!device || device.connected || device.reconnecting) {
      return
    }

    device.reconnecting = true
    const wsUrl = `ws://${ip}/ws`

    console.log(`[LocalComm] Connecting to device ${ip}...`)

    try {
      const ws = new WebSocket(wsUrl)

      // Connection timeout
      const timeout = setTimeout(() => {
        if (!device.connected) {
          console.warn(`[LocalComm] Connection timeout for ${ip}`)
          ws.close()
        }
      }, this.config.connectionTimeout)

      ws.onopen = () => {
        clearTimeout(timeout)
        console.log(`[LocalComm] ✓ Connected to device ${ip}`)

        device.ws = ws
        device.connected = true
        device.reconnecting = false
        device.lastActivity = Date.now()

        // Request initial status
        this.send(ip, { op: 1, type: 'get_status' } as ClientMessage)

        this.updateGlobalState()
      }

      ws.onmessage = (event) => {
        device.lastActivity = Date.now()
        this.handleDeviceMessage(ip, event.data)
      }

      ws.onclose = () => {
        console.log(`[LocalComm] Disconnected from device ${ip}`)
        device.ws = null
        device.connected = false
        device.reconnecting = false

        this.updateGlobalState()

        // Schedule reconnect if auto-reconnect enabled
        if (this.config.autoReconnect && this.devices.has(ip)) {
          device.reconnectTimeout = setTimeout(() => {
            this.connectToDevice(ip)
          }, this.config.reconnectDelay)
        }
      }

      ws.onerror = (err) => {
        clearTimeout(timeout)
        console.error(`[LocalComm] Device ${ip} error:`, err)
        device.reconnecting = false
      }
    } catch (err) {
      console.error(`[LocalComm] Failed to create WebSocket for ${ip}:`, err)
      device.reconnecting = false

      // Schedule reconnect
      if (this.config.autoReconnect) {
        device.reconnectTimeout = setTimeout(() => {
          this.connectToDevice(ip)
        }, this.config.reconnectDelay)
      }
    }
  }

  /**
   * Handle message from a specific device
   */
  private handleDeviceMessage(deviceIp: string, data: string | ArrayBuffer): void {
    try {
      const message = this.decodeMessage(data)

      // Emit to device-specific handlers
      this.messageHandlers.get(deviceIp)?.forEach((handler) => {
        try {
          handler(message, deviceIp)
        } catch (e) {
          console.error(`[LocalComm] Error in message handler for ${deviceIp}:`, e)
        }
      })

      // Emit to wildcard handlers
      this.messageHandlers.get('*')?.forEach((handler) => {
        try {
          handler(message, deviceIp)
        } catch (e) {
          console.error('[LocalComm] Error in wildcard message handler:', e)
        }
      })
    } catch (err) {
      console.error(`[LocalComm] Failed to handle message from ${deviceIp}:`, err)
    }
  }

  /**
   * Encode message using MessagePack or JSON
   */
  private encodeMessage(message: ClientMessage): string | ArrayBuffer {
    if (this.config.useBinaryProtocol) {
      try {
        const encoded = encode(message)
        // Convert Uint8Array to ArrayBuffer
        return encoded.buffer.slice(
          encoded.byteOffset,
          encoded.byteOffset + encoded.byteLength
        )
      } catch (err) {
        console.warn('[LocalComm] MessagePack encode failed, falling back to JSON:', err)
        return JSON.stringify(message)
      }
    }
    return JSON.stringify(message)
  }

  /**
   * Decode message from MessagePack or JSON
   */
  private decodeMessage(data: string | ArrayBuffer): ServerMessage {
    if (data instanceof ArrayBuffer) {
      // Binary MessagePack format
      try {
        return decode(new Uint8Array(data)) as ServerMessage
      } catch (err) {
        console.error('[LocalComm] MessagePack decode failed:', err)
        throw err
      }
    } else {
      // JSON string format
      return JSON.parse(data) as ServerMessage
    }
  }

  /**
   * Update global connection state based on device states
   */
  private updateGlobalState(): void {
    const hasDevices = this.devices.size > 0
    const anyConnected = Array.from(this.devices.values()).some((d) => d.connected)
    const allReconnecting = Array.from(this.devices.values()).every((d) => d.reconnecting)

    if (!hasDevices) {
      this.setState('disconnected')
    } else if (anyConnected) {
      this.setState('connected')
    } else if (allReconnecting) {
      this.setState('connecting')
    } else {
      this.setState('disconnected')
    }
  }

  private setState(state: CommConnectionState): void {
    if (this._state !== state) {
      this._state = state
      this.stateHandlers.forEach((handler) => {
        try {
          handler(state)
        } catch (e) {
          console.error('[LocalComm] Error in state handler:', e)
        }
      })
    }
  }

  private handleError(error: Error): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error)
      } catch (e) {
        console.error('[LocalComm] Error in error handler:', e)
      }
    })
  }
}
