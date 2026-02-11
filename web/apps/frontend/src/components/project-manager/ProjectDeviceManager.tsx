'use client'

import { useState, useTransition } from 'react'
import { addDevice } from '@/features/devices/actions'
import { addDeviceToProject, removeDeviceFromProject } from '@/features/projects/actions'
import { AlertCircle, Plus, Trash2, Send, Loader2, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDeviceConfig } from '@/hooks/useDeviceConfig'

import { IpAddressInput } from '../IpAddressInput'
import { DeviceConnectionCard } from './DeviceConnectionCard'
import { DiscoveryPanel } from '@/features/devices/DiscoveryPanel'
import { Device, Player, Project, Team } from './types'

interface ProjectDeviceManagerInnerProps {
  project: Project
  availableDevices: Device[]
  disabled?: boolean
}

function ProjectDeviceManagerInner({ project, availableDevices, disabled = false }: ProjectDeviceManagerInnerProps) {
  const [isPending, startTransition] = useTransition()
  const [ipAddress, setIpAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { sendToDevice, getStatus } = useDeviceConfig(project)

  // Filter devices that are NOT in this project
  const devicesToAdd = availableDevices.filter((d: Device) => d.projectId !== project.id)

  // Check if IP already exists in project
  const isIpDuplicate = (ip: string): boolean => {
    return project.devices?.some((d: Device) => d.ipAddress === ip) || false
  }

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

  const handleAddNewDevice = () => {
    if (!ipAddress) return
    setError(null)

    // Check for duplicate IP
    if (isIpDuplicate(ipAddress)) {
      setError(`Device with IP ${ipAddress} already exists in this project`)
      return
    }

    startTransition(async () => {
      const res = await addDevice(ipAddress)
      if (res.success && res.device) {
        await addDeviceToProject(project.id, res.device.id)
        setIpAddress('')
      } else {
        setError(res.error || 'Failed to add device')
      }
    })
  }

  const handleRemoveDevice = (deviceId: string) => {
    startTransition(async () => {
      await removeDeviceFromProject(deviceId)
    })
  }

  return (
    <div className="space-y-4">
      {disabled && (
        <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
          Device management is disabled while the game is running.
        </div>
      )}
      
      {/* Device Discovery Panel */}
      <DiscoveryPanel projectId={project.id} />
      
      {/* Add Device Section */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-end gap-2 flex-1">
            <div className="grid gap-1.5 flex-1">
              <label className="text-sm font-medium">Add Device by IP</label>
              <IpAddressInput
                value={ipAddress}
                onChange={(v) => {
                  setIpAddress(v)
                  setError(null)
                }}
                disabled={disabled}
              />
            </div>
            <Button onClick={handleAddNewDevice} disabled={isPending || !ipAddress || disabled} size="icon" className="h-10 w-10 shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-end">
            <Select
              onValueChange={(val) => {
                // Check for duplicate IP from inventory
                const selectedDevice = devicesToAdd.find((d) => d.id === val)
                if (selectedDevice && isIpDuplicate(selectedDevice.ipAddress)) {
                  setError(`Device with IP ${selectedDevice.ipAddress} already exists`)
                  return
                }
                startTransition(async () => {
                  await addDeviceToProject(project.id, val)
                })
              }}
              disabled={disabled}
            >
              <SelectTrigger className="w-full sm:w-[200px] h-10">
                <SelectValue placeholder="Add from Inventory" />
              </SelectTrigger>
              <SelectContent>
                {devicesToAdd.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No available devices
                  </SelectItem>
                ) : (
                  devicesToAdd.map((device: Device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name || device.ipAddress}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

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
                ipAddress={device.ipAddress}
                deviceName={device.name ?? device.role + ' ' + device.ipAddress}
                assignedPlayer={assignedPlayer}
                playerTeam={playerTeam}
                teams={project.teams}
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
          No devices in this project. Add a device by IP address above.
        </div>
      )}
    </div>
  )
}

export function ProjectDeviceManager({
  project,
  availableDevices,
  disabled = false,
}: {
  project: Project
  availableDevices: Device[]
  disabled?: boolean
}) {
  // DeviceConnectionsProvider is now at ProjectManager level
  return <ProjectDeviceManagerInner project={project} availableDevices={availableDevices} disabled={disabled} />
}
