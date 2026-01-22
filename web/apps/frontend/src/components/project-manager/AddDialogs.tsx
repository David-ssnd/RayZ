'use client'

import { useState, useTransition } from 'react'
import { addDevice } from '@/features/devices/actions'
import { addDeviceToProject, addPlayer, addTeam } from '@/features/projects/actions'
import { Gamepad2, Monitor, Plus, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { IpAddressInput } from '../IpAddressInput'
import { DEFAULT_PLAYER_ID, Device, MAX_PLAYER_ID, MIN_PLAYER_ID, Project, Team } from './types'

// ==================== ADD TEAM DIALOG ====================

interface AddTeamDialogProps {
  projectId: string
  trigger?: React.ReactNode
}

export function AddTeamDialog({ projectId, trigger }: AddTeamDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#ff0000')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!name) return
    startTransition(async () => {
      await addTeam(projectId, name, color)
      setName('')
      setColor('#ff0000')
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Users className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team</DialogTitle>
          <DialogDescription>Create a new team for this project.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Team Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Red Team"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 p-1 h-10"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1"
                placeholder="#ff0000"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name}>
            Add Team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== ADD PLAYER DIALOG ====================

interface AddPlayerDialogProps {
  project: Project
  trigger?: React.ReactNode
}

export function AddPlayerDialog({ project, trigger }: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [playerNumberStr, setPlayerNumberStr] = useState(String(DEFAULT_PLAYER_ID))
  const [teamId, setTeamId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const players = project.players || []
  const currentPlayerId = parseInt(playerNumberStr) || 0
  const isDuplicateId = players.some((p) => p.number === currentPlayerId)
  const isDuplicateName =
    name.trim().length > 0 &&
    players.some((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase())

  const handleSubmit = () => {
    if (!name.trim() || isDuplicateId || isDuplicateName) return
    startTransition(async () => {
      await addPlayer(project.id, name.trim(), currentPlayerId)
      setName('')
      setPlayerNumberStr(String(DEFAULT_PLAYER_ID))
      setTeamId(null)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Gamepad2 className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Player</DialogTitle>
          <DialogDescription>Create a new player for this project.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Player Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player 1"
              autoFocus
              className={isDuplicateName ? 'border-destructive' : ''}
            />
            {isDuplicateName && (
              <p className="text-xs text-destructive">A player with this name already exists</p>
            )}
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Player ID (0-255)</label>
            <Input
              type="number"
              min={MIN_PLAYER_ID}
              max={MAX_PLAYER_ID}
              value={playerNumberStr}
              onChange={(e) => setPlayerNumberStr(e.target.value)}
              className={isDuplicateId ? 'border-destructive' : ''}
            />
            {isDuplicateId && <p className="text-xs text-destructive">This ID is already in use</p>}
          </div>
          {project.teams?.length > 0 && (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Team (Optional)</label>
              <Select
                value={teamId || 'none'}
                onValueChange={(v) => setTeamId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Team</SelectItem>
                  {project.teams.map((team: Team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name.trim() || isDuplicateId || isDuplicateName}
          >
            Add Player
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== ADD DEVICE DIALOG ====================

interface AddDeviceDialogProps {
  project: Project
  availableDevices: Device[]
  trigger?: React.ReactNode
}

export function AddDeviceDialog({ project, availableDevices, trigger }: AddDeviceDialogProps) {
  const [open, setOpen] = useState(false)
  const [ipAddress, setIpAddress] = useState('')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filter devices that are NOT in this project
  const devicesToAdd = availableDevices.filter((d: Device) => d.projectId !== project.id)

  // Check if IP already exists in project
  const isIpDuplicate = (ip: string): boolean => {
    return project.devices?.some((d: Device) => d.ipAddress === ip) || false
  }

  const handleAddNewDevice = () => {
    if (!ipAddress) return
    setError(null)

    if (isIpDuplicate(ipAddress)) {
      setError(`Device with IP ${ipAddress} already exists in this project`)
      return
    }

    startTransition(async () => {
      const res = await addDevice(ipAddress)
      if (res.success && res.device) {
        await addDeviceToProject(project.id, res.device.id)
        setIpAddress('')
        setOpen(false)
      } else {
        setError(res.error || 'Failed to add device')
      }
    })
  }

  const handleAddFromInventory = () => {
    if (!selectedDeviceId) return
    setError(null)

    const selectedDevice = devicesToAdd.find((d) => d.id === selectedDeviceId)
    if (selectedDevice && isIpDuplicate(selectedDevice.ipAddress)) {
      setError(`Device with IP ${selectedDevice.ipAddress} already exists`)
      return
    }

    startTransition(async () => {
      await addDeviceToProject(project.id, selectedDeviceId)
      setSelectedDeviceId(null)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Monitor className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Device</DialogTitle>
          <DialogDescription>Add a new device or select from your inventory.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Add by IP */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Add Device by IP</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <IpAddressInput
                  value={ipAddress}
                  onChange={(v) => {
                    setIpAddress(v)
                    setError(null)
                  }}
                />
              </div>
              <Button onClick={handleAddNewDevice} disabled={isPending || !ipAddress}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Add from inventory */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Add from Inventory</label>
            <Select
              value={selectedDeviceId || ''}
              onValueChange={(v) => setSelectedDeviceId(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a device" />
              </SelectTrigger>
              <SelectContent>
                {devicesToAdd.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No available devices
                  </SelectItem>
                ) : (
                  devicesToAdd.map((device: Device) => (
                    <SelectItem key={device.id} value={device.id}>
                      <div className="flex items-center gap-2">
                        <Monitor className="w-3 h-3" />
                        {device.name || device.ipAddress}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {devicesToAdd.length > 0 && (
              <Button
                onClick={handleAddFromInventory}
                disabled={isPending || !selectedDeviceId}
                variant="outline"
                className="w-full"
              >
                Add from Inventory
              </Button>
            )}
          </div>

          {/* Error Message */}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
