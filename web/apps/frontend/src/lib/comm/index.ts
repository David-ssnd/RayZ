// ============= React Hooks =============

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ClientMessage, ServerMessage } from '@rayz/types'

import { CloudComm } from './CloudComm'
import { LocalComm } from './LocalComm'
import { getAblyConfig, getAppMode, getLocalWsUrl } from './mode'
import type { CloudCommConfig, CommConnectionState, GameComm, LocalCommConfig } from './types'

/**
 * Communication Layer
 *
 * Provides a unified interface for browser-to-device communication
 * that works in both local (WebSocket) and cloud (Ably) modes.
 */

export * from './types'
export * from './mode'
export * from './features'
export { LocalComm } from './LocalComm'
export { CloudComm } from './CloudComm'
export { GameCommProvider, useGameCommContext, CommModeIndicator } from './GameCommContext'
export {
  CloudOnly,
  LocalOnly,
  Feature,
  ModeIndicator,
  useFeatureFlags,
  useAppMode,
} from './FeatureGate'

/**
 * Create the appropriate GameComm instance based on current mode
 *
 * @param options - Optional configuration overrides
 * @returns GameComm instance (LocalComm or CloudComm)
 */
export function createGameComm(
  options: {
    /** Override mode detection */
    mode?: 'local' | 'cloud'
    /** Session ID for cloud mode */
    sessionId?: string
    /** Local mode config overrides */
    localConfig?: Partial<LocalCommConfig>
    /** Cloud mode config overrides */
    cloudConfig?: Partial<Omit<CloudCommConfig, 'sessionId'>>
  } = {}
): GameComm {
  const mode = options.mode ?? getAppMode()

  if (mode === 'local') {
    return new LocalComm({
      serverUrl: getLocalWsUrl(),
      ...options.localConfig,
    })
  }

  // Cloud mode
  const ablyConfig = getAblyConfig()
  const apiKeyOrToken = ablyConfig.apiKey ?? ablyConfig.tokenUrl ?? ''

  if (!apiKeyOrToken) {
    console.warn(
      '[GameComm] No Ably API key or token URL configured. Set NEXT_PUBLIC_ABLY_API_KEY or NEXT_PUBLIC_ABLY_TOKEN_URL.'
    )
  }

  return new CloudComm({
    apiKeyOrToken,
    sessionId: options.sessionId ?? `session-${Date.now()}`,
    ...options.cloudConfig,
  })
}

/**
 * React hook for using GameComm
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { comm, state, send, connectedDevices } = useGameComm({ sessionId: 'my-session' })
 *
 *   useEffect(() => {
 *     comm.connect()
 *     return () => comm.disconnect()
 *   }, [comm])
 *
 *   return <div>State: {state}</div>
 * }
 * ```
 */
export function useGameComm(options: Parameters<typeof createGameComm>[0] = {}) {
  const commRef = useRef<GameComm | null>(null)
  const [state, setState] = useState<CommConnectionState>('disconnected')
  const [connectedDevices, setConnectedDevices] = useState<string[]>([])
  const [error, setError] = useState<Error | null>(null)

  // Create comm instance once
  const comm = useMemo(() => {
    if (!commRef.current) {
      commRef.current = createGameComm(options)
    }
    return commRef.current
  }, []) // Intentionally empty - create once

  // Subscribe to state changes
  useEffect(() => {
    const unsubState = comm.onStateChange((newState) => {
      setState(newState)
      setConnectedDevices(comm.getConnectedDevices())
    })

    const unsubError = comm.onError((err) => {
      setError(err)
    })

    return () => {
      unsubState()
      unsubError()
    }
  }, [comm])

  // Send helper
  const send = useCallback(
    (deviceId: string, message: ClientMessage) => {
      return comm.send(deviceId, message)
    },
    [comm]
  )

  // Broadcast helper
  const broadcast = useCallback(
    (message: ClientMessage) => {
      comm.broadcast(message)
    },
    [comm]
  )

  // Subscribe to messages helper
  const onMessage = useCallback(
    (deviceId: string, callback: (message: ServerMessage, fromDevice: string) => void) => {
      return comm.onMessage(deviceId, callback)
    },
    [comm]
  )

  return {
    comm,
    state,
    connectedDevices,
    error,
    send,
    broadcast,
    onMessage,
    mode: comm.mode,
    isConnected: state === 'connected',
    isConnecting: state === 'connecting',
  }
}
