'use client'

import { useState, useEffect } from 'react'
import {
  Activity,
  Play,
  RotateCcw,
  Settings2,
  Square,
  UploadCloud,
  Wifi,
  WifiOff,
  Pause,
  PlayCircle,
  Clock,
  Target,
} from 'lucide-react'

import { useDeviceConnections } from '@/lib/websocket'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { LiveGameStats } from './LiveGameStats'
import { GameOverDialog } from './GameOverDialog'

import type { GameMode, Project } from './types'

interface GameControlPanelProps {
  project: Project
  availableGameModes: GameMode[]
  isGameRunning: boolean
  setIsGameRunning: (running: boolean) => void
}

export function GameControlPanel({ project, availableGameModes, isGameRunning, setIsGameRunning }: GameControlPanelProps) {
  const [selectedGameModeId, setSelectedGameModeId] = useState<string>(project.gameModeId || availableGameModes[0]?.id || '')
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [gameStartedAt, setGameStartedAt] = useState<Date | null>(null)
  const [showExtendTime, setShowExtendTime] = useState(false)
  const [showUpdateTarget, setShowUpdateTarget] = useState(false)
  const [extendMinutes, setExtendMinutes] = useState(5)
  const [newTargetScore, setNewTargetScore] = useState(100)
  
  const selectedGameMode = availableGameModes.find(m => m.id === selectedGameModeId)

  const [showSettings, setShowSettings] = useState(false)
  const [tempSettings, setTempSettings] = useState<Partial<GameMode>>({})

  const { connectedDevices, connectAll, disconnectAll, broadcastCommand, broadcastConfig } =
    useDeviceConnections()

  const onlineCount = connectedDevices.length
  const totalDevices = project.devices?.length || 0

  // Mock player data (in real implementation, this would come from WebSocket messages)
  const [playerStats, setPlayerStats] = useState<any[]>([])

  useEffect(() => {
    // Mock player data from connected devices
    const stats = project.players?.map(player => ({
      playerId: player.id,
      playerName: player.name,
      playerNumber: player.number,
      teamId: player.teamId,
      teamName: project.teams?.find(t => t.id === player.teamId)?.name,
      score: 0,
      kills: 0,
      deaths: 0,
      hits: 0,
      shots: 0,
      hearts: selectedGameMode?.spawnHearts || 3,
      eliminated: false,
      finalHearts: 0,
    })) || []
    setPlayerStats(stats)
  }, [project.players, project.teams, selectedGameMode])

  // Stats
  const totalKills = connectedDevices.reduce((sum, d) => sum + (d.kills || 0), 0)
  const totalDeaths = connectedDevices.reduce((sum, d) => sum + (d.deaths || 0), 0)
  const totalShots = connectedDevices.reduce((sum, d) => sum + (d.shots || 0), 0)

  const handleStartGame = () => {
    if (!selectedGameMode) return

    const config = {
      win_type: selectedGameMode.winType,
      target_score: selectedGameMode.targetScore,
      game_duration_s: selectedGameMode.durationMinutes ? selectedGameMode.durationMinutes * 60 : 600,
      max_hearts: selectedGameMode.maxHearts,
      spawn_hearts: selectedGameMode.spawnHearts,
      max_ammo: selectedGameMode.maxAmmo,
      respawn_time_s: selectedGameMode.respawnTimeSec,
      friendly_fire: selectedGameMode.friendlyFire,
      damage_in: selectedGameMode.damageIn,
      damage_out: selectedGameMode.damageOut,
      enable_ammo: selectedGameMode.enableAmmo,
      reload_time_ms: selectedGameMode.reloadTimeMs,
      ...tempSettings
    }

    broadcastConfig(config)

    setTimeout(() => {
      broadcastCommand('start')
      setIsGameRunning(true)
      setIsPaused(false)
      setIsGameOver(false)
      setGameStartedAt(new Date())
    }, 200)
  }

  const handleStopGame = () => {
    broadcastCommand('stop')
    setIsGameRunning(false)
    setIsPaused(false)
  }

  const handlePauseGame = () => {
    broadcastCommand('pause')
    setIsPaused(true)
  }

  const handleResumeGame = () => {
    broadcastCommand('unpause')
    setIsPaused(false)
  }

  const handleExtendTime = () => {
    if (!selectedGameMode || selectedGameMode.winType !== 'time') return
    // Send extend time command with parameter
    broadcastCommand('extend_time', { extend_minutes: extendMinutes })
    setShowExtendTime(false)
  }

  const handleUpdateTarget = () => {
    if (!selectedGameMode || selectedGameMode.winType !== 'score') return
    // Send update target command with parameter
    broadcastCommand('update_target', { new_target: newTargetScore })
    setShowUpdateTarget(false)
  }

  const handleSyncRules = () => {
     if (!selectedGameMode) return
     const config = {
      win_type: selectedGameMode.winType,
      target_score: selectedGameMode.targetScore,
      game_duration_s: selectedGameMode.durationMinutes ? selectedGameMode.durationMinutes * 60 : 600,
      max_hearts: selectedGameMode.maxHearts,
      spawn_hearts: selectedGameMode.spawnHearts,
      max_ammo: selectedGameMode.maxAmmo,
      respawn_time_s: selectedGameMode.respawnTimeSec,
      friendly_fire: selectedGameMode.friendlyFire,
      damage_in: selectedGameMode.damageIn,
      damage_out: selectedGameMode.damageOut,
      enable_ammo: selectedGameMode.enableAmmo,
      reload_time_ms: selectedGameMode.reloadTimeMs,
    }
    broadcastConfig(config)
  }

  const handleResetStats = () => {
    broadcastCommand('reset')
  }

  return (
    <div className="space-y-4">
      {/* Game Control Section */}
      <div className="p-4 border rounded-lg bg-card space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Game Control</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 h-6 px-2 text-xs font-normal",
                onlineCount > 0 ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : ""
              )}
            >
              {onlineCount > 0 ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {onlineCount}/{totalDevices} Online
            </Badge>
            {isGameRunning && (
              <Badge variant="destructive" className="gap-1.5 h-6 px-2 text-xs font-normal animate-pulse">
                <Activity className="w-3 h-3" />
                Live
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Game Mode & Start/Stop */}
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full grid gap-1.5">
            <label className="text-sm font-medium">Game Mode</label>
            <Select
              value={selectedGameModeId}
              onValueChange={setSelectedGameModeId}
              disabled={isGameRunning}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select game mode" />
              </SelectTrigger>
              <SelectContent>
                {availableGameModes.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    <div className="flex flex-col py-0.5">
                      <span className="font-medium">{mode.name}</span>
                      {mode.description && (
                        <span className="text-xs text-muted-foreground">{mode.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-auto">
            {!isGameRunning ? (
              <Button
                className="w-full sm:w-auto gap-2"
                onClick={handleStartGame}
                disabled={onlineCount === 0 || !selectedGameModeId}
              >
                <Play className="w-4 h-4 fill-current" />
                Start Game
              </Button>
            ) : (
              <Button
                variant="destructive"
                className="w-full sm:w-auto gap-2"
                onClick={handleStopGame}
              >
                <Square className="w-4 h-4 fill-current" />
                Stop Game
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Quick Actions & Stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {isGameRunning && (
              <>
                {!isPaused ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handlePauseGame}
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleResumeGame}
                  >
                    <PlayCircle className="w-4 h-4" />
                    Resume
                  </Button>
                )}

                {selectedGameMode?.winType === 'time' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowExtendTime(true)}
                    disabled={isPaused}
                  >
                    <Clock className="w-4 h-4" />
                    Extend Time
                  </Button>
                )}

                {selectedGameMode?.winType === 'score' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowUpdateTarget(true)}
                    disabled={isPaused}
                  >
                    <Target className="w-4 h-4" />
                    Update Target
                  </Button>
                )}
              </>
            )}

            {!isGameRunning && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleSyncRules}
                  disabled={onlineCount === 0}
                >
                  <UploadCloud className="w-4 h-4" />
                  Sync Rules
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleResetStats}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={onlineCount > 0 ? disconnectAll : connectAll}
            >
              {onlineCount > 0 ? (
                <>
                  <WifiOff className="w-4 h-4" />
                  Disconnect All
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  Connect All
                </>
              )}
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-xl font-semibold">{totalKills}</span>
              <span className="text-xs text-muted-foreground">Kills</span>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-semibold">{totalDeaths}</span>
              <span className="text-xs text-muted-foreground">Deaths</span>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-semibold">{totalShots}</span>
              <span className="text-xs text-muted-foreground">Shots</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Game Stats */}
      {isGameRunning && selectedGameMode && (
        <LiveGameStats
          winType={selectedGameMode.winType as any}
          targetScore={selectedGameMode.targetScore}
          durationMinutes={selectedGameMode.durationMinutes}
          gameStartedAt={gameStartedAt || undefined}
          players={playerStats}
          isGameRunning={isGameRunning}
          isGameOver={isGameOver}
        />
      )}

      {/* Extend Time Dialog */}
      <Dialog open={showExtendTime} onOpenChange={setShowExtendTime}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Game Time</DialogTitle>
            <DialogDescription>
              Add additional minutes to the current game
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="extend-minutes">Additional Minutes</Label>
              <Input
                id="extend-minutes"
                type="number"
                min="1"
                max="60"
                value={extendMinutes}
                onChange={(e) => setExtendMinutes(parseInt(e.target.value) || 5)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowExtendTime(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleExtendTime} className="flex-1">
                Extend
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Target Dialog */}
      <Dialog open={showUpdateTarget} onOpenChange={setShowUpdateTarget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Target Score</DialogTitle>
            <DialogDescription>
              Change the target score for this game
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-score">New Target Score</Label>
              <Input
                id="target-score"
                type="number"
                min="10"
                max="10000"
                value={newTargetScore}
                onChange={(e) => setNewTargetScore(parseInt(e.target.value) || 100)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowUpdateTarget(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateTarget} className="flex-1">
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Game Over Dialog */}
      <GameOverDialog
        open={isGameOver}
        onOpenChange={setIsGameOver}
        winType="time"
        winnerName={playerStats[0]?.playerName}
        winnerType="player"
        matchDuration={0}
        players={playerStats}
        onNewGame={() => {
          setIsGameOver(false)
          // Reset state for new game
        }}
        onRematch={() => {
          setIsGameOver(false)
          handleStartGame()
        }}
      />
    </div>
  )
}


