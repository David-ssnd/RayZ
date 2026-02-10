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
import { useTranslations } from 'next-intl'

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
  gameStartedAt: Date | null
  setGameStartedAt: (date: Date | null) => void
  isGameOver: boolean
  setIsGameOver: (over: boolean) => void
  selectedGameModeId: string
  setSelectedGameModeId: (id: string) => void
  playerStats: any[]
  setPlayerStats: (stats: any[]) => void
}

export function GameControlPanel({
  project,
  availableGameModes,
  isGameRunning,
  setIsGameRunning,
  gameStartedAt,
  setGameStartedAt,
  isGameOver,
  setIsGameOver,
  selectedGameModeId,
  setSelectedGameModeId,
  playerStats,
  setPlayerStats,
}: GameControlPanelProps) {
  const t = useTranslations('Control.gameControl')
  const [isPaused, setIsPaused] = useState(false)
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
    <div className="space-y-4 min-w-0">
      {/* Game Control Section */}
      <div className="p-3 border rounded-lg bg-card space-y-3 shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-4 h-4 text-muted-foreground flex-none" />
            <h3 className="font-medium truncate">{t('title')}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 h-6 px-2 text-xs font-normal whitespace-nowrap",
                onlineCount > 0 ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : ""
              )}
            >
              {onlineCount > 0 ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {onlineCount}/{totalDevices} {t('online')}
            </Badge>
            {isGameRunning && (
              <Badge variant="destructive" className="gap-1.5 h-6 px-2 text-xs font-normal animate-pulse">
                <Activity className="w-3 h-3" />
                {t('live')}
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Game Mode & Start/Stop */}
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">{t('gameMode')}</label>
            <Select
              value={selectedGameModeId}
              onValueChange={setSelectedGameModeId}
              disabled={isGameRunning}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('selectGameMode')} />
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

          {!isGameRunning ? (
            <Button
              className="w-full gap-2"
              onClick={handleStartGame}
              disabled={onlineCount === 0 || !selectedGameModeId}
            >
              <Play className="w-4 h-4 fill-current" />
              {t('startGame')}
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={handleStopGame}
            >
              <Square className="w-4 h-4 fill-current" />
              {t('stopGame')}
            </Button>
          )}
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
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
                  {t('pause')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleResumeGame}
                >
                  <PlayCircle className="w-4 h-4" />
                  {t('resume')}
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
                  {t('extendTime')}
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
                  {t('updateTarget')}
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
                {t('syncRules')}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleResetStats}
              >
                <RotateCcw className="w-4 h-4" />
                {t('reset')}
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
                {t('disconnectAll')}
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                {t('connectAll')}
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Stats - compact grid for sidebar */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
          <div className="flex flex-col items-center p-2 rounded-md bg-muted/50 overflow-hidden">
            <span className="text-lg sm:text-xl font-semibold truncate w-full">{totalKills}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate w-full">{t('kills')}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-md bg-muted/50 overflow-hidden">
            <span className="text-lg sm:text-xl font-semibold truncate w-full">{totalDeaths}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate w-full">{t('deaths')}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-md bg-muted/50 overflow-hidden">
            <span className="text-lg sm:text-xl font-semibold truncate w-full">{totalShots}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate w-full">{t('shots')}</span>
          </div>
        </div>
      </div>

      {/* Extend Time Dialog */}
      <Dialog open={showExtendTime} onOpenChange={setShowExtendTime}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('extendTimeDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('extendTimeDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="extend-minutes">{t('extendTimeDialog.label')}</Label>
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
                {t('extendTimeDialog.cancel')}
              </Button>
              <Button onClick={handleExtendTime} className="flex-1">
                {t('extendTimeDialog.extend')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Target Dialog */}
      <Dialog open={showUpdateTarget} onOpenChange={setShowUpdateTarget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('updateTargetDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('updateTargetDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-score">{t('updateTargetDialog.label')}</Label>
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
                {t('updateTargetDialog.cancel')}
              </Button>
              <Button onClick={handleUpdateTarget} className="flex-1">
                {t('updateTargetDialog.update')}
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
        }}
        onRematch={() => {
          setIsGameOver(false)
          handleStartGame()
        }}
      />
    </div>
  )
}


