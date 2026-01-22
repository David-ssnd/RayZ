/**
 * Hook for sending device configuration
 * 
 * Provides functions to send configuration to ESP32 devices
 * with automatic building from project data
 */

import { useState, useCallback } from 'react'
import { useDeviceConnections } from '@/lib/websocket/DeviceConnectionContext'
import type { Device, Project } from '@/components/project-manager/types'

export interface ConfigStatus {
  status: 'idle' | 'sending' | 'success' | 'error'
  message?: string
}

export function useDeviceConfig(project: Project) {
  const { broadcastConfig, connections } = useDeviceConnections()
  const [statuses, setStatuses] = useState<Map<string, ConfigStatus>>(new Map())

  /**
   * Build configuration for a device from project data
   */
  const buildDeviceConfig = useCallback((device: Device) => {
    const player = (project.players || []).find((p) =>
      p.devices && Array.isArray(p.devices) && p.devices.some((d: any) => d.id === device.id)
    )
    const team = player ? (project.teams || []).find((t) => t.id === player.teamId) : undefined
    const gameSettings = project.gameMode

    return {
      device_id: parseInt(device.id) || 0,
      player_id: player?.id ? parseInt(player.id) : 0,
      team_id: team?.id ? parseInt(team.id) : 0,
      color_rgb: team?.color ? parseInt(team.color.replace('#', ''), 16) : 0xFFFFFF,
      device_name: device.name || `Device ${device.id}`,
      
      max_hearts: gameSettings?.maxHearts ?? 10,
      spawn_hearts: gameSettings?.spawnHearts ?? 10,
      respawn_time_s: gameSettings?.respawnTimeSec ?? 5,
      friendly_fire: gameSettings?.friendlyFire ?? false,
      
      enable_ammo: gameSettings?.enableAmmo ?? true,
      max_ammo: gameSettings?.maxAmmo ?? 100,
      reload_time_ms: gameSettings?.reloadTimeMs ?? 2000,
      
      game_duration_s: gameSettings?.durationSeconds ?? 300,
    }
  }, [project])

  const buildEspNowPeers = useCallback((currentDevice: Device): string => {
    const devices = project.devices || []
    const macAddresses = devices
      .filter((d) => d.id !== currentDevice.id && d.macAddress)
      .map((d: any) => d.macAddress)
      .filter(Boolean)
    
    return macAddresses.join(',') // CSV format expected by ESP32
  }, [project.devices])

  const sendToDevice = useCallback(async (device: Device): Promise<boolean> => {
    const deviceIp = device.ipAddress
    if (!deviceIp) {
      console.warn(`Device ${device.id} has no IP address`)
      return false
    }

    setStatuses((prev) => new Map(prev).set(deviceIp, { status: 'sending' }))

    try {
      const config = buildDeviceConfig(device)
      const peers = buildEspNowPeers(device)
      
      // Add ESP-NOW peers to config if available
      const configWithPeers = peers ? { ...config, espnow_peers: peers } : config
      
      const connection = connections.get(deviceIp)
      if (!connection) {
        throw new Error(`No connection found for ${deviceIp}`)
      }

      const success = connection.updateConfig(configWithPeers)
      
      setStatuses((prev) => 
        new Map(prev).set(deviceIp, {
          status: success ? 'success' : 'error',
          message: success ? 'Configuration sent' : 'Failed to send',
        })
      )
      return success
    } catch (error) {
      console.error('Failed to send config:', error)
      setStatuses((prev) =>
        new Map(prev).set(deviceIp, {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      )
      return false
    }
  }, [buildDeviceConfig, buildEspNowPeers, connections])

  const sendToAllDevices = useCallback(async (): Promise<{ sent: number; failed: number }> => {
    const devices = project.devices || []
    let sent = 0
    let failed = 0

    for (const device of devices) {
      const success = await sendToDevice(device)
      if (success) sent++
      else failed++
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    return { sent, failed }
  }, [project.devices, sendToDevice])

  const getStatus = useCallback((deviceIp: string): ConfigStatus => {
    return statuses.get(deviceIp) || { status: 'idle' }
  }, [statuses])

  const clearStatuses = useCallback(() => {
    setStatuses(new Map())
  }, [])

  return {
    sendToDevice,
    sendToAllDevices,
    getStatus,
    clearStatuses,
    hasDevices: (project.devices?.length || 0) > 0,
  }
}
