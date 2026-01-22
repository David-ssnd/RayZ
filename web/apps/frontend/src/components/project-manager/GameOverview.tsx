'use client'

import { useState } from 'react'
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Gamepad2,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Square,
  Target,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useDeviceConnections } from '@/lib/websocket'
import type { GameMode as WSGameMode } from '@/lib/websocket/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { Device, Player, Project, Team } from './types'

interface GameOverviewProps {
  project: Project
}

const GAME_MODES: { value: WSGameMode; label: string; icon: React.ReactNode }[] = [
  { value: 'free', label: 'Free Play', icon: <Zap className="w-4 h-4" /> },
  { value: 'deathmatch', label: 'Deathmatch', icon: <Target className="w-4 h-4" /> },
  { value: 'team', label: 'Team Battle', icon: <Users className="w-4 h-4" /> },
  { value: 'capture_flag', label: 'Capture Flag', icon: <Shield className="w-4 h-4" /> },
  { value: 'timed', label: 'Timed Match', icon: <Activity className="w-4 h-4" /> },
]

export function GameOverview({ project }: GameOverviewProps) {
  const [selectedGameMode, setSelectedGameMode] = useState<WSGameMode>('free')
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())

  const { broadcastCommand, connectAll, disconnectAll, connectedDevices, connections } =
    useDeviceConnections()

  const totalDevices = project.devices?.length || 0
  const onlineCount = connectedDevices.length

  // Get aggregated stats
  const totalKills = connectedDevices.reduce((sum, d) => sum + (d.kills || 0), 0)
  const totalDeaths = connectedDevices.reduce((sum, d) => sum + (d.deaths || 0), 0)

  // Helper functions
  const getPlayersInTeam = (teamId: string): Player[] => {
    return project.players?.filter((p: Player) => p.teamId === teamId) || []
  }

  const getPlayersWithoutTeam = (): Player[] => {
    return project.players?.filter((p: Player) => !p.teamId) || []
  }

  const getDevicesForPlayer = (player: Player): Device[] => {
    return project.devices?.filter((d: Device) => d.assignedPlayerId === player.id) || []
  }

  const getDeviceConnectionState = (ipAddress: string) => {
    return connections.get(ipAddress)?.state.connectionState || 'disconnected'
  }

  const toggleTeam = (teamId: string) => {
    const newExpanded = new Set(expandedTeams)
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId)
    } else {
      newExpanded.add(teamId)
    }
    setExpandedTeams(newExpanded)
  }

  const handleStartGame = () => {
    broadcastCommand('start')
    setIsGameRunning(true)
  }

  const handleStopGame = () => {
    broadcastCommand('stop')
    setIsGameRunning(false)
  }

  const handleResetStats = () => {
    broadcastCommand('reset')
  }

  const renderDeviceBadge = (device: Device) => {
    const state = getDeviceConnectionState(device.ipAddress)
    const isOnline = state === 'connected'

    return (
      <div
        key={device.id}
        className="flex items-center gap-1 px-1 py-0.5 rounded-md bg-muted/50 text-xs"
      >
        {isOnline ? (
          <Wifi className="w-3 h-3 text-green-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-muted-foreground" />
        )}
        <Monitor className="w-3 h-3" />
        <span className="truncate max-w-24">{device.name || device.ipAddress}</span>
      </div>
    )
  }

  const renderPlayer = (player: Player, teamColor?: string) => {
    const devices = getDevicesForPlayer(player)

    return (
      <div
        key={player.id}
        className="flex flex-col sm:flex-row sm:items-center gap-1 p-1 rounded-md bg-background"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Gamepad2 className="w-4 h-4 shrink-0" style={{ color: teamColor }} />
          <span className="font-medium truncate">{player.name}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            ID: {player.number}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1 ml-0 sm:ml-auto">
          {devices.length > 0 ? (
            devices.map(renderDeviceBadge)
          ) : (
            <span className="text-xs text-muted-foreground italic">No devices</span>
          )}
        </div>
      </div>
    )
  }

  const renderTeam = (team: Team) => {
    const players = getPlayersInTeam(team.id)
    const isExpanded = expandedTeams.has(team.id)
    const teamDevices = players.flatMap((p) => getDevicesForPlayer(p))
    const onlineDevices = teamDevices.filter(
      (d) => getDeviceConnectionState(d.ipAddress) === 'connected'
    )

    return (
      <div key={team.id} className="overflow-hidden rounded">
        {/* Table-like header row */}
        <div
          role="button"
          onClick={() => toggleTeam(team.id)}
          className="flex items-center gap-2 px-3 py-2 hover:bg-accent/20"
        >
          <div className="flex items-center gap-2 w-1/2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
            <div className="font-medium truncate">{team.name}</div>
          </div>

          <div className="flex items-center gap-3 ml-auto w-1/2 justify-end">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Players:</span>
              <span className="font-medium">{players.length}</span>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Devices:</span>
              <span className="font-medium">
                {onlineDevices.length}/{teamDevices.length}
              </span>
            </div>
          </div>
        </div>

        {/* Expandable file-structure style content */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-2">
            <div className="ml-3 pl-3">
              {players.length > 0 ? (
                players.map((p) => (
                  <div key={p.id} className="mb-2">
                    <div className="flex items-center gap-2">
                      <Gamepad2
                        className="w-4 h-4 text-muted-foreground"
                        style={{ color: team.color }}
                      />
                      <div className="font-medium">{p.name}</div>
                      <Badge variant="outline" className="text-xs ml-2">
                        ID: {p.number}
                      </Badge>
                    </div>

                    <div className="mt-1 ml-6 flex flex-col gap-1">
                      {getDevicesForPlayer(p).length > 0 ? (
                        getDevicesForPlayer(p).map((d) => (
                          <div key={d.id} className="flex items-center gap-2 text-sm">
                            <span className="w-3" />
                            <div className="flex items-center gap-2">
                              {getDeviceConnectionState(d.ipAddress) === 'connected' ? (
                                <Wifi className="w-3 h-3 text-green-500" />
                              ) : (
                                <WifiOff className="w-3 h-3 text-red-300" />
                              )}
                              <Monitor className="w-3 h-3" />
                              <span className="truncate">{d.name || d.ipAddress}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground italic">No devices</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-1">
                  No players in this team
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const playersWithoutTeam = getPlayersWithoutTeam()

  return (
    <div className="space-y-4">
      {/* Game Control Section */}
      <Card className="border-0 gap-2">
        <CardHeader className="pb-2 px-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Game Control
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={onlineCount > 0 ? 'default' : 'secondary'} className="gap-1">
                {onlineCount > 0 ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {onlineCount}/{totalDevices} Online
              </Badge>
              {isGameRunning && (
                <Badge className="gap-1 bg-green-600">
                  <Activity className="w-3 h-3 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-0">
          {/* Game Mode Selection */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={selectedGameMode}
              onValueChange={(v) => setSelectedGameMode(v as WSGameMode)}
              disabled={isGameRunning}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GAME_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <div className="flex items-center gap-2">
                      {mode.icon}
                      <span>{mode.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Game Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {!isGameRunning ? (
              <Button
                size="lg"
                className="col-span-2 h-12 gap-2"
                onClick={handleStartGame}
                disabled={onlineCount === 0}
              >
                <Play className="w-5 h-5" />
                Start Game
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                className="col-span-2 h-12 gap-2"
                onClick={handleStopGame}
              >
                <Square className="w-5 h-5" />
                Stop Game
              </Button>
            )}
            <Button
              variant="outline"
              className="h-12 gap-2"
              onClick={handleResetStats}
              disabled={isGameRunning}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
            <Button
              variant="outline"
              className="h-12 gap-2"
              onClick={onlineCount > 0 ? disconnectAll : connectAll}
            >
              {onlineCount > 0 ? (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span className="hidden sm:inline">Disconnect</span>
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  <span className="hidden sm:inline">Connect</span>
                </>
              )}
            </Button>
          </div>

          {/* Live Stats */}
          {isGameRunning && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{totalKills}</p>
                <p className="text-xs text-muted-foreground">Total Kills</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{totalDeaths}</p>
                <p className="text-xs text-muted-foreground">Total Deaths</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teams Section */}
      {project.teams?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Teams
          </h3>
          <div>{project.teams.map(renderTeam)}</div>
        </div>
      )}

      {/* Unassigned Players */}
      {playersWithoutTeam.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Gamepad2 className="w-5 h-5" />
            Players without Team
          </h3>
          <div className="flex flex-col gap-3 px-3">
            {playersWithoutTeam.map((p) => renderPlayer(p))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!project.teams || project.teams.length === 0) &&
        (!project.players || project.players.length === 0) && (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No teams or players configured.</p>
              <p className="text-sm">Go to Teams and Players tabs to set up your game.</p>
            </CardContent>
          </Card>
        )}
    </div>
  )
}
