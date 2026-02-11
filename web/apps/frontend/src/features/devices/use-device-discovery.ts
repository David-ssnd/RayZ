/**
 * Device Discovery Hook
 * 
 * Subscribes to device discovery events from the WS Bridge
 * and manages the list of discovered devices.
 */

import { useEffect, useState, useCallback } from 'react'

export interface DiscoveredDevice {
  ip: string
  hostname: string
  role: 'weapon' | 'target' | 'unknown'
  deviceId?: number
  playerId?: number
  version?: string
  discoveredAt: Date
  signalStrength?: number
}

export function useDeviceDiscovery() {
  const [discovering, setDiscovering] = useState(false)
  const [devices, setDevices] = useState<DiscoveredDevice[]>([])
  const [error, setError] = useState<string | null>(null)

  // Connect to WS Bridge and listen for discovery events
  useEffect(() => {
    if (!discovering) return

    let ws: WebSocket | null = null

    try {
      // Connect to WS Bridge
      const wsUrl = process.env.NEXT_PUBLIC_LOCAL_WS_URL || 'ws://localhost:8080'
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('[Discovery] Connected to WS Bridge')
        setError(null)
        
        // Request discovery scan
        ws?.send(JSON.stringify({
          type: 'scan_network',
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'device_discovered') {
            const device: DiscoveredDevice = {
              ...message.device,
              discoveredAt: new Date(),
            }
            
            // Add or update device in list
            setDevices((prev) => {
              const existing = prev.find((d) => d.ip === device.ip)
              if (existing) {
                // Update existing device
                return prev.map((d) =>
                  d.ip === device.ip ? { ...d, ...device } : d
                )
              } else {
                // Add new device
                return [...prev, device]
              }
            })
          } else if (message.type === 'device_lost') {
            // Remove device from list
            setDevices((prev) =>
              prev.filter((d) => d.ip !== message.device.ip)
            )
          }
        } catch (err) {
          console.error('[Discovery] Failed to parse message:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('[Discovery] WebSocket error:', event)
        setError('Failed to connect to WS Bridge. Is it running?')
      }

      ws.onclose = () => {
        console.log('[Discovery] Disconnected from WS Bridge')
      }
    } catch (err) {
      console.error('[Discovery] Failed to initialize:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }

    return () => {
      ws?.close()
    }
  }, [discovering])

  const startDiscovery = useCallback(() => {
    setDiscovering(true)
    setDevices([])
    setError(null)
  }, [])

  const stopDiscovery = useCallback(() => {
    setDiscovering(false)
  }, [])

  const clearDevices = useCallback(() => {
    setDevices([])
  }, [])

  return {
    discovering,
    devices,
    error,
    startDiscovery,
    stopDiscovery,
    clearDevices,
  }
}
