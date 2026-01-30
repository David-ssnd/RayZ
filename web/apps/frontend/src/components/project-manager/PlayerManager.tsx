'use client'

import { useState, useTransition } from 'react'
import {
  addPlayer,
  removePlayer,
  updatePlayer,
  updatePlayerDevices,
  updatePlayerTeam,
} from '@/features/projects/actions'
import { AlertCircle, Edit2, Monitor, Plus, Trash2, X } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  DEFAULT_PLAYER_ID,
  Device,
  MAX_PLAYER_ID,
  MIN_PLAYER_ID,
  Player,
  Project,
  Team,
} from './types'

export function PlayerManager({ 
  project, 
  devices,
  disabled = false 
}: { 
  project: Project; 
  devices: Device[];
  disabled?: boolean;
}) {
  const [name, setName] = useState('')
  // Allow string temporarily to prevent input jumping, parse on submit
  const [playerNumberStr, setPlayerNumberStr] = useState(String(DEFAULT_PLAYER_ID))

  const [isPending, startTransition] = useTransition()
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNumericId, setEditNumericId] = useState(DEFAULT_PLAYER_ID)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const players = project.players || []
  const trimmedName = name.trim()
  const currentPlayerId = parseInt(playerNumberStr) || 0
  const isDuplicateId = players.some((p) => p.number === currentPlayerId)
  const isDuplicateName =
    trimmedName.length > 0 &&
    players.some((p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase())

  const handleActionResult = (result: { error?: string } | void) => {
    const message =
      result && typeof result === 'object' && 'error' in result ? result.error : null
    if (message) {
      setErrorMessage(message)
      return false
    }
    setErrorMessage(null)
    return true
  }

  // Get devices assigned to a specific player
  const getPlayerDevices = (player: Player): Device[] => {
    return devices.filter((d: Device) => d.assignedPlayerId === player.id)
  }

  // Get available devices (not assigned to any player)
  const getAvailableDevices = (): Device[] => {
    return devices.filter((d: Device) => !d.assignedPlayerId)
  }

  const handleAdd = () => {
    if (!trimmedName || isDuplicateId || isDuplicateName || disabled) return

    startTransition(async () => {
      const result = await addPlayer(project.id, trimmedName, currentPlayerId)
      if (!handleActionResult(result)) return
      setName('')
      setPlayerNumberStr(String(DEFAULT_PLAYER_ID))
    })
  }

  const startEditing = (player: Player) => {
    setEditingPlayerId(player.id)
    setEditName(player.name)
    setEditNumericId(player.number)
  }

  const saveEdit = () => {
    if (!editingPlayerId || !editName) return
    startTransition(async () => {
      const result = await updatePlayer(editingPlayerId, {
        name: editName,
        number: editNumericId,
      })
      if (!handleActionResult(result)) return
      setEditingPlayerId(null)
    })
  }

  const handleTeamChange = (playerId: string, teamId: string) => {
    startTransition(async () => {
      const result = await updatePlayerTeam(playerId, teamId === 'none' ? null : teamId)
      handleActionResult(result)
    })
  }

  const handleAddDevice = (playerId: string, deviceId: string) => {
    const player = players.find((p: Player) => p.id === playerId)
    if (!player) return

    const currentDeviceIds = getPlayerDevices(player).map((d) => d.id)
    if (currentDeviceIds.includes(deviceId)) return

    startTransition(async () => {
      const result = await updatePlayerDevices(playerId, [...currentDeviceIds, deviceId])
      handleActionResult(result)
    })
  }

  const handleRemoveDevice = (playerId: string, deviceId: string) => {
    const player = players.find((p: Player) => p.id === playerId)
    if (!player) return

    const newDeviceIds = getPlayerDevices(player)
      .map((d) => d.id)
      .filter((id: string) => id !== deviceId)
    startTransition(async () => {
      const result = await updatePlayerDevices(playerId, newDeviceIds)
      handleActionResult(result)
    })
  }

  return (
    <div className="space-y-4 relative">
      {disabled && (
        <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
          Player editing is disabled while the game is running.
        </div>
      )}
      {/* Add Player Form */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player Name"
          className={`flex-1 ${isDuplicateName ? 'border-destructive text-destructive' : ''}`}
          disabled={disabled}
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">ID:</label>
          <Input
            type="number"
            min={MIN_PLAYER_ID}
            max={MAX_PLAYER_ID}
            value={playerNumberStr}
            onChange={(e) => setPlayerNumberStr(e.target.value)}
            className={`w-20 ${isDuplicateId ? 'border-destructive text-destructive' : ''}`}
            disabled={disabled}
          />
        </div>
        <Button
          onClick={handleAdd}
          disabled={isPending || !trimmedName || isDuplicateId || isDuplicateName || disabled}
        >
          Add Player
        </Button>
      </div>

      {/* Players List */}
      <div className="grid gap-3">
        {players.map((player: Player) => {
          const playerDevices = getPlayerDevices(player)
          const availableDevices = getAvailableDevices()
          const playerTeam = project.teams?.find((t: Team) => t.id === player.teamId)

          return (
            <div
              key={player.id}
              className="p-3 border rounded-md space-y-3"
              style={{
                borderLeftColor: playerTeam?.color,
                borderLeftWidth: playerTeam ? '4px' : undefined,
              }}
            >
              {/* Player Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {editingPlayerId === player.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 flex-1"
                      placeholder="Name"
                    />
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground">ID:</label>
                      <Input
                        type="number"
                        min={MIN_PLAYER_ID}
                        max={MAX_PLAYER_ID}
                        value={editNumericId}
                        onChange={(e) => setEditNumericId(parseInt(e.target.value) || 0)}
                        className="w-16 h-8"
                      />
                    </div>
                    <Button size="sm" onClick={saveEdit} disabled={isPending}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingPlayerId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{player.name}</span>
                    <Badge variant="outline" className="text-xs">
                      ID: {player.number ?? DEFAULT_PLAYER_ID}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => startEditing(player)}
                      disabled={disabled}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Select
                    value={player.teamId || 'none'}
                    onValueChange={(val) => handleTeamChange(player.id, val)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Team</SelectItem>
                      {project.teams?.map((team: Team) => (
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

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={disabled}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await removePlayer(player.id)
                        handleActionResult(result)
                      })
                    }
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Player Devices */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Devices:</span>
                {playerDevices.map((device: Device) => (
                  <Badge key={device.id} variant="secondary" className="gap-1 pr-1">
                    <Monitor className="w-3 h-3" />
                    {device.name || device.ipAddress}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                      onClick={() => handleRemoveDevice(player.id, device.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}

                {availableDevices.length > 0 && (
                  <Select value="" onValueChange={(val) => handleAddDevice(player.id, val)}>
                    <SelectTrigger className="w-auto h-7 gap-1 text-xs">
                      <Plus className="w-3 h-3" />
                      <span>Add Device</span>
                    </SelectTrigger>
                    <SelectContent>
                      {availableDevices.map((device: Device) => (
                        <SelectItem key={device.id} value={device.id}>
                          <div className="flex items-center gap-2">
                            <Monitor className="w-3 h-3" />
                            {device.name || device.ipAddress}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {playerDevices.length === 0 && availableDevices.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No devices available</span>
                )}
              </div>
            </div>
          )
        })}

        {players.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No players added yet.
          </div>
        )}
      </div>

      {/* Fixed Position Alert */}
      {errorMessage && (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm animate-in slide-in-from-bottom-5 fade-in-0">
          <Alert
            variant="destructive"
            className="bg-destructive/10 border-destructive/20 shadow-lg backdrop-blur-sm"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="block">{errorMessage}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
