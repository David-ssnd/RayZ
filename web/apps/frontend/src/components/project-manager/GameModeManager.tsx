'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createCustomGameMode } from '@/features/projects/actions'
import {
  AlertCircle,
  Copy,
  LayoutGrid,
  MoreVertical,
  Plus,
  Search,
  Settings2,
  Trash2,
  Wand2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
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
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

import { GameMode } from './types'

type GameModeConfig = {
  durationSeconds: number
  durationMinutes: number
  targetScore: number
  maxHearts: number
  spawnHearts: number
  respawnTimeSec: number
  friendlyFire: boolean
  damageIn: number
  damageOut: number
  enableAmmo: boolean
  maxAmmo: number
  reloadTimeMs: number
  winType: 'time' | 'score' | 'last_man_standing'
}

const buildConfigFromBase = (base?: GameMode): GameModeConfig => ({
  durationSeconds: base?.durationSeconds ?? 600,
  durationMinutes: base?.durationMinutes ?? 10,
  targetScore: base?.targetScore ?? 100,
  maxHearts: base?.maxHearts ?? 5,
  spawnHearts: base?.spawnHearts ?? 3,
  respawnTimeSec: base?.respawnTimeSec ?? 10,
  friendlyFire: base?.friendlyFire ?? false,
  damageIn: base?.damageIn ?? 1,
  damageOut: base?.damageOut ?? 1,
  enableAmmo: base?.enableAmmo ?? true,
  maxAmmo: base?.maxAmmo ?? 30,
  reloadTimeMs: base?.reloadTimeMs ?? 2500,
  winType: (base?.winType as 'time' | 'score' | 'last_man_standing') ?? 'score',
})

interface GameModeManagerProps {
  gameModes: GameMode[]
  onCreated: (mode: GameMode) => void
}

export function GameModeManager({ gameModes, onCreated }: GameModeManagerProps) {
  const systemModes = useMemo(
    () => gameModes.filter((mode) => mode.isSystem || mode.userId === null),
    [gameModes]
  )
  const customModes = useMemo(
    () => gameModes.filter((mode) => !mode.isSystem && mode.userId !== null),
    [gameModes]
  )

  const [selectedGameModeId, setSelectedGameModeId] = useState<string | null>(
    gameModes[0]?.id || null
  )
  const selectedMode = useMemo(
    () => gameModes.find((m) => m.id === selectedGameModeId),
    [gameModes, selectedGameModeId]
  )

  const [config, setConfig] = useState<GameModeConfig>(() => buildConfigFromBase(selectedMode))

  // Update config when selection changes
  useEffect(() => {
    if (selectedMode) {
      setConfig(buildConfigFromBase(selectedMode))
    }
  }, [selectedMode])

  // Create Mode State
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newModeName, setNewModeName] = useState('')
  const [baseModeId, setBaseModeId] = useState<string>('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    if (!newModeName.trim() || !baseModeId) {
      setCreateError('Name and base game mode are required')
      return
    }

    startTransition(async () => {
      const result = await createCustomGameMode({
        name: newModeName.trim(),
        baseGameModeId: baseModeId,
      })

      if (result.success && result.gameMode) {
        onCreated(result.gameMode)
        setSelectedGameModeId(result.gameMode.id)
        setCreateDialogOpen(false)
        setNewModeName('')
        setBaseModeId('')
      } else {
        setCreateError(result.error || 'Failed to create game mode')
      }
    })
  }

  const handleNumberChange = (key: keyof GameModeConfig) => (value: string) => {
    // Only allow editing if not system mode (though UI should disable it too)
    if (selectedMode?.isSystem) return
    const numeric = Number(value)
    setConfig((prev) => ({ ...prev, [key]: Number.isNaN(numeric) ? 0 : numeric }))
  }

  // TODO: Implement Update Action
  const handleSave = () => {
    // Implement update logic here
    console.log('Saving changes...', config)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
      {/* LEFT COLUMN: List */}
      <div className="border rounded-lg overflow-hidden h-[600px] flex flex-col">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Game Modes</span>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-2">
                  <Plus className="h-3 w-3" />
                  <span>New</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Custom Game Mode</DialogTitle>
                  <DialogDescription>
                    Choose a base mode to inherit settings from.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input
                      value={newModeName}
                      onChange={(e) => setNewModeName(e.target.value)}
                      placeholder="My Custom Mode"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Inherit from</Label>
                    <Select value={baseModeId} onValueChange={setBaseModeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select base mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system_group" disabled className="font-semibold opacity-100">
                          System Modes
                        </SelectItem>
                        {systemModes.map((mode) => (
                          <SelectItem key={mode.id} value={mode.id} className="pl-6">
                            {mode.name}
                          </SelectItem>
                        ))}
                        {customModes.length > 0 && (
                          <>
                            <Separator className="my-1" />
                            <SelectItem
                              value="custom_group"
                              disabled
                              className="font-semibold opacity-100"
                            >
                              Custom Modes
                            </SelectItem>
                            {customModes.map((mode) => (
                              <SelectItem key={mode.id} value={mode.id} className="pl-6">
                                {mode.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {createError && <p className="text-sm text-destructive">{createError}</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={isPending}>
                    {isPending ? 'Creating...' : 'Create Mode'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8 h-9 text-sm" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-3">
            {/* System Modes Group */}
            <div>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Settings2 className="w-3 h-3" /> System Defaults
              </div>
              <div className="space-y-0.5">
                {systemModes.map((mode) => (
                  <Button
                    key={mode.id}
                    variant={selectedGameModeId === mode.id ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start text-sm h-9 px-2',
                      selectedGameModeId === mode.id && 'font-medium'
                    )}
                    onClick={() => setSelectedGameModeId(mode.id)}
                  >
                    {mode.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Custom Modes Group */}
            <div>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Wand2 className="w-3 h-3" /> Custom Modes
              </div>
              <div className="space-y-0.5">
                {customModes.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground text-center italic">No custom modes yet.</p>
                ) : (
                  customModes.map((mode) => (
                    <Button
                      key={mode.id}
                      variant={selectedGameModeId === mode.id ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-start text-sm h-9 px-2',
                        selectedGameModeId === mode.id && 'font-medium'
                      )}
                      onClick={() => setSelectedGameModeId(mode.id)}
                    >
                      {mode.name}
                    </Button>
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT COLUMN: Settings Editor */}
      <div className="border rounded-lg overflow-hidden h-[600px] flex flex-col">
        {selectedMode ? (
          <>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    {selectedMode.name}
                    {selectedMode.isSystem && (
                      <Badge variant="outline" className="text-xs font-normal">
                        Read-only
                      </Badge>
                    )}
                  </h3>
                  {selectedMode.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedMode.description}
                    </p>
                  )}
                </div>
                {!selectedMode.isSystem && (
                  <Button onClick={handleSave} disabled={isPending}>
                    Save Changes
                  </Button>
                )}
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className={cn('space-y-4', selectedMode.isSystem && 'opacity-60 pointer-events-none')}>
                {/* Win Category */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Win</h4>
                  <div className={cn(
                    'grid gap-3',
                    config.winType === 'last_man_standing' ? 'grid-cols-3' : 'grid-cols-2'
                  )}>
                    <div className="grid gap-1.5">
                      <Label>Win Type</Label>
                      <Select
                        value={config.winType}
                        onValueChange={(value: 'time' | 'score' | 'last_man_standing') =>
                          setConfig((prev) => ({ ...prev, winType: value }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="time">By Time</SelectItem>
                          <SelectItem value="score">By Score</SelectItem>
                          <SelectItem value="last_man_standing">Last Man Standing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {config.winType === 'time' && (
                      <div className="grid gap-1.5">
                        <Label>Duration (minutes)</Label>
                        <Input
                          type="number"
                          value={config.durationMinutes}
                          onChange={(e) => handleNumberChange('durationMinutes')(e.target.value)}
                        />
                      </div>
                    )}

                    {config.winType === 'score' && (
                      <div className="grid gap-1.5">
                        <Label>Target Score</Label>
                        <Input
                          type="number"
                          value={config.targetScore}
                          onChange={(e) => handleNumberChange('targetScore')(e.target.value)}
                        />
                      </div>
                    )}

                    {config.winType === 'last_man_standing' && (
                      <>
                        <div className="grid gap-1.5">
                          <Label>Spawn Hearts</Label>
                          <Input
                            type="number"
                            value={config.spawnHearts}
                            onChange={(e) => handleNumberChange('spawnHearts')(e.target.value)}
                          />
                        </div>

                        <div className="grid gap-1.5">
                          <Label>Max Hearts</Label>
                          <Input
                            type="number"
                            value={config.maxHearts}
                            onChange={(e) => handleNumberChange('maxHearts')(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Game Category */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Game</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center justify-between p-2.5 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Friendly Fire</Label>
                        <p className="text-xs text-muted-foreground">Teammates can damage each other</p>
                      </div>
                      <Switch
                        checked={config.friendlyFire}
                        onCheckedChange={(c) => setConfig((prev) => ({ ...prev, friendlyFire: c }))}
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label>Respawn Time (sec)</Label>
                      <Input
                        type="number"
                        value={config.respawnTimeSec}
                        onChange={(e) => handleNumberChange('respawnTimeSec')(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label>Damage Received</Label>
                      <Input
                        type="number"
                        value={config.damageIn}
                        onChange={(e) => handleNumberChange('damageIn')(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Ammo Category */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Ammo</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center justify-between p-2.5 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Enable Ammo</Label>
                        <p className="text-xs text-muted-foreground">Limit shots per clip</p>
                      </div>
                      <Switch
                        checked={config.enableAmmo}
                        onCheckedChange={(c) => setConfig((prev) => ({ ...prev, enableAmmo: c }))}
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label>Max Ammo</Label>
                      <Input
                        type="number"
                        value={config.maxAmmo}
                        onChange={(e) => handleNumberChange('maxAmmo')(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label>Reload Time (ms)</Label>
                      <Input
                        type="number"
                        value={config.reloadTimeMs}
                        onChange={(e) => handleNumberChange('reloadTimeMs')(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
             <LayoutGrid className="w-12 h-12 mb-4 opacity-20" />
             <p>Select a game mode to view settings</p>
          </div>
        )}
      </div>
    </div>
  )
}

