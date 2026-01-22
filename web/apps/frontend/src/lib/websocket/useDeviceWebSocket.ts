import { useCallback, useEffect, useState } from 'react'

import { useDeviceConnections } from './DeviceConnectionContext'
import {
  AckMessage,
  ClientMessage,
  ConfigUpdateMessage,
  ConnectionState,
  DeviceState,
  DeviceStatusMessage,
  GameCommandType,
  GameOverMessage,
  HitReportMessage,
  initialDeviceState,
  OpCode,
  ReloadMessage,
  RespawnMessage,
  ServerMessage,
  ShotFiredMessage,
} from './types'

export interface UseDeviceWebSocketOptions {
  ipAddress: string
  bridgeUrl?: string // Optional bridge URL
  autoConnect?: boolean
  autoReconnect?: boolean
  reconnectDelay?: number
  heartbeatInterval?: number
  connectionTimeout?: number

  // Callbacks
  onStatus?: (status: DeviceStatusMessage) => void
  onShotFired?: (shot: ShotFiredMessage) => void
  onHitReport?: (hit: HitReportMessage) => void
  onRespawn?: (respawn: RespawnMessage) => void
  onReload?: (reload: ReloadMessage) => void
  onGameOver?: (gameOver: GameOverMessage) => void
  onAck?: (ack: AckMessage) => void
  onMessage?: (message: ServerMessage) => void
  onConnectionChange?: (state: ConnectionState) => void
  onError?: (error: Event | string) => void
}

export interface UseDeviceWebSocketReturn {
  state: DeviceState
  connectionState: ConnectionState
  isConnected: boolean
  url: string | undefined

  // Connection
  connect: () => void
  disconnect: () => void

  // Generic Send
  send: (message: ClientMessage) => boolean

  // Helper Methods
  getStatus: () => boolean
  sendHeartbeat: () => boolean
  updateConfig: (config: Omit<ConfigUpdateMessage, 'type' | 'op'>) => boolean
  sendGameCommand: (command: GameCommandType) => boolean
  forwardHit: (shooterId: number) => boolean
  confirmKill: () => boolean
  playRemoteSound: (soundId: number) => boolean
}

/**
 * @deprecated This hook is now a wrapper around the DeviceConnectionsContext.
 * Please use `useDevice(ip)` or `useDeviceConnections()` directly where possible.
 */
export function useDeviceWebSocket(options: UseDeviceWebSocketOptions): UseDeviceWebSocketReturn {
  const {
    ipAddress,
    autoConnect = true,
    onStatus,
    onShotFired,
    onHitReport,
    onRespawn,
    onReload,
    onGameOver,
    onAck,
    onMessage,
    onConnectionChange,
  } = options

  // Use the global context management to prevent double-sockets
  const { getDeviceState, getConnection, addDevice, subscribe, isDeviceConnected } =
    useDeviceConnections()

  // Ensure device is tracked in context
  useEffect(() => {
    addDevice(ipAddress)
    // Note: Context handles autoConnect if provider is configured so,
    // but if we want per-hook autoConnect control we might need to expose it better.
    // For now trust the context's autoConnect or the manual connection below.
  }, [ipAddress, addDevice])

  const contextState = getDeviceState(ipAddress)
  const connection = getConnection(ipAddress)

  // Local state fallback if context is not yet ready (should be rare)
  const safeState = contextState || initialDeviceState(ipAddress)

  // Connection management wrappers
  const connect = useCallback(() => connection?.connect(), [connection])
  const disconnect = useCallback(() => connection?.disconnect(), [connection])

  // Sync connection state change callback
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(safeState.connectionState)
    }
  }, [safeState.connectionState, onConnectionChange])

  // Event Subscription Bridge
  useEffect(() => {
    const unsubs: Array<() => void> = []

    if (onStatus) unsubs.push(subscribe(ipAddress, 'status', (data) => onStatus(data)))
    if (onShotFired) unsubs.push(subscribe(ipAddress, 'shot', (data) => onShotFired(data)))
    if (onHitReport) unsubs.push(subscribe(ipAddress, 'hit', (data) => onHitReport(data)))
    if (onRespawn) unsubs.push(subscribe(ipAddress, 'respawn', (data) => onRespawn(data)))
    if (onReload) unsubs.push(subscribe(ipAddress, 'reload', (data) => onReload(data)))
    if (onGameOver) unsubs.push(subscribe(ipAddress, 'gameover', (data) => onGameOver(data)))
    if (onAck) unsubs.push(subscribe(ipAddress, 'ack', (data) => onAck(data)))

    // Generic message handler
    if (onMessage) unsubs.push(subscribe(ipAddress, 'message', (data) => onMessage(data)))

    return () => {
      unsubs.forEach((unsub) => unsub())
    }
  }, [
    ipAddress,
    subscribe,
    onStatus,
    onShotFired,
    onHitReport,
    onRespawn,
    onReload,
    onGameOver,
    onAck,
    onMessage,
  ])

  // Helper Wrappers (Ported from original logic but delegating to connection)
  const send = useCallback((msg: ClientMessage) => connection?.send(msg) ?? false, [connection])

  const getStatus = useCallback(() => connection?.getStatus() ?? false, [connection])

  const sendHeartbeat = useCallback(() => send({ op: OpCode.HEARTBEAT, type: 'heartbeat' }), [send]) // Connection context already does this automatically! But we expose it anyway.

  const updateConfig = useCallback(
    (config: Omit<ConfigUpdateMessage, 'type' | 'op'>) => connection?.updateConfig(config) ?? false,
    [connection]
  )

  const sendGameCommand = useCallback(
    (command: GameCommandType) => {
      // Map enum back to 'start' | 'stop' | 'reset' string expected by context?
      // Actually context `sendGameCommand` takes string or enum?
      // Context `sendGameCommand` takes string 'start' | 'stop'.
      // But we have `OpCode` generic send available.
      return send({
        op: OpCode.GAME_COMMAND,
        type: 'game_command',
        req_id: crypto.randomUUID().slice(0, 8),
        command,
      })
    },
    [send]
  )

  const forwardHit = useCallback(
    (shooterId: number) =>
      send({
        op: OpCode.HIT_FORWARD,
        type: 'hit_forward',
        shooter_id: shooterId,
      }),
    [send]
  )

  const confirmKill = useCallback(
    () => send({ op: OpCode.KILL_CONFIRMED, type: 'kill_confirmed' }),
    [send]
  )

  const playRemoteSound = useCallback(
    (soundId: number) =>
      send({
        op: OpCode.REMOTE_SOUND,
        type: 'remote_sound',
        sound_id: soundId,
      }),
    [send]
  )

  return {
    state: safeState,
    connectionState: safeState.connectionState,
    isConnected: safeState.connectionState === 'connected',
    url: isDeviceConnected(ipAddress) ? `ws://${ipAddress}/ws` : undefined,
    connect,
    disconnect,
    send,
    getStatus,
    sendHeartbeat,
    updateConfig,
    sendGameCommand,
    forwardHit,
    confirmKill,
    playRemoteSound,
  }
}
