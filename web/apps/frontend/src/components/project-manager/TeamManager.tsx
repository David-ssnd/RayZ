'use client'

import { useState, useTransition } from 'react'
import { addTeam, removeTeam, updateTeam } from '@/features/projects/actions'
import { Edit2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Project, Team } from './types'

export function TeamManager({ project, disabled = false }: { project: Project; disabled?: boolean }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#ff0000')
  const [isPending, startTransition] = useTransition()
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const handleAdd = () => {
    if (!name || disabled) return
    startTransition(async () => {
      await addTeam(project.id, name, color)
      setName('')
    })
  }

  const startEditing = (team: Team) => {
    if (disabled) return
    setEditingTeamId(team.id)
    setEditName(team.name)
    setEditColor(team.color)
  }

  const saveEdit = () => {
    if (!editingTeamId || !editName || disabled) return
    startTransition(async () => {
      await updateTeam(editingTeamId, { name: editName, color: editColor })
      setEditingTeamId(null)
    })
  }

  return (
    <div className="space-y-4">
      {disabled && (
        <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
          Team editing is disabled while the game is running.
        </div>
      )}
      <div className="flex gap-2 items-end">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Team Name</label>
          <Input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Red Team" 
            disabled={disabled}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Color</label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 p-1 h-10"
              disabled={disabled}
            />
            <Input 
              value={color} 
              onChange={(e) => setColor(e.target.value)} 
              className="w-24" 
              disabled={disabled}
            />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={isPending || !name || disabled}>
          Add Team
        </Button>
      </div>

      <div className="grid gap-2">
        {project.teams.map((team: Team) => (
          <div key={team.id} className="flex items-center justify-between p-3 border rounded-md">
            {editingTeamId === team.id ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-8 p-0 h-8 border-none"
                  disabled={disabled}
                />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8"
                  disabled={disabled}
                />
                <Button size="sm" onClick={saveEdit} disabled={isPending || disabled}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingTeamId(null)} disabled={disabled}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                <span className="font-medium">{team.name}</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              {!editingTeamId && (
                <Button variant="ghost" size="sm" onClick={() => startEditing(team)} disabled={disabled}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() =>
                  startTransition(async () => {
                    await removeTeam(team.id)
                  })
                }
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {project.teams.length === 0 && (
          <div className="text-sm text-muted-foreground">No teams added yet.</div>
        )}
      </div>
    </div>
  )
}
