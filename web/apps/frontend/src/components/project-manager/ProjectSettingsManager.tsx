'use client'

import { useState, useTransition } from 'react'
import { updateProject } from '@/features/projects/actions'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { GameMode, Project } from './types'

export function ProjectSettingsManager({
  project,
  gameModes,
  onDeleteAction,
}: {
  project: Project
  gameModes: GameMode[]
  onDeleteAction: () => void
}) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  // const [duration, setDuration] = useState(project.duration || 0)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      await updateProject(project.id, {
        name,
        description,
        // duration: Number(duration),
      })
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Project Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={handleSave} disabled={isPending}>
          Save Changes
        </Button>
      </div>

      <div className="pt-6 border-t">
        <h3 className="text-lg font-medium text-destructive mb-2">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting a project is irreversible. All teams, players, and data associated with this
          project will be permanently removed.
        </p>
        <Button variant="destructive" onClick={onDeleteAction}>
          <Trash2 className="w-4 h-4 mr-2" /> Delete Project
        </Button>
      </div>
    </div>
  )
}
