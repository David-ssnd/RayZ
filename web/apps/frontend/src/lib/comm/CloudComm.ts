/**
 * CloudComm - Ably-based Communication for Cloud Mode
 *
 * Uses Ably pub/sub channels for real-time communication.
 * Used when the app runs on Vercel or other cloud environments.
 */

import type { ClientMessage, ServerMessage } from '@rayz/types'

import type { CloudCommConfig, CommConnectionState, GameComm } from './types'

// Ably types (minimal for this implementation)
interface AblyMessage {
  name: string
  data: unknown
  clientId?: string
}

interface AblyChannel {
  name: string
  subscribe(callback: (message: AblyMessage) => void): void
  subscribe(name: string, callback: (message: AblyMessage) => void): void
  unsubscribe(): void
  publish(name: string, data: unknown): Promise<void>
  presence: {
    enter(data?: unknown): Promise<void>
    leave(): Promise<void>
    get(): Promise<Array<{ clientId: string; data?: unknown }>>
    subscribe(
      event: 'enter' | 'leave' | 'update',
      callback: (member: { clientId: string; data?: unknown }) => void
    ): void
  }
}

interface AblyRealtime {
  connection: {
    state: string
    on(event: string, callback: (stateChange: { current: string }) => void): void
    close(): void
  }
  channels: {
    get(name: string): AblyChannel
  }
  close(): void
}

declare const Ably: {
  Realtime: new (options: { key?: string; authUrl?: string; clientId: string }) => AblyRealtime
}

const DEFAULT_CONFIG: Partial<CloudCommConfig> = {
  channelPrefix: 'rayz-game',
  enableHistory: false,
}

export class CloudComm implements GameComm {
  readonly mode = 'cloud' as const

  private config: CloudCommConfig
  private ably: AblyRealtime | null = null
  private gameChannel: AblyChannel | null = null
  private deviceChannel: AblyChannel | null = null
  private _state: CommConnectionState = 'disconnected'
  private connectedDevices: Set<string> = new Set()

  // Event handlers
  private messageHandlers: Map<string, Set<(message: ServerMessage, device: string) => void>> =
    new Map()
  private stateHandlers: Set<(state: CommConnectionState) => void> = new Set()
  private errorHandlers: Set<(error: Error) => void> = new Set()

  constructor(config: CloudCommConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as CloudCommConfig
  }

  get state(): CommConnectionState {
    return this._state
  }

  async connect(): Promise<void> {
    if (this._state === 'connecting' || this._state === 'connected') {
      return
    }

    this.setState('connecting')

    try {
      // Dynamically load Ably if not already loaded
      if (typeof Ably === 'undefined') {
        await this.loadAblyScript()
      }

      // Initialize Ably connection
      const ablyOptions: { key?: string; authUrl?: string; clientId: string } = {
        clientId: `browser-${Date.now()}`,
      }

      // Use API key directly or token authentication
      if (this.config.apiKeyOrToken.includes(':')) {
        // Looks like an API key
        ablyOptions.key = this.config.apiKeyOrToken
      } else {
        // Use token authentication URL
        ablyOptions.authUrl = this.config.apiKeyOrToken
      }

      this.ably = new Ably.Realtime(ablyOptions)

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Ably connection timeout'))
        }, 10000)

        this.ably!.connection.on('connected', () => {
          clearTimeout(timeout)
          resolve()
        })

        this.ably!.connection.on('failed', () => {
          clearTimeout(timeout)
          reject(new Error('Ably connection failed'))
        })
      })

      // Subscribe to channels
      const channelName = `${this.config.channelPrefix}:${this.config.sessionId}`
      this.gameChannel = this.ably.channels.get(channelName)
      this.deviceChannel = this.ably.channels.get(`${channelName}:devices`)

      // Subscribe to device messages
      this.deviceChannel.subscribe('message', (msg) => {
        this.handleDeviceMessage(msg)
      })

      // Subscribe to presence to track connected devices
      this.deviceChannel.presence.subscribe('enter', (member) => {
        this.connectedDevices.add(member.clientId)
      })

      this.deviceChannel.presence.subscribe('leave', (member) => {
        this.connectedDevices.delete(member.clientId)
      })

      // Get current presence
      const members = await this.deviceChannel.presence.get()
      members.forEach((m) => this.connectedDevices.add(m.clientId))

      // Enter presence as browser client
      await this.gameChannel.presence.enter({ type: 'browser' })

      // Listen for connection state changes
      this.ably.connection.on('disconnected', () => {
        this.setState('disconnected')
      })

      this.ably.connection.on('connected', () => {
        this.setState('connected')
      })

      this.setState('connected')
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.handleError(error)
      throw error
    }
  }

  disconnect(): void {
    if (this.gameChannel) {
      this.gameChannel.presence.leave().catch(() => {})
      this.gameChannel.unsubscribe()
    }

    if (this.deviceChannel) {
      this.deviceChannel.unsubscribe()
    }

    if (this.ably) {
      this.ably.close()
      this.ably = null
    }

    this.connectedDevices.clear()
    this.setState('disconnected')
  }

  send(deviceId: string, message: ClientMessage): boolean {
    if (!this.deviceChannel || this._state !== 'connected') {
      return false
    }

    try {
      // Publish to the device channel with target device ID
      this.deviceChannel.publish('command', {
        target: deviceId,
        payload: message,
        timestamp: Date.now(),
      })
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.handleError(error)
      return false
    }
  }

  broadcast(message: ClientMessage): void {
    if (!this.deviceChannel || this._state !== 'connected') {
      return
    }

    try {
      this.deviceChannel.publish('broadcast', {
        payload: message,
        timestamp: Date.now(),
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.handleError(error)
    }
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
    return Array.from(this.connectedDevices)
  }

  isDeviceConnected(deviceId: string): boolean {
    return this.connectedDevices.has(deviceId)
  }

  // ============= Private Methods =============

  private setState(state: CommConnectionState): void {
    if (this._state !== state) {
      this._state = state
      this.stateHandlers.forEach((handler) => {
        try {
          handler(state)
        } catch (e) {
          console.error('[CloudComm] Error in state handler:', e)
        }
      })
    }
  }

  private handleError(error: Error): void {
    this.setState('error')
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error)
      } catch (e) {
        console.error('[CloudComm] Error in error handler:', e)
      }
    })
  }

  private handleDeviceMessage(msg: AblyMessage): void {
    try {
      const data = msg.data as {
        source: string
        payload: ServerMessage
      }

      if (!data || typeof data !== 'object' || !data.source || !data.payload) {
        return
      }

      const { source: deviceId, payload: message } = data

      // Emit to specific device handlers
      this.messageHandlers.get(deviceId)?.forEach((handler) => {
        try {
          handler(message, deviceId)
        } catch (e) {
          console.error(`[CloudComm] Error in message handler for ${deviceId}:`, e)
        }
      })

      // Emit to wildcard handlers
      this.messageHandlers.get('*')?.forEach((handler) => {
        try {
          handler(message, deviceId)
        } catch (e) {
          console.error('[CloudComm] Error in wildcard message handler:', e)
        }
      })
    } catch (err) {
      console.error('[CloudComm] Failed to handle device message:', err)
    }
  }

  private async loadAblyScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Cannot load Ably script in non-browser environment'))
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.ably.com/lib/ably.min-1.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Ably SDK'))
      document.head.appendChild(script)
    })
  }
}
