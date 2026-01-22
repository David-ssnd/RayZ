'use client'

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

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
  ServerMessage,
  ShotFiredMessage,
} from './types'

// ============= Types =============

export interface DeviceConnection {
  state: DeviceState
  ws: WebSocket | null
  connect: () => void
  disconnect: () => void
  send: (message: ClientMessage) => boolean
  getStatus: () => boolean
  updateConfig: (config: Omit<ConfigUpdateMessage, 'type' | 'op'>) => boolean
  sendGameCommand: (command: 'start' | 'stop' | 'reset') => boolean
  forwardHit: (shooterId: number) => boolean
  confirmKill: () => boolean
  playRemoteSound: (soundId: number) => boolean
}

type DeviceEventType =
  | 'status'
  | 'shot'
  | 'hit'
  | 'respawn'
  | 'reload'
  | 'gameover'
  | 'ack'
  | 'message'
  | 'connection'

type DeviceEventHandler = (data: any, ip: string) => void

export interface DeviceConnectionsContextValue {
  /** Map of IP address to device connection */
  connections: Map<string, DeviceConnection>
  /** Add a device to manage */
  addDevice: (ipAddress: string) => void
  /** Remove a device from management */
  removeDevice: (ipAddress: string) => void
  /** Get connection for a specific device */
  getConnection: (ipAddress: string) => DeviceConnection | undefined
  /** Subscribe to device events */
  subscribe: (ip: string, event: DeviceEventType, handler: DeviceEventHandler) => () => void
  /** Retry connecting to a device (resets retry count) */
  retryDevice: (ipAddress: string) => void
  /** Get device state for a specific device */
  getDeviceState: (ipAddress: string) => DeviceState | undefined
  /** Check if device is connected */
  isDeviceConnected: (ipAddress: string) => boolean
  /** Connect all devices */
  connectAll: () => void
  /** Disconnect all devices */
  disconnectAll: () => void
  /** Send command to all connected devices */
  broadcastCommand: (command: 'start' | 'stop' | 'reset') => void
  /** Broadcast configuration to all connected devices */
  broadcastConfig: (config: Omit<ConfigUpdateMessage, 'type' | 'op'>) => void
  /** Get all connected device states */
  connectedDevices: DeviceState[]
  /** Event handlers - can be set by consumers */
  onHitReport?: (hit: HitReportMessage, fromDevice: string) => void
  onShotFired?: (shot: ShotFiredMessage, fromDevice: string) => void
  onStatusUpdate?: (status: DeviceStatusMessage, fromDevice: string) => void
}

// ============= Context =============

const DeviceConnectionsContext = createContext<DeviceConnectionsContextValue | null>(null)

// ============= Hook =============

export function useDeviceConnections(): DeviceConnectionsContextValue {
  const context = useContext(DeviceConnectionsContext)
  if (!context) {
    throw new Error('useDeviceConnections must be used within DeviceConnectionsProvider')
  }
  return context
}

// ============= Single Device Hook (simpler API) =============

export function useDevice(ipAddress: string) {
  const { getConnection, getDeviceState, addDevice } = useDeviceConnections()

  useEffect(() => {
    addDevice(ipAddress)
  }, [ipAddress, addDevice])

  return {
    connection: getConnection(ipAddress),
    state: getDeviceState(ipAddress),
    isConnected: getDeviceState(ipAddress)?.connectionState === 'connected',
  }
}

// ============= Provider =============

interface DeviceConnectionsProviderProps {
  children: ReactNode
  /** Initial device IPs to connect to */
  initialDevices?: string[]
  /** Setup bridge URL for HTTPS environments */
  bridgeUrl?: string
  /** Auto-connect on add (default: true) */
  autoConnect?: boolean
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelay?: number
  /** Maximum reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number
  /** Maximum retry attempts before giving up (default: 10, 0 = infinite) */
  maxRetries?: number
  /** Connection timeout in ms (default: 5000) */
  connectionTimeout?: number
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number
  /** Enable WebSocket debug logging (default: dev only) */
  logging?: boolean
  /** Callback when a hit is reported */
  onHitReport?: (hit: HitReportMessage, fromDevice: string) => void
  /** Callback when a shot is fired */
  onShotFired?: (shot: ShotFiredMessage, fromDevice: string) => void
  /** Callback when status is updated */
  onStatusUpdate?: (status: DeviceStatusMessage, fromDevice: string) => void
}

