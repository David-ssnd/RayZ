'use client'

import { useState } from 'react'
import {
  Activity,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Square,
  Timer,
  UploadCloud,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { useDeviceConnections } from '@/lib/websocket'
import type { GameMode as WSGameMode } from '@/lib/websocket/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

import type { Project } from './types'

interface GameControlPanelProps {
  project: Project
}

const GAME_MODES: { value: WSGameMode; label: string; description: string }[] = [
  { value: 'free', label: 'Free Play', description: 'Open play, no restrictions' },
  { value: 'deathmatch', label: 'Deathmatch', description: 'Everyone is enemy' },
  { value: 'team', label: 'Team Battle', description: 'Team-based combat' },
  { value: 'capture_flag', label: 'Capture Flag', description: 'Capture the flag mode' },
  { value: 'timed', label: 'Timed Match', description: 'Time-limited match' },
]

interface GameSettings {
  durationMinutes: number
  maxHearts: number
  maxAmmo: number
  respawnTimeSeconds: number
  friendlyFire: boolean
  enableHearts: boolean
  enableAmmo: boolean
}

const DEFAULT_SETTINGS: GameSettings = {
  durationMinutes: 10,
  maxHearts: 5,
  maxAmmo: 30,
  respawnTimeSeconds: 5,
  friendlyFire: false,
  enableHearts: true,
  enableAmmo: true,
}

export function GameControlPanel({ project }: GameControlPanelProps) {
  const [selectedGameMode, setSelectedGameMode] = useState<WSGameMode>('free')
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)

  const { connectedDevices, connectAll, disconnectAll, broadcastCommand, broadcastConfig } =
    useDeviceConnections()

  const onlineCount = connectedDevices.length
  // In a real app we might pass the total count of devices from props if known,
  // effectively project.devices.length if that data is available.
  const totalDevices = project.devices?.length || 0

  // Get aggregated stats from all connected devices
  const totalKills = connectedDevices.reduce((sum, d) => sum + (d.kills || 0), 0)
  const totalDeaths = connectedDevices.reduce((sum, d) => sum + (d.deaths || 0), 0)
  const totalShots = connectedDevices.reduce((sum, d) => sum + (d.shots || 0), 0)

  const handleStartGame = () => {
    // 1. Broadcast Configuration based on mode and settings
    broadcastConfig({
      game_duration_s: settings.durationMinutes * 60,
      max_hearts: settings.maxHearts,
      max_ammo: settings.maxAmmo,
      respawn_time_s: settings.respawnTimeSeconds,
      friendly_fire: settings.friendlyFire,
      enable_hearts: settings.enableHearts,
      enable_ammo: settings.enableAmmo,
    })

    // 2. Start Game
    setTimeout(() => {
      broadcastCommand('start')
      setIsGameRunning(true)
    }, 200)
  }

  const handleSyncRules = () => {
    // Send updated rules without starting/stopping
    broadcastConfig({
      game_duration_s: settings.durationMinutes * 60,
      max_hearts: settings.maxHearts,
      max_ammo: settings.maxAmmo,
      respawn_time_s: settings.respawnTimeSeconds,
      friendly_fire: settings.friendlyFire,
      enable_hearts: settings.enableHearts,
      enable_ammo: settings.enableAmmo,
    })
  }

  const handleStopGame = () => {
    broadcastCommand('stop')
    setIsGameRunning(false)
  }

  const handleResetStats = () => {
    broadcastCommand('reset')
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5" />
            Game Control
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSettings(true)}
              disabled={isGameRunning}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <SettingsDialog
              open={showSettings}
              onOpenChange={setShowSettings}
              settings={settings}
              onSettingsChange={setSettings}
            />

            <Badge variant={onlineCount > 0 ? 'default' : 'secondary'} className="gap-1">
              {onlineCount > 0 ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {onlineCount}/{totalDevices} Online
            </Badge>
            {isGameRunning && (
              <Badge variant="default" className="gap-1 bg-green-600">
                <Activity className="w-3 h-3 animate-pulse" />
                Live
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Game Mode Selection */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={selectedGameMode}
            onValueChange={(v) => setSelectedGameMode(v as WSGameMode)}
            disabled={isGameRunning}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select game mode" />
            </SelectTrigger>
            <SelectContent>
              {GAME_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  <div className="flex flex-col">
                    <span>{mode.label}</span>
                    <span className="text-xs text-muted-foreground">{mode.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Game Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {!isGameRunning ? (
            <Button
              size="lg"
              className="col-span-2 h-12 text-base gap-2"
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
              className="col-span-2 h-12 text-base gap-2"
              onClick={handleStopGame}
            >
              <Square className="w-5 h-5" />
              Stop Game
            </Button>
          )}
          <Button
            variant="outline"
            className="h-12 gap-2"
            onClick={handleSyncRules}
            disabled={isGameRunning || onlineCount === 0}
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Sync Rules</span>
          </Button>
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
            className="h-12 gap-2 col-span-2 sm:col-span-4"
            onClick={onlineCount > 0 ? disconnectAll : connectAll}
          >
            {onlineCount > 0 ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {onlineCount > 0 ? 'Disconnect All' : 'Connect All'}
            </span>
          </Button>
        </div>

        {/* Live Stats */}
        {onlineCount > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center p-2 bg-muted/50 rounded-md">
              <div className="text-2xl font-bold">{totalKills}</div>
              <div className="text-xs text-muted-foreground">Total Kills</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-md">
              <div className="text-2xl font-bold">{totalDeaths}</div>
              <div className="text-xs text-muted-foreground">Total Deaths</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-md">
              <div className="text-2xl font-bold">{totalShots}</div>
              <div className="text-xs text-muted-foreground">Total Shots</div>
            </div>
          </div>
        )}

        {/* No devices warning */}
        {totalDevices === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Add devices to this project to start a game.
          </div>
        )}

        {/* All offline warning */}
        {totalDevices > 0 && onlineCount === 0 && (
          <div className="text-center py-2 text-amber-600 text-sm">
            No devices connected. Click "Connect" to connect all devices.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: GameSettings
  onSettingsChange: (settings: GameSettings) => void
}) {
  const update = (key: keyof GameSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Game Settings</DialogTitle>
          <DialogDescription>Configure rules for the next match.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between space-x-2">
            <label className="text-sm font-medium leading-none">Enable Hearts (Health)</label>
            <Switch
              checked={settings.enableHearts}
              onCheckedChange={(c) => update('enableHearts', c)}
            />
          </div>
          {settings.enableHearts && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm">Max Hearts</label>
                <Input
                  type="number"
                  value={settings.maxHearts}
                  onChange={(e) => update('maxHearts', Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Respawn (sec)</label>
                <Input
                  type="number"
                  value={settings.respawnTimeSeconds}
                  onChange={(e) => update('respawnTimeSeconds', Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between space-x-2 pt-2 border-t">
            <label className="text-sm font-medium leading-none">Enable Ammo</label>
            <Switch
              checked={settings.enableAmmo}
              onCheckedChange={(c) => update('enableAmmo', c)}
            />
          </div>
          {settings.enableAmmo && (
            <div className="grid gap-2">
              <label className="text-sm">Max Ammo</label>
              <Input
                type="number"
                value={settings.maxAmmo}
                onChange={(e) => update('maxAmmo', Number(e.target.value))}
              />
            </div>
          )}

          <div className="flex items-center justify-between space-x-2 pt-2 border-t">
            <label className="text-sm font-medium leading-none">Friendly Fire</label>
            <Switch
              checked={settings.friendlyFire}
              onCheckedChange={(c) => update('friendlyFire', c)}
            />
          </div>

          <div className="grid gap-2 pt-2 border-t">
            <label className="text-sm font-medium">Game Duration (minutes)</label>
            <Input
              type="number"
              value={settings.durationMinutes}
              onChange={(e) => update('durationMinutes', Number(e.target.value))}
              placeholder="0 = Infinite"
            />
            <p className="text-[10px] text-muted-foreground">Set to 0 for unlimited time.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
