'use client'

import { useState, useTransition } from 'react'
import { addTeam, removeTeam, updateTeam } from '@/features/projects/actions'
import { Edit2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Project, Team } from './types'

export function TeamManager({ project }: { project: Project }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#ff0000')
  const [isPending, startTransition] = useTransition()
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const handleAdd = () => {
    if (!name) return
    startTransition(async () => {
      await addTeam(project.id, name, color)
      setName('')
    })
  }

  const startEditing = (team: Team) => {
    setEditingTeamId(team.id)
    setEditName(team.name)
    setEditColor(team.color)
  }

  const saveEdit = () => {
    if (!editingTeamId || !editName) return
    startTransition(async () => {
      await updateTeam(editingTeamId, { name: editName, color: editColor })
      setEditingTeamId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Team Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Red Team" />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Color</label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 p-1 h-10"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="w-24" />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={isPending || !name}>
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
                />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8"
                />
                <Button size="sm" onClick={saveEdit} disabled={isPending}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingTeamId(null)}>
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
                <Button variant="ghost" size="sm" onClick={() => startEditing(team)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
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
