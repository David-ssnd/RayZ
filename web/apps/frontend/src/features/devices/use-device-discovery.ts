'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export interface DiscoveredDevice {
  ip: string
  hostname: string
  role: 'weapon' | 'target' | 'unknown'
  deviceId?: number
  playerId?: number
  version?: string
  connected: boolean
  discoveredAt: Date
}

export function useDeviceDiscovery() {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelay = useRef(1000)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return

    try {
      const wsUrl = process.env.NEXT_PUBLIC_LOCAL_WS_URL || 'ws://localhost:8080'
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setError(null)
        reconnectDelay.current = 1000
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          if (msg.type === 'device_list') {
            setDevices(
              (msg.devices || []).map((d: any) => ({
                ip: d.ip,
                hostname: d.hostname || d.ip,
                role: d.role || 'unknown',
                deviceId: d.deviceId,
                playerId: d.playerId,
                version: d.version,
                connected: d.connected ?? false,
                discoveredAt: new Date(),
              }))
            )
          } else if (msg.type === 'device_discovered') {
            const d = msg.device
            setDevices((prev) => {
              const existing = prev.find((x) => x.ip === d.ip)
              if (existing) {
                return prev.map((x) =>
                  x.ip === d.ip
                    ? { ...x, ...d, connected: x.connected, discoveredAt: x.discoveredAt }
                    : x
                )
              }
              return [
                ...prev,
                {
                  ip: d.ip,
                  hostname: d.hostname || d.ip,
                  role: d.role || 'unknown',
                  deviceId: d.deviceId,
                  playerId: d.playerId,
                  version: d.version,
                  connected: false,
                  discoveredAt: new Date(),
                },
              ]
            })
          } else if (msg.type === 'device_connected') {
            setDevices((prev) =>
              prev.map((d) => (d.ip === msg.ip ? { ...d, connected: true } : d))
            )
          } else if (msg.type === 'device_disconnected') {
            setDevices((prev) =>
              prev.map((d) => (d.ip === msg.ip ? { ...d, connected: false } : d))
            )
          } else if (msg.type === 'device_lost') {
            setDevices((prev) => prev.filter((d) => d.ip !== msg.device?.ip))
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onerror = () => {
        setError('Cannot connect to WS Bridge')
      }

      ws.onclose = () => {
        setConnected(false)
        wsRef.current = null
        // Auto-reconnect with backoff
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 10000)
          connect()
        }, reconnectDelay.current)
      }
    } catch {
      setError('Failed to initialize WebSocket')
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      reconnectTimer.current && clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { devices, connected, error }
}