export function DeviceConnectionsProvider({
  children,
  initialDevices = [],
  bridgeUrl = process.env.NEXT_PUBLIC_WS_BRIDGE_URL,
  autoConnect = true,
  autoReconnect = true,
  reconnectDelay = 1000,
  maxReconnectDelay = 30000,
  maxRetries = 10,
  connectionTimeout = 5000,
  heartbeatInterval = 30000,
  logging,
  onHitReport,
  onShotFired,
  onStatusUpdate,
}: DeviceConnectionsProviderProps) {
  // Store device states
  const [deviceStates, setDeviceStates] = useState<Map<string, DeviceState>>(
    () => new Map(initialDevices.map((ip) => [ip, initialDeviceState(ip)]))
  )

  // Store WebSocket references
  const websocketsRef = useRef<Map<string, WebSocket>>(new Map())
  const reconnectTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const connectionTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const heartbeatIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const shouldReconnectRef = useRef<Map<string, boolean>>(new Map())
  const retryCountRef = useRef<Map<string, number>>(new Map())
  // Track devices with pending connections (to prevent Strict Mode double-connect)
  const connectingRef = useRef<Set<string>>(new Set())
  // Track if component is mounted (for Strict Mode cleanup handling)
  const isMountedRef = useRef(true)
  // Logging toggle (default: enabled in dev, disabled in prod unless overridden)
  const loggingEnabledRef = useRef(logging ?? process.env.NODE_ENV !== 'production')

  useEffect(() => {
    loggingEnabledRef.current = logging ?? process.env.NODE_ENV !== 'production'
  }, [logging])

  const logDebug = useCallback((message: string) => {
    if (loggingEnabledRef.current) {
      console.log(message)
    }
  }, [])

  const logWarn = useCallback((message: string) => {
    if (loggingEnabledRef.current) {
      console.warn(message)
    }
  }, [])

  // Event Subscribers: Map<IP, Map<Event, Set<Handler>>>
  const subscribersRef = useRef<Map<string, Map<DeviceEventType, Set<DeviceEventHandler>>>>(
    new Map()
  )

  // Event handlers refs (to avoid recreating callbacks)
  const onHitReportRef = useRef(onHitReport)
  const onShotFiredRef = useRef(onShotFired)
  const onStatusUpdateRef = useRef(onStatusUpdate)

  const bridgeUrlRef = useRef(bridgeUrl)
  useEffect(() => {
    bridgeUrlRef.current = bridgeUrl
  }, [bridgeUrl])

  // Calculate next reconnect delay with exponential backoff
  const getNextReconnectDelay = useCallback(
    (ip: string): number => {
      const retries = retryCountRef.current.get(ip) || 0
      const delay = Math.min(reconnectDelay * Math.pow(2, retries), maxReconnectDelay)
      return delay
    },
    [reconnectDelay, maxReconnectDelay]
  )

  // Subscribe to device events
  const subscribe = useCallback(
    (ip: string, event: DeviceEventType, handler: DeviceEventHandler) => {
      if (!subscribersRef.current.has(ip)) {
        subscribersRef.current.set(ip, new Map())
      }
      const deviceSubs = subscribersRef.current.get(ip)!

      if (!deviceSubs.has(event)) {
        deviceSubs.set(event, new Set())
      }
      deviceSubs.get(event)!.add(handler)

      return () => {
        const currentDeviceSubs = subscribersRef.current.get(ip)
        if (currentDeviceSubs) {
          currentDeviceSubs.get(event)?.delete(handler)
        }
      }
    },
    []
  )

  const emit = useCallback((ip: string, event: DeviceEventType, data: any) => {
    const deviceSubs = subscribersRef.current.get(ip)
    if (deviceSubs?.has(event)) {
      deviceSubs.get(event)!.forEach((handler) => {
        try {
          handler(data, ip)
        } catch (e) {
          console.error(`[WS ${ip}] Error in event handler for ${event}:`, e)
        }
      })
    }
    // Also emit generic 'message' event for all server messages
    if (event !== 'connection' && event !== 'message' && deviceSubs?.has('message')) {
      deviceSubs.get('message')!.forEach((handler) => handler(data, ip))
    }
  }, [])

  useEffect(() => {
    onHitReportRef.current = onHitReport
    onShotFiredRef.current = onShotFired
    onStatusUpdateRef.current = onStatusUpdate
  }, [onHitReport, onShotFired, onStatusUpdate])

  // Update device state helper
  const updateDeviceState = useCallback(
    (ip: string, update: Partial<DeviceState> | ((prev: DeviceState) => Partial<DeviceState>)) => {
      setDeviceStates((prev) => {
        const newMap = new Map(prev)
        const current = newMap.get(ip) || initialDeviceState(ip)
        const partial = typeof update === 'function' ? update(current) : update
        newMap.set(ip, { ...current, ...partial })
        return newMap
      })
    },
    []
  )

  // Clear timeouts for a device
  const clearDeviceTimeouts = useCallback((ip: string) => {
    const reconnectTimeout = reconnectTimeoutsRef.current.get(ip)
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeoutsRef.current.delete(ip)
    }
    const connectionTimeout = connectionTimeoutsRef.current.get(ip)
    if (connectionTimeout) {
      clearTimeout(connectionTimeout)
      connectionTimeoutsRef.current.delete(ip)
    }
    const heartbeatInterval = heartbeatIntervalsRef.current.get(ip)
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatIntervalsRef.current.delete(ip)
    }
  }, [])

  // Send message to a device
  const sendToDevice = useCallback(
    (ip: string, message: ClientMessage): boolean => {
      const ws = websocketsRef.current.get(ip)
      if (ws?.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message))
          return true
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          updateDeviceState(ip, {
            connectionState: 'error',
            lastError: `Send failed: ${msg}`,
          })
          return false
        }
      }
      // Socket not open; surface this to UI so user understands the state
      updateDeviceState(ip, {
        lastError: 'Cannot send: socket not open',
      })
      return false
    },
    [updateDeviceState]
  )

  // Handle incoming messages
  const handleMessage = useCallback(
    (ip: string, event: MessageEvent) => {
      try {
        let message = JSON.parse(event.data)

        // Handle bridge wrapper (unwrap payload if source matches this device)
        if (message.source && message.payload) {
          if (message.source !== ip) {
            // Verify if this is a message for another device.
            // In bridge mode, we might receive broadcasts for other devices on this socket.
            // We should ignore them.
            return
          }
          message = message.payload
        }

        switch (message.type) {
          case 'status': {
            const status = message as DeviceStatusMessage
            updateDeviceState(ip, {
              deviceId: status.config.device_id,
              playerId: status.config.player_id,
              teamId: status.config.team_id,
              colorRgb: status.config.color_rgb,
              kills: status.stats.enemy_kills,
              deaths: status.stats.deaths,
              shots: status.stats.shots,
              friendlyKills: status.stats.friendly_kills,
              hitsReceived: status.stats.hits_received || 0,
              hearts: status.state.current_hearts,

              lastStatusUpdate: new Date(),
            })
            onStatusUpdateRef.current?.(status, ip)
            emit(ip, 'status', status)
            break
          }

          case 'heartbeat_ack': {
            updateDeviceState(ip, {
              batteryVoltage: message.batt_voltage,
              rssi: message.rssi,
              lastHeartbeat: new Date(),
            })
            emit(ip, 'ack', message)
            break
          }

          case 'shot_fired': {
            updateDeviceState(ip, (prev) => ({ shots: prev.shots + 1 }))
            onShotFiredRef.current?.(message, ip)
            emit(ip, 'shot', message)
            break
          }

          case 'hit_report': {
            onHitReportRef.current?.(message, ip)
            emit(ip, 'hit', message)
            break
          }

          case 'respawn': {
            updateDeviceState(ip, { hearts: message.current_hearts, isRespawning: false })
            emit(ip, 'respawn', message)
            break
          }

          // Add other events if missing from switch but present in types
          case 'game_over': {
            emit(ip, 'gameover', message)
            break
          }

          case 'reload_event': {
            const reload = message as ReloadMessage
            updateDeviceState(ip, {
              isReloading: false,
              ammo: reload.current_ammo,
            })
            emit(ip, 'reload', message)
            break
          }

          case 'ack': {
            emit(ip, 'ack', message)
            break
          }
        }
      } catch (error) {
        logWarn(
          `[WS ${ip}] Failed to parse message: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
    [updateDeviceState, emit, logWarn]
  )

  // Connect to a device
  const connectDevice = useCallback(
    (ip: string) => {
      // Guard: Check if already connecting (prevents Strict Mode double-connect)
      if (connectingRef.current.has(ip)) {
        return
      }

      const existingWs = websocketsRef.current.get(ip)
      if (
        existingWs?.readyState === WebSocket.OPEN ||
        existingWs?.readyState === WebSocket.CONNECTING
      ) {
        return
      }

      // Check if we've exceeded max retries
      const currentRetries = retryCountRef.current.get(ip) || 0
      if (maxRetries > 0 && currentRetries >= maxRetries) {
        updateDeviceState(ip, {
          connectionState: 'error',
          lastError: `Device offline (${maxRetries} attempts failed)`,
        })
        shouldReconnectRef.current.set(ip, false)
        return
      }

      // Mark as connecting
      connectingRef.current.add(ip)

      clearDeviceTimeouts(ip)
      updateDeviceState(ip, { connectionState: 'connecting', lastError: undefined })
      shouldReconnectRef.current.set(ip, autoReconnect)

      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
      const bridge = bridgeUrlRef.current
      let wsUrl: string

      // In local mode, we should always use the bridge if it's configured,
      // or fallback to direct connection if it's explicitly disabled/missing.
      // However, if we're on localhost and NO bridge is set, direct is fine (over http).

      if (bridge) {
        wsUrl = `${bridge}?target=${encodeURIComponent(ip)}`
      } else if (isHttps) {
        // HTTPS always requires bridge for ws:// ESP32s
        if (currentRetries === 0) {
          logWarn(
            `[WS ${ip}] Cannot connect: HTTPS page cannot connect to ws:// (ESP32 does not support wss://). ` +
              'Set NEXT_PUBLIC_WS_BRIDGE_URL or access this page over HTTP.'
          )
        }
        updateDeviceState(ip, {
          connectionState: 'error',
          lastError: 'HTTPS requires WebSocket bridge (ESP32 only supports ws://)',
        })
        shouldReconnectRef.current.set(ip, false)
        connectingRef.current.delete(ip)
        return
      } else {
        // HTTP localhost or direct IP -> can use direct WebSocket
        wsUrl = `ws://${ip}/ws`
      }

      // Only log on first connection attempt
      if (currentRetries === 0) {
        logDebug(`[WS ${ip}] Connecting to ${wsUrl}...`)
      }

      try {
        const ws = new WebSocket(wsUrl)
        websocketsRef.current.set(ip, ws)

        // Set connection timeout
        const connTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close()
            // Connection timeout triggers onclose, which handles reconnect
          }
        }, connectionTimeout)
        connectionTimeoutsRef.current.set(ip, connTimeout)

        ws.onopen = () => {
          // Clear connection timeout
          const timeout = connectionTimeoutsRef.current.get(ip)
          if (timeout) {
            clearTimeout(timeout)
            connectionTimeoutsRef.current.delete(ip)
          }

          // Clear connecting flag
          connectingRef.current.delete(ip)

          // Reset retry count on successful connection
          retryCountRef.current.set(ip, 0)

          logDebug(`[WS ${ip}] Connected!`)
          updateDeviceState(ip, {
            connectionState: 'connected',
            lastConnected: new Date(),
            lastError: undefined,
          })
          emit(ip, 'connection', { connected: true })

          // Request initial status
          sendToDevice(ip, { op: OpCode.GET_STATUS, type: 'get_status' })

          // Start heartbeat
          const interval = setInterval(() => {
            sendToDevice(ip, { op: OpCode.HEARTBEAT, type: 'heartbeat' })
          }, heartbeatInterval)
          heartbeatIntervalsRef.current.set(ip, interval)
        }

        ws.onmessage = (event) => handleMessage(ip, event)

        ws.onerror = () => {
          // Browser hides detailed WS errors; add helpful hint for HTTPS mixed content
          let msg = 'Connection failed'
          if (typeof window !== 'undefined') {
            const isHttps = window.location.protocol === 'https:'
            if (isHttps && typeof wsUrl === 'string' && wsUrl.startsWith('ws://')) {
              msg = 'Blocked: insecure ws:// from HTTPS page'
            }
          }
          updateDeviceState(ip, { lastError: msg })
        }

        ws.onclose = () => {
          // Clear connecting flag
          connectingRef.current.delete(ip)

          // Clear connection timeout if still pending
          const connTimeout = connectionTimeoutsRef.current.get(ip)
          if (connTimeout) {
            clearTimeout(connTimeout)
            connectionTimeoutsRef.current.delete(ip)
          }

          clearDeviceTimeouts(ip)
          websocketsRef.current.delete(ip)
          updateDeviceState(ip, { connectionState: 'disconnected' })
          emit(ip, 'connection', { connected: false })

          // Don't reconnect if component is unmounting (Strict Mode)
          if (!isMountedRef.current) {
            return
          }

          // Schedule reconnect with exponential backoff
          if (shouldReconnectRef.current.get(ip) && autoReconnect) {
            const newRetryCount = (retryCountRef.current.get(ip) || 0) + 1
            retryCountRef.current.set(ip, newRetryCount)

            // Check if we should continue retrying
            if (maxRetries > 0 && newRetryCount >= maxRetries) {
              logDebug(`[WS ${ip}] Max retries (${maxRetries}) reached. Device offline.`)
              updateDeviceState(ip, {
                connectionState: 'error',
                lastError: `Device offline (${maxRetries} attempts failed)`,
              })
              shouldReconnectRef.current.set(ip, false)
              return
            }

            const delay = getNextReconnectDelay(ip)
            // Only log every 3rd retry to reduce noise
            if (newRetryCount <= 1 || newRetryCount % 3 === 0) {
              logDebug(
                `[WS ${ip}] Reconnecting in ${delay}ms... (attempt ${newRetryCount}/${maxRetries || '∞'})`
              )
            }

            const timeout = setTimeout(() => {
              if (shouldReconnectRef.current.get(ip)) {
                connectDevice(ip)
              }
            }, delay)
            reconnectTimeoutsRef.current.set(ip, timeout)
          }
        }
      } catch (error) {
        // Clear connecting flag on error
        connectingRef.current.delete(ip)
        const msg = error instanceof Error ? error.message : String(error)
        updateDeviceState(ip, {
          connectionState: 'error',
          lastError: `Failed to create connection: ${msg}`,
        })
      }
    },
    [
      autoReconnect,
      maxRetries,
      connectionTimeout,
      heartbeatInterval,
      getNextReconnectDelay,
      clearDeviceTimeouts,
      updateDeviceState,
      sendToDevice,
      handleMessage,
      emit,
      logDebug,
      logWarn,
    ]
  )

  // Disconnect from a device
  const disconnectDevice = useCallback(
    (ip: string) => {
      shouldReconnectRef.current.set(ip, false)
      clearDeviceTimeouts(ip)
      const ws = websocketsRef.current.get(ip)
      if (ws) {
        ws.close()
        websocketsRef.current.delete(ip)
      }
      updateDeviceState(ip, { connectionState: 'disconnected' })
    },
    [clearDeviceTimeouts, updateDeviceState]
  )

  // Add a device
  const addDevice = useCallback(
    (ip: string) => {
      // Check if device already exists - if so, don't re-add or re-connect
      // Use a ref check to avoid triggering on every render
      const existingWs = websocketsRef.current.get(ip)
      const isConnecting = connectingRef.current.has(ip)
      const existsInState = deviceStates.has(ip)

      if (existsInState || existingWs || isConnecting) {
        // Device already managed, skip
        return
      }

      setDeviceStates((prev) => {
        if (prev.has(ip)) return prev
        const newMap = new Map(prev)
        newMap.set(ip, initialDeviceState(ip))
        return newMap
      })
      // Reset retry count when adding a device
      retryCountRef.current.set(ip, 0)
      shouldReconnectRef.current.set(ip, autoReconnect)
      if (autoConnect) {
        connectDevice(ip)
      }
    },
    [autoConnect, autoReconnect, connectDevice, deviceStates]
  )

  // Remove a device
  const removeDevice = useCallback(
    (ip: string) => {
      disconnectDevice(ip)
      setDeviceStates((prev) => {
        const newMap = new Map(prev)
        newMap.delete(ip)
        return newMap
      })
    },
    [disconnectDevice]
  )

  // Retry device connection (resets retry count)
  const retryDevice = useCallback(
    (ip: string) => {
      // Reset retry count
      retryCountRef.current.set(ip, 0)
      shouldReconnectRef.current.set(ip, autoReconnect)
      // Clear any pending reconnect
      clearDeviceTimeouts(ip)
      // Close existing connection if any
      const existingWs = websocketsRef.current.get(ip)
      if (existingWs) {
        existingWs.close()
        websocketsRef.current.delete(ip)
      }
      // Attempt fresh connection
      connectDevice(ip)
    },
    [autoReconnect, clearDeviceTimeouts, connectDevice]
  )

  // Get connection for a device
  const getConnection = useCallback(
    (ip: string): DeviceConnection | undefined => {
      const state = deviceStates.get(ip)
      if (!state) return undefined

      return {
        state,
        ws: websocketsRef.current.get(ip) || null,
        connect: () => connectDevice(ip),
        disconnect: () => disconnectDevice(ip),
        send: (msg) => sendToDevice(ip, msg),
        getStatus: () => sendToDevice(ip, { op: OpCode.GET_STATUS, type: 'get_status' }),
        updateConfig: (config) =>
          sendToDevice(ip, { op: OpCode.CONFIG_UPDATE, type: 'config_update', ...config }),
        sendGameCommand: (command) => {
          const commandEnum =
            command === 'start'
              ? GameCommandType.START
              : command === 'stop'
                ? GameCommandType.STOP
                : GameCommandType.RESET
          return sendToDevice(ip, {
            op: OpCode.GAME_COMMAND,
            type: 'game_command',
            command: commandEnum,
          })
        },
        forwardHit: (shooterId) =>
          sendToDevice(ip, { op: OpCode.HIT_FORWARD, type: 'hit_forward', shooter_id: shooterId }),
        confirmKill: () => sendToDevice(ip, { op: OpCode.KILL_CONFIRMED, type: 'kill_confirmed' }),
        playRemoteSound: (soundId) =>
          sendToDevice(ip, { op: OpCode.REMOTE_SOUND, type: 'remote_sound', sound_id: soundId }),
      }
    },
    [deviceStates, connectDevice, disconnectDevice, sendToDevice]
  )

  // Get device state
  const getDeviceState = useCallback((ip: string) => deviceStates.get(ip), [deviceStates])

  // Check if device is connected
  const isDeviceConnected = useCallback(
    (ip: string) => deviceStates.get(ip)?.connectionState === 'connected',
    [deviceStates]
  )

  // Connect all devices
  const connectAll = useCallback(() => {
    deviceStates.forEach((_, ip) => connectDevice(ip))
  }, [deviceStates, connectDevice])

  // Disconnect all devices
  const disconnectAll = useCallback(() => {
    deviceStates.forEach((_, ip) => disconnectDevice(ip))
  }, [deviceStates, disconnectDevice])

  // Broadcast command to all connected devices
  const broadcastCommand = useCallback(
    (command: 'start' | 'stop' | 'reset') => {
      deviceStates.forEach((state, ip) => {
        if (state.connectionState === 'connected') {
          const commandEnum =
            command === 'start'
              ? GameCommandType.START
              : command === 'stop'
                ? GameCommandType.STOP
                : GameCommandType.RESET
          sendToDevice(ip, {
            op: OpCode.GAME_COMMAND,
            type: 'game_command',
            command: commandEnum,
          })
        }
      })
    },
    [deviceStates, sendToDevice]
  )

  // Broadcast configuration to all connected devices
  const broadcastConfig = useCallback(
    (config: Omit<ConfigUpdateMessage, 'type' | 'op'>) => {
      deviceStates.forEach((state, ip) => {
        if (state.connectionState === 'connected') {
          sendToDevice(ip, {
            op: OpCode.CONFIG_UPDATE,
            type: 'config_update',
            ...config,
          })
        }
      })
    },
    [deviceStates, sendToDevice]
  )

  // Get all connected device states
  const connectedDevices = useMemo(
    () => Array.from(deviceStates.values()).filter((s) => s.connectionState === 'connected'),
    [deviceStates]
  )

  // Build connections map
  const connections = useMemo(() => {
    const map = new Map<string, DeviceConnection>()
    deviceStates.forEach((_, ip) => {
      const conn = getConnection(ip)
      if (conn) map.set(ip, conn)
    })
    return map
  }, [deviceStates, getConnection])

  // Initialize connections for initial devices
  useEffect(() => {
    isMountedRef.current = true

    if (autoConnect) {
      initialDevices.forEach((ip) => {
        if (!websocketsRef.current.has(ip) && !connectingRef.current.has(ip)) {
          connectDevice(ip)
        }
      })
    }

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false
      // Clear all connecting flags
      connectingRef.current.clear()

      websocketsRef.current.forEach((ws, ip) => {
        shouldReconnectRef.current.set(ip, false)
        ws.close()
      })
      reconnectTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
      connectionTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
      heartbeatIntervalsRef.current.forEach((interval) => clearInterval(interval))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value: DeviceConnectionsContextValue = {
    connections,
    addDevice,
    removeDevice,
    getConnection,
    getDeviceState,
    isDeviceConnected,
    retryDevice,
    connectAll,
    disconnectAll,
    broadcastCommand,
    broadcastConfig,
    connectedDevices,
    onHitReport,
    onShotFired,
    onStatusUpdate,
    subscribe: subscribe, // Make sure this is exposed!
  }

  return (
    <DeviceConnectionsContext.Provider value={value}>{children}</DeviceConnectionsContext.Provider>
  )
}
