'use client'

import { useEffect, useRef, useState, useTransition } from 'react' // added useTransition
import { updateDevice } from '@/features/devices/actions' // Import action
import {
  Activity,
  AlertCircle,
  Check,
  Disc,
  Gamepad2,
  Link,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Unlink,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { initialDeviceState, useDevice, useDeviceConnections } from '@/lib/websocket'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input' // added Input

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Assumes types match your new Prisma Schema where 'number' is the 0-255 Protocol ID
import type { Player, Team } from './types'

interface DeviceConnectionCardProps {
  deviceId?: string // added deviceId
  ipAddress: string
  deviceName?: string
  assignedPlayer?: Player | null
  playerTeam?: Team | null
  teams?: Team[]
  onRemove?: () => void
}

export function DeviceConnectionCard({
  deviceId, // destructured
  ipAddress,
  deviceName: initialName,
  assignedPlayer,
  playerTeam,
  teams = [],
}: DeviceConnectionCardProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [editName, setEditName] = useState(initialName || ipAddress) // Name state
  const [configTeamId, setConfigTeamId] = useState<number | undefined>(undefined)
  const [configStatus, setConfigStatus] = useState<'idle' | 'error' | 'success'>('idle')
  const [configMessage, setConfigMessage] = useState<string>('')
  const [isPending, startTransition] = useTransition() // Transition for server action

  const isAssigned = !!assignedPlayer

  const { connection, state: contextState, isConnected } = useDevice(ipAddress)
  const { retryDevice } = useDeviceConnections()
  const state = contextState || initialDeviceState(ipAddress)
  const connectionState = state.connectionState
  const isError = connectionState === 'error'

  const connect = () => connection?.connect()
  const disconnect = () => connection?.disconnect()
  const retry = () => retryDevice(ipAddress)
  const getStatus = () => connection?.getStatus()
  const updateConfig = (config: any) => connection?.updateConfig(config)
  const url = isConnected ? `ws://${ipAddress}/ws` : undefined

  // Sync assigned player → device configuration
  // Using a ref for connection to avoid re-triggering effect on every stat update (heartbeat/rssi)
  const connectionRef = useRef(connection)
  useEffect(() => {
    connectionRef.current = connection
  }, [connection])

  useEffect(() => {
    // Only attempt sync if we are verified connected and have a valid connection object
    if (isConnected && isAssigned && assignedPlayer && connectionRef.current) {
      // Calculate color integer
      let colorInt: number | undefined = undefined
      if (playerTeam?.color) {
        const hex = playerTeam.color.replace('#', '')
        const parsed = parseInt(hex, 16)
        if (!isNaN(parsed)) colorInt = parsed
      }

      // Send configuration to device
      connectionRef.current.updateConfig({
        // IMPORTANT: Use the Protocol ID (number), not the DB ID (UUID)
        // If your Player type still uses 'playerId' for the int, change .number to .playerId
        player_id: assignedPlayer.number ?? 0,
        team_id: playerTeam?.number ?? 0,
        color_rgb: colorInt,
      })
    }
  }, [isConnected, isAssigned, assignedPlayer, playerTeam]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateConfig = () => {
    setConfigStatus('idle')
    setConfigMessage('')

    startTransition(async () => {
      // 1. Update Name in DB if changed
      if (deviceId && editName !== initialName) {
        const res = await updateDevice(deviceId, { name: editName })
        if (res.error) {
          setConfigStatus('error')
          setConfigMessage('Failed to update name')
          return
        }
      }

      // 2. Update Device Config over WS
      if (connectionRef.current) {
        const ok = connectionRef.current.updateConfig({
          team_id: configTeamId ?? 0,
        })
        if (ok) {
          setConfigStatus('success')
          setConfigMessage('Saved') // Generic success
          setShowSettings(false)
        } else {
          setConfigStatus('error')
          setConfigMessage('WS Send Failed')
        }
      } else {
        // If only updating name (e.g. offline device), that's fine too
        if (deviceId && editName !== initialName) {
          setConfigStatus('success')
          setConfigMessage('Name saved (Device offline)')
          setShowSettings(false)
        } else {
          setConfigStatus('error')
          setConfigMessage('Device offline')
        }
      }
    })
  }

  const getConnectionBadge = () => {
    switch (connectionState) {
      case 'connected':
        return (
          <Badge variant="default" className="gap-1 text-xs">
            <Wifi className="w-3 h-3" />
            <span className="hidden sm:inline">Online</span>
          </Badge>
        )
      case 'connecting':
        return (
          <Badge variant="secondary" className="gap-1 text-xs">
            <RefreshCw className="w-3 h-3 animate-spin" />
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1 text-xs">
            <WifiOff className="w-3 h-3" />
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1 text-xs">
            <WifiOff className="w-3 h-3" />
          </Badge>
        )
    }
  }

  // Display name priority
  const displayName = assignedPlayer?.name || initialName || `Device @ ${ipAddress}`

  return (
    <Card className={`w-full transition-all ${isAssigned ? 'border-primary/30 bg-primary/5' : ''}`}>
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-sm truncate">{displayName}</span>
              {isAssigned && (
                <Badge variant="outline" className="gap-1 text-xs border-primary/50">
                  <Link className="w-3 h-3" />
                  <span className="hidden sm:inline">Linked</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{ipAddress}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">{getConnectionBadge()}</div>
        </div>

        {/* Player / Team info */}
        {isAssigned && playerTeam && (
          <div className="flex items-center gap-2 text-xs">
            <User className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Team:</span>
            <div
              className="w-3 h-3 rounded-full border"
              style={{ backgroundColor: playerTeam.color }}
            />
            <span>{playerTeam.name}</span>
          </div>
        )}

        {/* Live Stats Grid */}
        {isConnected && (
          <div className="grid grid-cols-3 gap-1 text-center text-xs bg-muted/50 rounded-md p-2">
            <div>
              <div className="font-bold text-sm">{state.kills}</div>
              <div className="text-muted-foreground text-[10px]">Kills</div>
            </div>
            <div>
              <div className="font-bold text-sm">{state.deaths}</div>
              <div className="text-muted-foreground text-[10px]">Deaths</div>
            </div>
            <div>
              <div className="font-bold text-sm">{state.friendlyKills || 0}</div>
              <div className="text-muted-foreground text-[10px]">Friendly</div>
            </div>
            <div>
              <div className="font-bold text-sm">{state.hearts}</div>
              <div className="text-muted-foreground text-[10px]">Hearts</div>
            </div>
            <div>
              <div className="font-bold text-sm">{state.maxAmmo === -1 ? '∞' : state.ammo}</div>
              <div className="text-muted-foreground text-[10px]">Ammo</div>
            </div>
            <div>
              <div className="font-bold text-sm">{state.hitsReceived || 0}</div>
              <div className="text-muted-foreground text-[10px]">Hits</div>
            </div>
          </div>
        )}

        {/* Status Indicators (Respawning / Reloading) */}
        {isConnected && (state.isRespawning || state.isReloading) && (
          <div className="flex items-center gap-2 text-xs mt-1">
            {state.isRespawning && (
              <Badge variant="destructive" className="gap-1 text-[10px] h-5">
                <Activity className="w-3 h-3 animate-pulse" />
                Respawning
              </Badge>
            )}
            {state.isReloading && (
              <Badge variant="secondary" className="gap-1 text-[10px] h-5">
                <Disc className="w-3 h-3 animate-spin" />
                Reloading
              </Badge>
            )}
          </div>
        )}

        {/* Settings (Shown when toggled; removed isAssigned restriction to allow name edits) */}
        {showSettings && (
          <div className="space-y-2 p-2 border rounded-md bg-muted/50">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Device Name</label>
              <Input
                className="h-8 text-xs"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter device name"
              />
            </div>

            {!isAssigned && (
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Manual Team Override</label>
                <Select
                  // Convert number to string for Select value
                  value={configTeamId !== undefined ? String(configTeamId) : 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setConfigTeamId(undefined)
                    } else {
                      setConfigTeamId(Number(value))
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Team (Solo)</SelectItem>
                    {teams.map((team) => (
                      // IMPORTANT: Value must be the Protocol ID (number), NOT the DB ID (UUID)
                      // If we use team.id (UUID), Number(value) will result in NaN
                      <SelectItem key={team.id} value={String(team.number)}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          {team.name}{' '}
                          <span className="text-muted-foreground text-[10px]">
                            (ID: {team.number})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {configStatus !== 'idle' && configMessage && (
              <div
                className={`flex items-center gap-2 text-xs ${configStatus === 'error' ? 'text-destructive' : 'text-green-600'}`}
              >
                {configStatus === 'error' ? (
                  <AlertCircle className="w-3 h-3" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                {configMessage}
              </div>
            )}
            <div className="flex gap-1">
              <Button
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={handleUpdateConfig}
                disabled={isPending}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-1 pt-1">
          {isError ? (
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={retry}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry Connection
            </Button>
          ) : !isConnected ? (
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={connect}>
              <Wifi className="w-3 h-3 mr-1" />
              Connect
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs flex-1"
                onClick={getStatus}
              >
                <RefreshCw className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">Config</span>
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={disconnect}>
                <Unlink className="w-3 h-3" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => connection?.playRemoteSound(0)}>
                    <Gamepad2 className="mr-2 h-4 w-4" /> Play Whistle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => connection?.playRemoteSound(1)}>
                    <Gamepad2 className="mr-2 h-4 w-4" /> Play Siren
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => connection?.confirmKill()}>
                    <Check className="mr-2 h-4 w-4" /> Confirm Kill
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {isAssigned && isConnected && (
          <p className="text-[10px] text-muted-foreground text-center">
            Config controlled by player settings
          </p>
        )}

        <div className="text-[10px] text-muted-foreground truncate" title={url}>
          {url && `Using: ${url}`}
        </div>
        {state.lastError && (
          <div
            className="text-xs text-destructive bg-destructive/5 p-1 rounded"
            style={{ wordBreak: 'break-word' }}
          >
            {state.lastError}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
