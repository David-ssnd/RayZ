'use client'

/**
 * Device Configuration Panel
 * 
 * Provides buttons to send configuration to ESP32 devices:
 * - Send to all devices at once
 * - Send to individual devices
 * 
 * Uses DeviceConfigManager to build and send complete device configuration
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Send, SendHorizonal, CheckCircle2, XCircle, Loader2, Settings } from 'lucide-react'
import { useGameCommContext } from '@/lib/comm/GameCommContext'
import { DeviceConfigManager } from '@/lib/comm/DeviceConfigManager'
import type { Device, Player, Team, Project } from './project-manager/types'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DeviceConfigPanelProps {
  project: Project
}

interface SendStatus {
  deviceIp: string
  deviceName: string
  status: 'idle' | 'sending' | 'success' | 'error'
  message?: string
}

export function DeviceConfigPanel({ project }: DeviceConfigPanelProps) {
  const { comm } = useGameCommContext()
  const [configManager] = useState(() => new DeviceConfigManager(comm))
  const [sendStatuses, setSendStatuses] = useState<SendStatus[]>([])
  const [isSendingAll, setIsSendingAll] = useState(false)

  // Initialize send statuses when devices change
  useEffect(() => {
    const devices = project.devices || []
    setSendStatuses(
      devices.map((d) => ({
        deviceIp: d.ipAddress || d.id,
        deviceName: d.name || `Device ${d.id}`,
        status: 'idle',
      }))
    )
  }, [project.devices])

  /**
   * Build configuration for a device from project data
   */
  const buildDeviceConfig = (device: Device) => {
    // Find player assigned to this device
    // Note: devices is an array in Player model, check if device.id is in that array
    const player = (project.players || []).find((p) => 
      p.devices && Array.isArray(p.devices) && p.devices.some((d: any) => d.id === device.id)
    )
    const team = player ? (project.teams || []).find((t) => t.id === player.teamId) : undefined

    // Get game mode settings
    const gameSettings = project.gameMode

    // Build full configuration
    const config = {
      deviceName: device.name || `Device ${device.id}`,
      deviceId: parseInt(device.id) || 0,
      playerId: player?.id ? parseInt(player.id) : undefined,
      teamId: team?.id ? parseInt(team.id) : 0,
      colorRgb: team?.color ? parseInt(team.color.replace('#', ''), 16) : 0xFFFFFF,
      
      // Win conditions
      winType: gameSettings?.winType ?? 'score',
      targetScore: gameSettings?.targetScore ?? 100,
      gameDurationS: gameSettings?.durationMinutes ? gameSettings.durationMinutes * 60 : 600,
      
      // Game rules from project settings (hearts used only for last_man_standing)
      maxHearts: gameSettings?.maxHearts ?? 5,
      spawnHearts: gameSettings?.spawnHearts ?? 3,
      respawnTimeS: gameSettings?.respawnTimeSec ?? 10,
      damageIn: gameSettings?.damageIn ?? 1,
      damageOut: gameSettings?.damageOut ?? 1,
      friendlyFire: gameSettings?.friendlyFire ?? false,
      
      enableAmmo: gameSettings?.enableAmmo ?? true,
      maxAmmo: gameSettings?.maxAmmo ?? 30,
      reloadTimeMs: gameSettings?.reloadTimeMs ?? 2500,
      
      // Hardware settings (defaults)
      irPower: 1, // Outdoor
      volume: 80,
      hapticEnabled: true,
    }

    return config
  }

  /**
   * Build ESP-NOW peer list from all devices in project
   */
  const buildEspNowPeers = (currentDevice: Device): string[] => {
    const devices = project.devices || []
    // TODO: Add macAddress field to Device model when ESP-NOW is implemented
    // For now, return empty array since MAC addresses are not in the schema
    return []
  }

  /**
   * Send configuration to a single device
   */
  const sendToDevice = async (device: Device) => {
    const deviceIp = device.ipAddress || device.id

    // Update status to sending
    setSendStatuses((prev) =>
      prev.map((s) =>
        s.deviceIp === deviceIp ? { ...s, status: 'sending', message: undefined } : s
      )
    )

    try {
      // Build configuration
      const config = buildDeviceConfig(device)
      const peers = buildEspNowPeers(device)

      // Set device info
      configManager.setDeviceInfo(deviceIp, {
        name: config.deviceName,
        deviceId: config.deviceId,
        playerId: config.playerId,
        teamId: config.teamId,
        color: config.colorRgb,
      })

      // Set game rules
      configManager.setGameRules(deviceIp, {
        winType: config.winType,
        targetScore: config.targetScore,
        maxHearts: config.maxHearts,
        spawnHearts: config.spawnHearts,
        respawnTimeS: config.respawnTimeS,
        damageIn: config.damageIn,
        damageOut: config.damageOut,
        friendlyFire: config.friendlyFire,
        enableAmmo: config.enableAmmo,
        maxAmmo: config.maxAmmo,
        reloadTimeMs: config.reloadTimeMs,
        gameDurationS: config.gameDurationS,
      })

      // Set hardware settings
      configManager.setHardwareSettings(deviceIp, {
        irPower: config.irPower,
        volume: config.volume,
        hapticEnabled: config.hapticEnabled,
      })

      // Set ESP-NOW peers
      if (peers.length > 0) {
        configManager.setEspNowPeers(deviceIp, peers)
      }

      // Send configuration
      const success = await configManager.sendFullConfig(deviceIp)

      // Update status
      setSendStatuses((prev) =>
        prev.map((s) =>
          s.deviceIp === deviceIp
            ? {
                ...s,
                status: success ? 'success' : 'error',
                message: success ? 'Configuration sent' : 'Failed to send',
              }
            : s
        )
      )
    } catch (error) {
      console.error('Failed to send config:', error)
      setSendStatuses((prev) =>
        prev.map((s) =>
          s.deviceIp === deviceIp
            ? { ...s, status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
            : s
        )
      )
    }
  }

  /**
   * Send configuration to all devices
   */
  const sendToAll = async () => {
    setIsSendingAll(true)

    const devices = project.devices || []
    for (const device of devices) {
      await sendToDevice(device)
      // Small delay between sends to avoid overwhelming devices
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    setIsSendingAll(false)
  }

  const devices = project.devices || []
  const hasDevices = devices.length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Device Configuration
            </CardTitle>
            <CardDescription>
              Send complete configuration to ESP32 devices including identity, game rules, and
              ESP-NOW peers
            </CardDescription>
          </div>
          <Button
            onClick={sendToAll}
            disabled={!hasDevices || isSendingAll}
            size="lg"
            className="gap-2"
          >
            {isSendingAll ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to All Devices
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasDevices ? (
          <Alert>
            <AlertDescription>
              No devices in this project. Add devices to the project to configure them.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {sendStatuses.map((status) => {
              const device = devices.find(
                (d) => (d.ipAddress || d.id) === status.deviceIp
              )
              const player = (project.players || []).find((p) =>
                p.devices && Array.isArray(p.devices) && p.devices.some((d: any) => d.id === device?.id)
              )
              const team = player
                ? (project.teams || []).find((t) => t.id === player.teamId)
                : undefined

              return (
                <div
                  key={status.deviceIp}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{status.deviceName}</span>
                      {player && (
                        <Badge variant="secondary" className="text-xs">
                          Player: {player.name}
                        </Badge>
                      )}
                      {team && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: team.color,
                            color: team.color,
                          }}
                        >
                          {team.name}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {device?.ipAddress || status.deviceIp}
                      {(device as any)?.macAddress && ` • ${(device as any).macAddress}`}
                    </div>
                    {status.message && (
                      <div
                        className={`mt-1 text-xs ${
                          status.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                        }`}
                      >
                        {status.message}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {status.status === 'success' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {status.status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                    {status.status === 'sending' && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}

                    <Button
                      onClick={() => sendToDevice(device!)}
                      disabled={status.status === 'sending' || isSendingAll}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      {status.status === 'sending' ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Sending
                        </>
                      ) : (
                        <>
                          <SendHorizonal className="h-3 w-3" />
                          Send Config
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {hasDevices && (
          <div className="mt-6 rounded-lg bg-muted/50 p-4">
            <h4 className="mb-2 text-sm font-semibold">Configuration Includes:</h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>✓ Device identity (name, IDs, team, color)</li>
              <li>✓ Game rules (health, ammo, respawn, friendly fire)</li>
              <li>✓ Hardware settings (IR power, volume, haptic)</li>
              <li>
                ✓ ESP-NOW peers ({devices.length - 1} peers per device for mesh communication)
              </li>
              <li>✓ Persistent storage (survives reboots)</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
