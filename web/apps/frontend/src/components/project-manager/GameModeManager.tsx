'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createCustomGameMode } from '@/features/projects/actions'
import { AlertCircle, Wand2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import { GameMode } from './types'

type GameModeConfig = {
  durationSeconds: number
  enableHearts: boolean
  maxHearts: number
  spawnHearts: number
  respawnTimeSec: number
  friendlyFire: boolean
  damageIn: number
  damageOut: number
  enableAmmo: boolean
  maxAmmo: number
  reloadTimeMs: number
}

const buildConfigFromBase = (base?: GameMode): GameModeConfig => ({
  durationSeconds: base?.durationSeconds ?? 600,
  enableHearts: base?.enableHearts ?? true,
  maxHearts: base?.maxHearts ?? 5,
  spawnHearts: base?.spawnHearts ?? 3,
  respawnTimeSec: base?.respawnTimeSec ?? 10,
  friendlyFire: base?.friendlyFire ?? false,
  damageIn: base?.damageIn ?? 1,
  damageOut: base?.damageOut ?? 1,
  enableAmmo: base?.enableAmmo ?? true,
  maxAmmo: base?.maxAmmo ?? 30,
  reloadTimeMs: base?.reloadTimeMs ?? 2500,
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

  const baseOptions = useMemo(
    () => (systemModes.length > 0 ? systemModes : gameModes),
    [gameModes, systemModes]
  )

  const [baseGameModeId, setBaseGameModeId] = useState(baseOptions[0]?.id ?? '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [config, setConfig] = useState<GameModeConfig>(() =>
    buildConfigFromBase(baseOptions.find((mode) => mode.id === baseGameModeId))
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const base = baseOptions.find((mode) => mode.id === baseGameModeId)
    setConfig(buildConfigFromBase(base))
  }, [baseGameModeId, baseOptions])

  const handleNumberChange = (key: keyof GameModeConfig) => (value: string) => {
    const numeric = Number(value)
    setConfig((prev) => ({ ...prev, [key]: Number.isNaN(numeric) ? 0 : numeric }))
  }

  const handleCreate = () => {
    if (!name.trim() || !baseGameModeId) {
      setError('Name and base game mode are required')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createCustomGameMode({
        name: name.trim(),
        description: description.trim() || undefined,
        baseGameModeId,
        overrides: config,
      })

      if (result.success && result.gameMode) {
        onCreated(result.gameMode)
        setName('')
        setDescription('')
      } else if (result.error) {
        setError(result.error)
      } else {
        setError('Failed to create game mode')
      }
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Gamemode Builder
          </CardTitle>
          <CardDescription>
            Create a custom gamemode by starting from a default ruleset and tweaking the values you
            need.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Base gamemode</label>
                <Select value={baseGameModeId} onValueChange={setBaseGameModeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a default gamemode" />
                  </SelectTrigger>
                  <SelectContent>
                    {baseOptions.map((mode) => (
                      <SelectItem key={mode.id} value={mode.id}>
                        {mode.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {systemModes.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No default gamemodes found. Add a base gamemode in the database first.
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Gamemode name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Stealth Ops"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Short summary of the rules"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Duration (sec)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={config.durationSeconds}
                    onChange={(e) => handleNumberChange('durationSeconds')(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Respawn time (sec)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={config.respawnTimeSec}
                    onChange={(e) => handleNumberChange('respawnTimeSec')(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Max hearts</label>
                  <Input
                    type="number"
                    min={-1}
                    value={config.maxHearts}
                    onChange={(e) => handleNumberChange('maxHearts')(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Spawn hearts</label>
                  <Input
                    type="number"
                    min={0}
                    value={config.spawnHearts}
                    onChange={(e) => handleNumberChange('spawnHearts')(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Damage in</label>
                  <Input
                    type="number"
                    min={0}
                    value={config.damageIn}
                    onChange={(e) => handleNumberChange('damageIn')(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Damage out</label>
                  <Input
                    type="number"
                    min={0}
                    value={config.damageOut}
                    onChange={(e) => handleNumberChange('damageOut')(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Max ammo</label>
                  <Input
                    type="number"
                    min={-1}
                    value={config.maxAmmo}
                    onChange={(e) => handleNumberChange('maxAmmo')(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Reload time (ms)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={config.reloadTimeMs}
                    onChange={(e) => handleNumberChange('reloadTimeMs')(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <label className="text-sm font-medium">Toggles</label>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Enable hearts</p>
                    <p className="text-xs text-muted-foreground">Show and track health values</p>
                  </div>
                  <Switch
                    checked={config.enableHearts}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, enableHearts: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Friendly fire</p>
                    <p className="text-xs text-muted-foreground">
                      Allow teammates to damage each other
                    </p>
                  </div>
                  <Switch
                    checked={config.friendlyFire}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, friendlyFire: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Enable ammo</p>
                    <p className="text-xs text-muted-foreground">If off, ammo is unlimited</p>
                  </div>
                  <Switch
                    checked={config.enableAmmo}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, enableAmmo: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center">
            <Button onClick={handleCreate} disabled={isPending || !name || !baseGameModeId}>
              {isPending ? 'Creating...' : 'Create gamemode'}
            </Button>
            <p className="text-xs text-muted-foreground">
              New gamemodes are saved to your account and can be selected in Project settings.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom gamemodes</CardTitle>
          <CardDescription>Your saved gamemodes (non-default).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {customModes.length === 0 && (
            <p className="text-sm text-muted-foreground">No custom gamemodes yet.</p>
          )}
          {customModes.map((mode) => (
            <Badge key={mode.id} variant="secondary" className="flex items-center gap-2">
              <span>{mode.name}</span>
              <span className="text-[10px] uppercase text-muted-foreground">custom</span>
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
