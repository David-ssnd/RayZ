'use client'

/**
 * GameComm React Context
 *
 * Provides the GameComm instance throughout the app with mode-aware setup.
 * This is a higher-level abstraction over the device connections that
 * automatically selects the appropriate communication backend.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ClientMessage, ServerMessage } from '@rayz/types'

import { createGameComm, type CommConnectionState, type GameComm } from './index'
import { getAppMode } from './mode'
import type { AppMode, CloudCommConfig, LocalCommConfig } from './types'

// ============= Types =============

export interface GameCommContextValue {
  /** The GameComm instance */
  comm: GameComm

  /** Current connection state */
  state: CommConnectionState

  /** Current app mode */
  mode: AppMode

  /** Connected device IDs */
  connectedDevices: string[]

  /** Last error */
  error: Error | null

  /** Whether connected */
  isConnected: boolean

  /** Whether connecting */
  isConnecting: boolean

  /** Connect to the communication backend */
  connect: () => Promise<void>

  /** Disconnect from the communication backend */
  disconnect: () => void

  /** Send message to a specific device */
  send: (deviceId: string, message: ClientMessage) => boolean

  /** Broadcast message to all devices */
  broadcast: (message: ClientMessage) => void

  /** Subscribe to messages from a device */
  onMessage: (
    deviceId: string,
    callback: (message: ServerMessage, fromDevice: string) => void
  ) => () => void
}

// ============= Context =============

const GameCommContext = createContext<GameCommContextValue | null>(null)

// ============= Hook =============

/**
 * Hook to access the GameComm context
 *
 * @example
 * ```tsx
 * function DeviceList() {
 *   const { connectedDevices, send, state } = useGameCommContext()
 *
 *   const handleStartGame = () => {
 *     broadcast({ op: OpCode.GAME_COMMAND, type: 'game_command', command: GameCommandType.START })
 *   }
 *
 *   return (
 *     <div>
 *       <p>Status: {state}</p>
 *       <ul>
 *         {connectedDevices.map(id => <li key={id}>{id}</li>)}
 *       </ul>
 *       <button onClick={handleStartGame}>Start Game</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useGameCommContext(): GameCommContextValue {
  const context = useContext(GameCommContext)
  if (!context) {
    throw new Error('useGameCommContext must be used within GameCommProvider')
  }
  return context
}

// ============= Provider =============

export interface GameCommProviderProps {
  children: ReactNode

  /** Override automatic mode detection */
  mode?: AppMode

  /** Session ID for cloud mode */
  sessionId?: string

  /** Local mode configuration */
  localConfig?: Partial<LocalCommConfig>

  /** Cloud mode configuration */
  cloudConfig?: Partial<Omit<CloudCommConfig, 'sessionId'>>

  /** Auto-connect on mount */
  autoConnect?: boolean

  /** Callback when a message is received */
  onMessage?: (message: ServerMessage, fromDevice: string) => void

  /** Callback when connection state changes */
  onStateChange?: (state: CommConnectionState) => void

  /** Callback when an error occurs */
  onError?: (error: Error) => void
}

export function GameCommProvider({
  children,
  mode,
  sessionId,
  localConfig,
  cloudConfig,
  autoConnect = true,
  onMessage,
  onStateChange,
  onError,
}: GameCommProviderProps) {
  const [state, setState] = useState<CommConnectionState>('disconnected')
  const [connectedDevices, setConnectedDevices] = useState<string[]>([])
  const [error, setError] = useState<Error | null>(null)

  // Refs for callbacks
  const onMessageRef = useRef(onMessage)
  const onStateChangeRef = useRef(onStateChange)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onMessageRef.current = onMessage
    onStateChangeRef.current = onStateChange
    onErrorRef.current = onError
  }, [onMessage, onStateChange, onError])

  // Create comm instance
  const comm = useMemo(() => {
    return createGameComm({
      mode,
      sessionId,
      localConfig,
      cloudConfig,
    })
  }, [mode, sessionId, localConfig, cloudConfig])

  // Subscribe to comm events
  useEffect(() => {
    const unsubState = comm.onStateChange((newState) => {
      setState(newState)
      setConnectedDevices(comm.getConnectedDevices())
      onStateChangeRef.current?.(newState)
    })

    const unsubError = comm.onError((err) => {
      setError(err)
      onErrorRef.current?.(err)
    })

    const unsubMessage = comm.onMessage('*', (message, fromDevice) => {
      onMessageRef.current?.(message, fromDevice)
    })

    return () => {
      unsubState()
      unsubError()
      unsubMessage()
    }
  }, [comm])

  // Auto-connect
  useEffect(() => {
    if (autoConnect) {
      comm.connect().catch((err) => {
        console.error('[GameCommProvider] Auto-connect failed:', err)
      })
    }

    return () => {
      comm.disconnect()
    }
  }, [comm, autoConnect])

  // Helpers
  const connect = useCallback(async () => {
    await comm.connect()
  }, [comm])

  const disconnect = useCallback(() => {
    comm.disconnect()
  }, [comm])

  const send = useCallback(
    (deviceId: string, message: ClientMessage) => {
      return comm.send(deviceId, message)
    },
    [comm]
  )

  const broadcast = useCallback(
    (message: ClientMessage) => {
      comm.broadcast(message)
    },
    [comm]
  )

  const subscribeToMessage = useCallback(
    (deviceId: string, callback: (message: ServerMessage, fromDevice: string) => void) => {
      return comm.onMessage(deviceId, callback)
    },
    [comm]
  )

  const value: GameCommContextValue = useMemo(
    () => ({
      comm,
      state,
      mode: comm.mode,
      connectedDevices,
      error,
      isConnected: state === 'connected',
      isConnecting: state === 'connecting',
      connect,
      disconnect,
      send,
      broadcast,
      onMessage: subscribeToMessage,
    }),
    [comm, state, connectedDevices, error, connect, disconnect, send, broadcast, subscribeToMessage]
  )

  return <GameCommContext.Provider value={value}>{children}</GameCommContext.Provider>
}

// ============= Mode Indicator =============

export function CommModeIndicator({ className }: { className?: string }) {
  const { mode, state } = useGameCommContext()

  const stateColors: Record<CommConnectionState, string> = {
    disconnected: 'text-gray-500',
    connecting: 'text-yellow-500',
    connected: 'text-green-500',
    error: 'text-red-500',
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <span className={stateColors[state]}>●</span>
      <span className="text-sm">
        {mode === 'cloud' ? '☁️ Cloud' : '🏠 Local'} - {state}
      </span>
    </div>
  )
}
