'use client'

import dynamic from 'next/dynamic'

import type { GameMode, Project } from './project-manager/types'

// Dynamic import with ssr: false to avoid @dnd-kit hydration mismatch
const ProjectManager = dynamic(
  () => import('@/components/ProjectManager').then((mod) => mod.ProjectManager),
  {
    ssr: false,
  }
)

interface ProjectManagerClientProps {
  projects: Project[]
  gameModes: GameMode[]
}

export function ProjectManagerClient({
  projects,
  gameModes,
}: ProjectManagerClientProps) {
  return (
    <ProjectManager projects={projects} gameModes={gameModes} />
  )
}
