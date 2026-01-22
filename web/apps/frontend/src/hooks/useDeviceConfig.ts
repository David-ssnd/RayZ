/**
 * Hook for sending device configuration
 * 
 * Provides functions to send configuration to ESP32 devices
 * with automatic building from project data
 */

import { useState, useCallback } from 'react'
import { useGameCommContext } from '@/lib/comm/GameCommContext'
import { DeviceConfigManager } from '@/lib/comm/DeviceConfigManager'
import type { Device, Project } from '@/components/project-manager/types'

export interface ConfigStatus {
  status: 'idle' | 'sending' | 'success' | 'error'
  message?: string
}

export function useDeviceConfig(project: Project) {
  const { comm } = useGameCommContext()
  const [configManager] = useState(() => new DeviceConfigManager(comm))
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
      deviceName: device.name || `Device ${device.id}`,
      deviceId: parseInt(device.id) || 0,
      playerId: player?.id ? parseInt(player.id) : undefined,
      teamId: team?.id ? parseInt(team.id) : 0,
      colorRgb: team?.color ? parseInt(team.color.replace('#', ''), 16) : 0xFFFFFF,
      
      enableHearts: gameSettings?.enableHearts ?? true,
      maxHearts: gameSettings?.maxHearts ?? 10,
      spawnHearts: gameSettings?.spawnHearts ?? 10,
      respawnTimeS: gameSettings?.respawnTimeSec ?? 5,
      friendlyFire: gameSettings?.friendlyFire ?? false,
      
      enableAmmo: gameSettings?.enableAmmo ?? true,
      maxAmmo: gameSettings?.maxAmmo ?? 100,
      reloadTimeMs: gameSettings?.reloadTimeMs ?? 2000,
      
      gameDurationS: gameSettings?.durationSeconds ?? 300,
      
      irPower: 1,
      volume: 80,
      hapticEnabled: true,
    }
  }, [project])

  const buildEspNowPeers = useCallback((currentDevice: Device): string[] => {
    const devices = project.devices || []
    return devices
      .filter((d) => d.id !== currentDevice.id)
      .map((d: any) => d.macAddress)
      .filter(Boolean) as string[]
  }, [project.devices])

  const sendToDevice = useCallback(async (device: Device): Promise<boolean> => {
    const deviceIp = device.ipAddress || device.id
    setStatuses((prev) => new Map(prev).set(deviceIp, { status: 'sending' }))

    try {
      const config = buildDeviceConfig(device)
      const peers = buildEspNowPeers(device)

      configManager.setDeviceInfo(deviceIp, {
        name: config.deviceName,
        deviceId: config.deviceId,
        playerId: config.playerId,
        teamId: config.teamId,
        color: config.colorRgb,
      })

      configManager.setGameRules(deviceIp, {
        enableHearts: config.enableHearts,
        maxHearts: config.maxHearts,
        spawnHearts: config.spawnHearts,
        respawnTimeS: config.respawnTimeS,
        friendlyFire: config.friendlyFire,
        enableAmmo: config.enableAmmo,
        maxAmmo: config.maxAmmo,
        reloadTimeMs: config.reloadTimeMs,
        gameDurationS: config.gameDurationS,
      })

      configManager.setHardwareSettings(deviceIp, {
        irPower: config.irPower,
        volume: config.volume,
        hapticEnabled: config.hapticEnabled,
      })

      if (peers.length > 0) {
        configManager.setEspNowPeers(deviceIp, peers)
      }

      const success = await configManager.sendFullConfig(deviceIp)
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
  }, [buildDeviceConfig, buildEspNowPeers, configManager])

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
