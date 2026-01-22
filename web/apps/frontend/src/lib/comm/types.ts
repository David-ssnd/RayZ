/**
 * Communication Layer Types
 *
 * Defines the GameComm interface and related types for abstracting
 * communication between browser and devices across local/cloud modes.
 */

import type { ClientMessage, ServerMessage } from '@rayz/types'

/**
 * Connection state for the communication layer
 */
export type CommConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

/**
 * Application mode - determines which communication backend to use
 */
export type AppMode = 'local' | 'cloud'

/**
 * Message envelope for channel-based communication (Ably)
 */
export interface ChannelMessage {
  /** Device IP or identifier */
  deviceId: string
  /** The actual protocol message */
  payload: ClientMessage | ServerMessage
  /** Timestamp of the message */
  timestamp: number
  /** Direction of the message */
  direction: 'inbound' | 'outbound'
}

/**
 * Event types emitted by GameComm implementations
 */
export type CommEventType =
  | 'message' // Raw message received
  | 'connected' // Connection established
  | 'disconnected' // Connection lost
  | 'error' // Error occurred
  | 'reconnecting' // Attempting reconnection

export type CommEventHandler<T = unknown> = (data: T) => void

/**
 * GameComm Interface
 *
 * Abstract communication interface that supports both:
 * - Local WebSocket server (direct device connections)
 * - Cloud Ably channels (pub/sub through Ably)
 */
export interface GameComm {
  /** Current connection state */
  readonly state: CommConnectionState

  /** Current mode (local or cloud) */
  readonly mode: AppMode

  /** Connect to the communication backend */
  connect(): Promise<void>

  /** Disconnect from the communication backend */
  disconnect(): void

  /**
   * Send a message to a specific device
   * @param deviceId - Target device identifier (IP for local, device ID for cloud)
   * @param message - Protocol message to send
   * @returns true if message was sent successfully
   */
  send(deviceId: string, message: ClientMessage): boolean

  /**
   * Broadcast a message to all connected devices
   * @param message - Protocol message to broadcast
   */
  broadcast(message: ClientMessage): void

  /**
   * Subscribe to incoming messages from a specific device
   * @param deviceId - Device to subscribe to ('*' for all devices)
   * @param callback - Handler for incoming messages
   * @returns Unsubscribe function
   */
  onMessage(
    deviceId: string,
    callback: (message: ServerMessage, fromDevice: string) => void
  ): () => void

  /**
   * Subscribe to connection state changes
   * @param callback - Handler for state changes
   * @returns Unsubscribe function
   */
  onStateChange(callback: (state: CommConnectionState) => void): () => void

  /**
   * Subscribe to errors
   * @param callback - Handler for errors
   * @returns Unsubscribe function
   */
  onError(callback: (error: Error) => void): () => void

  /**
   * Get list of currently connected device IDs
   */
  getConnectedDevices(): string[]

  /**
   * Check if a specific device is connected
   */
  isDeviceConnected(deviceId: string): boolean
}

/**
 * Configuration for LocalComm (WebSocket-based)
 */
export interface LocalCommConfig {
  /** WebSocket server URL (deprecated - now connects directly to devices) */
  serverUrl?: string
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean
  /** Reconnect delay in ms */
  reconnectDelay?: number
  /** Maximum reconnect attempts */
  maxRetries?: number
  /** Connection timeout in ms */
  connectionTimeout?: number
  /** Heartbeat interval in ms (0 = use native WebSocket ping/pong) */
  heartbeatInterval?: number
  /** Use MessagePack binary protocol instead of JSON */
  useBinaryProtocol?: boolean
}

/**
 * Configuration for CloudComm (Ably-based)
 */
export interface CloudCommConfig {
  /** Ably API key (for server-side) or token (for client-side) */
  apiKeyOrToken: string
  /** Channel name prefix for the game session */
  channelPrefix?: string
  /** Game session ID */
  sessionId: string
  /** Enable message history */
  enableHistory?: boolean
}
