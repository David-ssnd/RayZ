'use client'

import dynamic from 'next/dynamic'

import type { Device, GameMode, Project } from './project-manager/types'

// Dynamic import with ssr: false to avoid @dnd-kit hydration mismatch
const ProjectManager = dynamic(
  () => import('@/components/ProjectManager').then((mod) => mod.ProjectManager),
  {
    ssr: false,
  }
)

interface ProjectManagerClientProps {
  projects: Project[]
  availableDevices: Device[]
  gameModes: GameMode[]
}

export function ProjectManagerClient({
  projects,
  availableDevices,
  gameModes,
}: ProjectManagerClientProps) {
  return (
    <ProjectManager projects={projects} availableDevices={availableDevices} gameModes={gameModes} />
  )
}
