'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createProject, deleteProject } from '@/features/projects/actions'
import {
  Activity,
  ArrowUpRightIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderX,
  Gamepad2,
  LayoutDashboard,
  Monitor,
  Plug,
  Plus,
  ScrollText,
  Settings,
  Settings2,
  Users,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PanelImperativeHandle } from 'react-resizable-panels'

import { useDeviceConnections } from '@/lib/websocket'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModeAwareConnectionProvider, ModeStatusBar } from '@/components/ModeAwareProvider'

import { DeviceConsole } from './project-manager/DeviceConsole'
import { GameControlPanel } from './project-manager/GameControlPanel'
import { GameModeManager } from './project-manager/GameModeManager'
import { GameOverview } from './project-manager/GameOverviewDnd'
import { PlayerManager } from './project-manager/PlayerManager'
import { ProjectDeviceManager } from './project-manager/ProjectDeviceManager'
import { ProjectSettingsManager } from './project-manager/ProjectSettingsManager'
import { TeamManager } from './project-manager/TeamManager'
import { Device, GameMode, Project } from './project-manager/types'

interface ProjectManagerProps {
  projects: Project[]
  availableDevices: Device[] // Devices in user inventory but not in this project (or all devices)
  gameModes: GameMode[]
}

export function ProjectManager({ projects, availableDevices, gameModes }: ProjectManagerProps) {
  const t = useTranslations('Control')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id || null)
  const [isPending, startTransition] = useTransition()
  const [newProjectName, setNewProjectName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const [localProjects, setLocalProjects] = useState<Project[]>(projects)
  const [localGameModes, setLocalGameModes] = useState<GameMode[]>(gameModes)

  useEffect(() => {
    setLocalProjects(projects)
  }, [projects])

  useEffect(() => {
    setLocalGameModes(gameModes)
  }, [gameModes])

  const selectedProject = localProjects.find((p) => p.id === selectedProjectId)

  const handleCreateProject = () => {
    if (!newProjectName) return
    startTransition(async () => {
      const res = await createProject(newProjectName)
      if (res.success) {
        setNewProjectName('')
        const created = { ...(res.project as any), devices: [], players: [], teams: [] } as Project
        setLocalProjects((prev) => [...prev, created])
        setSelectedProjectId(created.id)
        setMenuOpen(false)
      }
    })
  }

  const handleDeleteProject = (id: string) => {
    if (!confirm(t('projectManager.deleteConfirm'))) return
    startTransition(async () => {
      await deleteProject(id)
      setLocalProjects((prev) => prev.filter((p) => p.id !== id))
      if (selectedProjectId === id) setSelectedProjectId(null)
    })
  }

  useEffect(() => {
    if (!selectedProject && localProjects.length > 0) {
      setSelectedProjectId(localProjects[0].id)
    }
  }, [localProjects, selectedProject])

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
      {localProjects.length === 0 ? (
        <div className="flex items-center justify-center flex-1 p-8">
          <Card className="border-dashed border-3 max-w-md w-full">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderX />
                </EmptyMedia>
                <EmptyTitle>{t('projectManager.noProjects')}</EmptyTitle>
                <EmptyDescription>{t('projectManager.createFirst')}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('projectManager.enterProjectName')}
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleCreateProject}
                    disabled={isPending || !newProjectName}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </EmptyContent>
              <Button variant="link" asChild className="text-muted-foreground" size="sm">
                <a href="#">
                  Learn More <ArrowUpRightIcon />
                </a>
              </Button>
            </Empty>
          </Card>
        </div>
      ) : (
        <ModeAwareConnectionProvider
          key={selectedProject?.id || 'no-selected-project'}
          projectId={selectedProject?.id || ''}
          devices={selectedProject?.devices || []}
          sessionId={selectedProject?.id}
        >
          {/* Project Header Bar */}
          <div className="flex-none px-4 py-1 border-b">
            <ModeStatusBar className="mb-1" />
            <div className="flex items-center justify-between relative">
              <div className="relative">
                <Button
                  variant="ghost"
                  className="px-0 py-0 text-left text-base sm:text-lg font-semibold flex items-center gap-2 h-8"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <span>{selectedProject?.name || t('projectManager.selectProject')}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>

                {menuOpen && (
                  <div className="absolute left-0 top-full mt-2 bg-popover border rounded shadow-lg z-50 w-64">
                    <div className="flex flex-col p-2 max-h-64 overflow-auto">
                      {localProjects.map((project) => (
                        <Button
                          key={project.id}
                          variant={selectedProjectId === project.id ? 'default' : 'ghost'}
                          className="justify-start w-full"
                          onClick={() => {
                            setSelectedProjectId(project.id)
                            setMenuOpen(false)
                          }}
                        >
                          {project.name}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2 p-2 border-t">
                      <Input
                        placeholder={t('projectManager.addNew')}
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        onClick={handleCreateProject}
                        disabled={isPending || !newProjectName}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <Button variant="link" size="sm" asChild>
                <a href="/ws-demo">
                  Test WS
                  <Plug />
                </a>
              </Button>
            </div>
          </div>

          {/* Resizable Three-Panel Layout */}
          {selectedProject && (
            <ProjectLayout
              project={selectedProject}
              availableDevices={availableDevices}
              localGameModes={localGameModes}
              setLocalGameModes={setLocalGameModes}
              handleDeleteProject={handleDeleteProject}
            />
          )}
        </ModeAwareConnectionProvider>
      )}
    </div>
  )
}

function ProjectLayout({
  project,
  availableDevices,
  localGameModes,
  setLocalGameModes,
  handleDeleteProject,
}: {
  project: Project
  availableDevices: Device[]
  localGameModes: GameMode[]
  setLocalGameModes: React.Dispatch<React.SetStateAction<GameMode[]>>
  handleDeleteProject: (id: string) => void
}) {
  const t = useTranslations('Control')
  const [isGameRunning, setIsGameRunning] = useState(false)
  const leftPanelRef = useRef<PanelImperativeHandle>(null)
  const rightPanelRef = useRef<PanelImperativeHandle>(null)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
  const [isRightCollapsed, setIsRightCollapsed] = useState(false)
  const { messageLog } = useDeviceConnections()

  const handleLeftCollapse = () => {
    leftPanelRef.current?.collapse()
    setIsLeftCollapsed(true)
  }

  const handleLeftExpand = () => {
    leftPanelRef.current?.expand()
    setIsLeftCollapsed(false)
  }

  const handleRightCollapse = () => {
    rightPanelRef.current?.collapse()
    setIsRightCollapsed(true)
  }

  const handleRightExpand = () => {
    rightPanelRef.current?.expand()
    setIsRightCollapsed(false)
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
      {/* Left Panel: Game Controls */}
      <ResizablePanel
        defaultSize="25"
        minSize={isLeftCollapsed ? '5' : '20'}
        maxSize={isLeftCollapsed ? '5' : '100'}
        panelRef={leftPanelRef}
      >
        <div className="h-full overflow-hidden relative border-r bg-card">
          {isLeftCollapsed ? (
            <div className="flex flex-col items-center py-4 gap-4 h-full w-full">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleLeftExpand}
                title="Expand Controls"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Activity className="w-5 h-5 text-muted-foreground" />
                <div className="flex flex-col gap-2">
                  {isGameRunning ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <span
                        className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider rotate-180"
                        style={{ writingMode: 'vertical-rl' }}
                      >
                        Live
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      <span
                        className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider rotate-180"
                        style={{ writingMode: 'vertical-rl' }}
                      >
                        Idle
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4 min-w-0 relative">
              <div className="absolute top-2 right-2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleLeftCollapse}
                  title="Collapse Controls"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
              </div>
              <GameControlPanel
                project={project}
                availableGameModes={localGameModes}
                isGameRunning={isGameRunning}
                setIsGameRunning={setIsGameRunning}
              />
            </div>
          )}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Middle Panel: Tabs */}
      <ResizablePanel defaultSize="50" minSize="40">
        <div className="h-full overflow-y-auto p-4 min-w-0">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="w-full justify-start flex-none overflow-x-auto">
              <TabsTrigger value="overview" className="group">
                <LayoutDashboard className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline group-data-[state=active]:inline">
                  {t('projectManager.tabs.overview')}
                </span>
              </TabsTrigger>
              <TabsTrigger value="gamemode" className="group">
                <Settings2 className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline group-data-[state=active]:inline">
                  {t('projectManager.tabs.modes')}
                </span>
              </TabsTrigger>
              <TabsTrigger value="devices" className="group">
                <Monitor className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline group-data-[state=active]:inline">
                  {t('projectManager.tabs.devices')}
                </span>
              </TabsTrigger>
              <TabsTrigger value="teams" className="group">
                <Users className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline group-data-[state=active]:inline">
                  {t('projectManager.tabs.teams')}
                </span>
              </TabsTrigger>
              <TabsTrigger value="players" className="group">
                <Gamepad2 className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline group-data-[state=active]:inline">
                  {t('projectManager.tabs.players')}
                </span>
              </TabsTrigger>
              <TabsTrigger value="project" className="group">
                <Settings className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline group-data-[state=active]:inline">
                  {t('projectManager.tabs.settings')}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 flex-1 overflow-y-auto">
              <GameOverview
                project={project}
                availableDevices={availableDevices}
                availableGameModes={localGameModes}
                isGameRunning={isGameRunning}
                setIsGameRunning={setIsGameRunning}
              />
            </TabsContent>

            <TabsContent value="gamemode" className="mt-4 flex-1 overflow-y-auto">
              <GameModeManager
                gameModes={localGameModes}
                onCreated={(mode) => setLocalGameModes((prev) => [...prev, mode])}
                disabled={isGameRunning}
              />
            </TabsContent>

            <TabsContent value="devices" className="mt-4 flex-1 overflow-y-auto">
              <ProjectDeviceManager
                project={project}
                availableDevices={availableDevices}
                disabled={isGameRunning}
              />
            </TabsContent>

            <TabsContent value="teams" className="mt-4 flex-1 overflow-y-auto">
              <TeamManager project={project} disabled={isGameRunning} />
            </TabsContent>

            <TabsContent value="players" className="mt-4 flex-1 overflow-y-auto">
              <PlayerManager
                project={project}
                devices={project.devices || []}
                disabled={isGameRunning}
              />
            </TabsContent>

            <TabsContent value="project" className="mt-4 flex-1 overflow-y-auto">
              <ProjectSettingsManager
                project={project}
                gameModes={localGameModes}
                onDeleteAction={() => handleDeleteProject(project.id)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right Panel: Device Console */}
      <ResizablePanel
        defaultSize="25"
        minSize={isRightCollapsed ? '5' : '20'}
        maxSize={isRightCollapsed ? '5' : '100'}
        panelRef={rightPanelRef}
      >
        <div className="h-full overflow-hidden relative border-l bg-card">
          {isRightCollapsed ? (
            <div className="flex flex-col items-center py-4 gap-4 h-full w-full">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRightExpand}
                title="Expand Console"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <div className="relative">
                  <ScrollText className="w-5 h-5 text-muted-foreground" />
                  {messageLog.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center">
                      {messageLog.length > 99 ? '99+' : messageLog.length}
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider rotate-180"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  Logs
                </span>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden p-4 min-w-0 flex flex-col">
              <div className="absolute top-2 left-2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleRightCollapse}
                  title="Collapse Console"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex-1 min-h-0 pt-4">
                <DeviceConsole />
              </div>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
