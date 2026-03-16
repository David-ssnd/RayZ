'use client'

import { useTransition } from 'react'
import { removeDeviceFromProject } from '@/features/projects/actions'
import { DiscoveryPanel } from '@/features/devices/DiscoveryPanel'
import { Trash2, Send, Loader2, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useDeviceConfig } from '@/hooks/useDeviceConfig'

import { DeviceConnectionCard } from './DeviceConnectionCard'
import { Device, Player, Project, Team } from './types'

interface ProjectDeviceManagerInnerProps {
  project: Project
  disabled?: boolean
}

function ProjectDeviceManagerInner({ project, disabled = false }: ProjectDeviceManagerInnerProps) {
  const [isPending, startTransition] = useTransition()
  const { sendToDevice, getStatus } = useDeviceConfig(project)

  // Helper to find player assigned to a device
  const getAssignedPlayer = (deviceId: string): Player | null => {
    const device = project.devices?.find((d: Device) => d.id === deviceId)
    if (!device?.assignedPlayerId) return null
    return project.players?.find((p: Player) => p.id === device.assignedPlayerId) || null
  }

  // Helper to get team for a player
  const getPlayerTeam = (player: Player | null): Team | null => {
    if (!player?.teamId) return null
    return project.teams?.find((t: Team) => t.id === player.teamId) || null
  }

  const handleRemoveDevice = (deviceId: string) => {
    startTransition(async () => {
      await removeDeviceFromProject(deviceId)
    })
  }

  return (
    <div className="space-y-4">
      <DiscoveryPanel projectId={project.id} />

      {disabled && (
        <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
          Device management is disabled while the game is running.
        </div>
      )}

      {/* Device Cards Grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {project.devices?.map((device: Device) => {
          const assignedPlayer = getAssignedPlayer(device.id)
          const playerTeam = getPlayerTeam(assignedPlayer)
          const configStatus = getStatus(device.ipAddress || device.id)

          return (
            <div key={device.id} className="relative group">
              <DeviceConnectionCard
                deviceId={device.id}
                deviceNumericId={device.deviceId}
                deviceRole={device.role}
                ipAddress={device.ipAddress}
                deviceName={device.name ?? device.role + ' ' + device.ipAddress}
                assignedPlayer={assignedPlayer}
                playerTeam={playerTeam}
                teams={project.teams}
                gameMode={project.gameMode}
                allPlayers={project.players}
                onRemove={() => handleRemoveDevice(device.id)}
              />
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 gap-1 px-2"
                  onClick={() => sendToDevice(device)}
                  disabled={configStatus.status === 'sending'}
                  title="Send configuration to device"
                >
                  {configStatus.status === 'sending' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : configStatus.status === 'success' ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  <span className="text-xs hidden sm:inline">Config</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleRemoveDevice(device.id)}
                  disabled={disabled}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {(!project.devices || project.devices.length === 0) && (
        <div className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
          No devices in this project. Devices are automatically added when discovered on the network.
        </div>
      )}
    </div>
  )
}

export function ProjectDeviceManager({
  project,
  disabled = false,
}: {
  project: Project
  disabled?: boolean
}) {
  return <ProjectDeviceManagerInner project={project} disabled={disabled} />
}
