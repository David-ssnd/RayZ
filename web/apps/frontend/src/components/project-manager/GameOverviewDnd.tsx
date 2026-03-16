'use client'

import { Fragment, useCallback, useMemo, useOptimistic, useState, useTransition } from 'react'
import {
  reorderPlayers,
  reorderTeams,
  updatePlayerDevices,
  updatePlayerTeam,
} from '@/features/projects/actions'
import {
  closestCenter,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  UniqueIdentifier,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Activity,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Gamepad2,
  GripVertical,
  Heart,
  Loader2,
  Monitor,
  Plus,
  RotateCcw,
  Send,
  Shield,
  Square,
  Target,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useDeviceConnections } from '@/lib/websocket'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { AddPlayerDialog, AddTeamDialog } from './AddDialogs'
import { buildAssignmentConfig, sendConfigToAffectedDevices } from './buildAssignmentConfig'
import { GameModeManager } from './GameModeManager'
import { LiveGameStats } from './LiveGameStats'
import type { Device, GameMode, Player, Project, Team } from './types'

interface GameOverviewProps {
  project: Project
  availableGameModes?: GameMode[]
  isGameRunning: boolean
  setIsGameRunning: (running: boolean) => void
  gameStartedAt?: Date | null
  isGameOver?: boolean
  selectedGameMode?: GameMode
  playerStats?: any[]
  connectedDevices?: any[]
}

type DraggableType = 'team' | 'player' | 'device'

// ==================== DROPPABLE ZONE ====================

function DroppableZone({
  id,
  children,
  className,
  disabled = false,
}: {
  id: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        'transition-colors duration-100',
        isOver && !disabled && 'bg-accent/30'
      )}
    >
      {children}
    </div>
  )
}

// ==================== DEVICE PREVIEW ====================

function DevicePreview({
  device,
  getDeviceConnectionState,
}: {
  device: Device
  getDeviceConnectionState: (ipAddress: string) => string
}) {
  const isOnline = device.ipAddress ? getDeviceConnectionState(device.ipAddress) === 'connected' : false
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-background border text-xs">
      {isOnline ? (
        <Wifi className="w-3 h-3 text-emerald-500" />
      ) : (
        <WifiOff className="w-3 h-3 text-muted-foreground" />
      )}
      <Monitor className="w-3 h-3" />
      <span className="truncate max-w-20">{device.name || device.ipAddress}</span>
    </div>
  )
}

// ==================== SORTABLE DEVICE ====================

function SortableDevice({
  device,
  getDeviceConnectionState,
  hidden,
}: {
  device: Device
  getDeviceConnectionState: (ipAddress: string) => string
  hidden?: boolean
}) {
  if (hidden) return null

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `device-${device.id}`,
    data: { type: 'device', device },
    disabled: false,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  }

  const isOnline = device.ipAddress ? getDeviceConnectionState(device.ipAddress) === 'connected' : false

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-md bg-background border text-xs cursor-grab',
        isDragging && 'opacity-50'
      )}
    >
      {isOnline ? (
        <Wifi className="w-3 h-3 text-emerald-500" />
      ) : (
        <WifiOff className="w-3 h-3 text-muted-foreground" />
      )}
      <Monitor className="w-3 h-3" />
      <span className="truncate max-w-24">{device.name || device.ipAddress}</span>
    </div>
  )
}

// ==================== PLAYER PREVIEW ====================

function PlayerPreview({ player, teamColor }: { player: Player; teamColor?: string }) {
  return (
    <div className="flex flex-col gap-1 p-2 rounded bg-muted/30 border border-dashed opacity-70">
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground opacity-50" />
        <Gamepad2 className="w-4 h-4" style={{ color: teamColor }} />
        <span className="font-medium">{player.name}</span>
        <Badge variant="outline" className="text-xs">
          ID: {player.number}
        </Badge>
      </div>
      <div className="ml-6 flex flex-wrap gap-1 min-h-6">
        <span className="text-xs text-muted-foreground italic">Drop devices here</span>
      </div>
    </div>
  )
}

// ==================== SORTABLE PLAYER ====================

function SortablePlayer({
  player,
  teamColor,
  devices,
  getDeviceConnectionState,
  activeId,
  overId,
  project,
}: {
  player: Player
  teamColor?: string
  devices: Device[]
  getDeviceConnectionState: (ipAddress: string) => string
  activeId: UniqueIdentifier | null
  overId: UniqueIdentifier | null
  project: Project
}) {
  const isBeingDragged = activeId === `player-${player.id}`

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `player-${player.id}`,
    data: { type: 'player', player },
    disabled: false,
  })

  // Hide the element visually when dragging — overlay shows it
  // Using opacity-0 makes it invisible but still takes layout space for dnd-kit.

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (isBeingDragged) {
    // Default: just make it faint, overlay handles the visual
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-col gap-1 p-2 rounded bg-muted/30 border',
        'transition-opacity',
        isDragging && 'opacity-20' // Make it very faint when dragging
      )}
    >
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab touch-none">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <Gamepad2 className="w-4 h-4" style={{ color: teamColor }} />
        <span className="font-medium">{player.name}</span>
        <Badge variant="outline" className="text-xs">
          ID: {player.number}
        </Badge>
      </div>

      {/* Devices droppable area */}
      <DroppableZone
        id={`player-devices-${player.id}`}
        className="ml-6 flex flex-wrap gap-1 min-h-6 p-1 rounded transition-colors"
        disabled={!!activeId && !activeId.toString().startsWith('device-')}
      >
        <SortableContext
          items={devices.map((d) => `device-${d.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {devices.length > 0
            ? devices.map((device) => (
                <SortableDevice
                  key={device.id}
                  device={device}
                  getDeviceConnectionState={getDeviceConnectionState}
                  hidden={activeId === `device-${device.id}`}
                />
              ))
            : null}
          {activeId?.toString().startsWith('device-') &&
            overId === `player-devices-${player.id}` && (
              <DevicePreview
                device={
                  project.devices?.find(
                    (d) => d.id === activeId.toString().replace('device-', '')
                  ) as Device
                }
                getDeviceConnectionState={getDeviceConnectionState}
              />
            )}
          {devices.length === 0 && overId !== `player-devices-${player.id}` && (
            <span className="text-xs text-muted-foreground italic">Drop devices here</span>
          )}
        </SortableContext>
      </DroppableZone>
    </div>
  )
}

// ==================== SORTABLE TEAM ====================

function SortableTeam({
  team,
  players,
  isExpanded,
  onToggle,
  getDevicesForPlayer,
  getDeviceConnectionState,
  activeId,
  overId,
  project,
}: {
  team: Team
  players: Player[]
  isExpanded: boolean
  onToggle: () => void
  getDevicesForPlayer: (player: Player) => Device[]
  getDeviceConnectionState: (ipAddress: string) => string
  activeId: UniqueIdentifier | null
  overId: UniqueIdentifier | null
  project: Project
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `team-${team.id}`,
    data: { type: 'team', team },
    disabled: false,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  }

  const teamDevices = players.flatMap((p) => getDevicesForPlayer(p))
  const onlineDevices = teamDevices.filter(
    (d) => d.ipAddress && getDeviceConnectionState(d.ipAddress) === 'connected'
  )

  // Logic to determine where to show the preview
  const activePlayerId =
    activeId && String(activeId).startsWith('player-')
      ? String(activeId).replace('player-', '')
      : null
  // Use loose equality or String() conversion to find player, as IDs might be numbers
  const activePlayer = activePlayerId
    ? project.players?.find((p) => String(p.id) === activePlayerId)
    : null

  // Only show preview if dragging a player NOT already in this team (cross-list drag)
  const isDraggingCrossTeam =
    activePlayer && (!players.find((p) => String(p.id) === activePlayerId) || !activePlayerId)

  const isOverTeam = overId === `team-${team.id}`
  const isOverPlayerInTeam =
    overId &&
    String(overId).startsWith('player-') &&
    players.some((p) => `player-${p.id}` === String(overId))

  // Show preview if over team container OR over any player in this team
  const showPreview = activePlayer && isDraggingCrossTeam && (isOverTeam || isOverPlayerInTeam)

  // Calculate insertion index
  // For cross-team drags, closestCenter returns the item whose center is closest.
  // When pointer passes item midpoint, overId switches to next item.
  // So inserting BEFORE the hovered item gives correct visual positioning.
  let previewIndex = players.length
  if (isOverPlayerInTeam && overId) {
    const overIdStr = String(overId).replace('player-', '')
    const idx = players.findIndex((p) => String(p.id) === overIdStr)
    if (idx !== -1) previewIndex = idx
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('overflow-hidden rounded border bg-card', isDragging && 'opacity-50')}
    >
      {/* Team Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
        <button {...attributes} {...listeners} className="cursor-grab touch-none">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={onToggle} className="flex items-center gap-2 flex-1">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
          <span className="font-medium truncate">{team.name}</span>
        </button>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{players.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Monitor className="w-4 h-4" />
            <span>
              {onlineDevices.length}/{teamDevices.length}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Content - Players droppable area */}
      {isExpanded && (
        <DroppableZone
          id={`team-${team.id}`}
          className="p-2 min-h-[60px] bg-background/50"
          disabled={!!activeId && !activeId.toString().startsWith('player-')}
        >
          <SortableContext
            items={players.map((p) => `player-${p.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {players.length > 0 ? (
              <div className="space-y-1">
                {players.map((player, index) => (
                  <Fragment key={player.id}>
                    {showPreview && index === previewIndex && (
                      <div className="mb-1">
                        <PlayerPreview player={activePlayer as Player} teamColor={team.color} />
                      </div>
                    )}
                    <SortablePlayer
                      player={player}
                      teamColor={team.color}
                      devices={getDevicesForPlayer(player)}
                      getDeviceConnectionState={getDeviceConnectionState}
                      activeId={activeId}
                      overId={overId}
                      project={project}
                    />
                  </Fragment>
                ))}
                {/* Append Preview if at the end */}
                {showPreview && previewIndex === players.length && (
                  <PlayerPreview player={activePlayer as Player} teamColor={team.color} />
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded">
                Drop players here
              </div>
            )}
            {/* Show preview even if empty list */}
            {players.length === 0 && showPreview && (
              <PlayerPreview player={activePlayer as Player} teamColor={team.color} />
            )}
          </SortableContext>
        </DroppableZone>
      )}
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

type OptimisticAction =
  | { type: 'REORDER_TEAMS'; newOrder: string[] }
  | {
      type: 'MOVE_PLAYER'
      playerId: string
      targetTeamId: string | null
      newTeamOrder: string[]
    }
  | { type: 'MOVE_DEVICE'; deviceId: string; targetPlayerId: string | null }

export function GameOverview({
  project,
  availableGameModes = [],
  isGameRunning,
  setIsGameRunning,
  gameStartedAt,
  isGameOver = false,
  selectedGameMode,
  playerStats = [],
  connectedDevices = [],
}: GameOverviewProps) {
  const [optimisticProject, addOptimisticUpdate] = useOptimistic(
    project,
    (state: Project, action: OptimisticAction) => {
      const newState = { ...state }

      switch (action.type) {
        case 'REORDER_TEAMS': {
          if (newState.teams) {
            newState.teams = [...newState.teams].sort(
              (a, b) => action.newOrder.indexOf(a.id) - action.newOrder.indexOf(b.id)
            )
          }
          break
        }
        case 'MOVE_PLAYER': {
          if (!newState.players) break

          const playerCpy = newState.players.find((p) => p.id === action.playerId)
          if (!playerCpy) break

          const remainingPlayers = newState.players.filter((p) => p.id !== action.playerId)
          const updatedPlayer = { ...playerCpy, teamId: action.targetTeamId }

          if (action.targetTeamId === null) {
            newState.players = [...remainingPlayers, updatedPlayer]
          } else {
            const targetTeamPlayersMap = new Map<string, Player>()
            remainingPlayers.forEach((p) => {
              if (p.teamId === action.targetTeamId) targetTeamPlayersMap.set(p.id, p)
            })
            targetTeamPlayersMap.set(updatedPlayer.id, updatedPlayer)

            const sortedTargetTeam = action.newTeamOrder
              .map((id) => targetTeamPlayersMap.get(id))
              .filter((p): p is Player => !!p)

            const finalOthers = remainingPlayers.filter((p) => p.teamId !== action.targetTeamId)
            newState.players = [...finalOthers, ...sortedTargetTeam]
          }
          break
        }
        case 'MOVE_DEVICE': {
          if (!newState.devices) break
          newState.devices = newState.devices.map((d) =>
            d.id === action.deviceId ? { ...d, assignedPlayerId: action.targetPlayerId } : d
          )
          break
        }
      }
      return newState
    }
  )

  const { connections } = useDeviceConnections()

  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(
    () => new Set(project.teams?.map((t) => t.id) || [])
  )
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null)
  const [isPending, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Collision detection - closestCenter works best for vertical sortable lists
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    // For device drags, prefer pointerWithin for precise drop zones
    const activeType = args.active.id ? String(args.active.id).split('-')[0] : ''
    if (activeType === 'device') {
      const pointerCollisions = pointerWithin(args)
      if (pointerCollisions.length > 0) return pointerCollisions
    }

    // closestCenter naturally transitions between items at their midpoint
    return closestCenter(args)
  }, [])

  // Helper functions
  const getPlayersInTeam = useCallback(
    (teamId: string): Player[] => {
      return optimisticProject.players?.filter((p: Player) => p.teamId === teamId) || []
    },
    [optimisticProject.players]
  )

  const getPlayersWithoutTeam = useCallback((): Player[] => {
    return optimisticProject.players?.filter((p: Player) => !p.teamId) || []
  }, [optimisticProject.players])

  const getDevicesForPlayer = useCallback(
    (player: Player): Device[] => {
      return (
        optimisticProject.devices?.filter((d: Device) => d.assignedPlayerId === player.id) || []
      )
    },
    [optimisticProject.devices]
  )

  const getUnassignedDevices = useCallback((): Device[] => {
    return optimisticProject.devices?.filter((d: Device) => !d.assignedPlayerId) || []
  }, [optimisticProject.devices])

  const getDeviceConnectionState = useCallback(
    (ipAddress: string) => {
      return connections.get(ipAddress)?.state.connectionState || 'disconnected'
    },
    [connections]
  )

  // Toggle functions
  const toggleTeam = (teamId: string) => {
    const newExpanded = new Set(expandedTeams)
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId)
    } else {
      newExpanded.add(teamId)
    }
    setExpandedTeams(newExpanded)
  }

  const expandAll = () => {
    setExpandedTeams(new Set(optimisticProject.teams?.map((t) => t.id) || []))
  }

  const collapseAll = () => {
    setExpandedTeams(new Set())
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
  }

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverId(null)

    if (!over || active.id === over.id) return

    const activeType = String(active.id).split('-')[0] as DraggableType
    const overId = String(over.id)

    if (activeType === 'team') {
      const teamIds = optimisticProject.teams?.map((t) => t.id) || []
      const activeIndex = teamIds.indexOf(String(active.id).replace('team-', ''))
      const overIndex = teamIds.indexOf(overId.replace('team-', ''))

      if (activeIndex !== -1 && overIndex !== -1) {
        const newOrder = arrayMove(teamIds, activeIndex, overIndex)
        startTransition(async () => {
          addOptimisticUpdate({ type: 'REORDER_TEAMS', newOrder })
          await reorderTeams(project.id, newOrder)
        })
      }
    } else if (activeType === 'player') {
      const playerId = String(active.id).replace('player-', '')

      // Determine target team
      let targetTeamId: string | null = null
      if (overId.startsWith('team-')) {
        targetTeamId = overId.replace('team-', '')
      } else if (overId.startsWith('player-')) {
        const overPlayerId = overId.replace('player-', '')
        const overPlayer = optimisticProject.players?.find((p) => String(p.id) === overPlayerId)
        targetTeamId = overPlayer?.teamId || null
      } else if (overId === 'unassigned-players') {
        targetTeamId = null
      }

      // Calculate new order logic
      const targetPlayers = targetTeamId
        ? optimisticProject.players?.filter((p) => p.teamId === targetTeamId) || []
        : optimisticProject.players?.filter((p) => !p.teamId) || []

      const targetIds = targetPlayers.map((p) => String(p.id))
      const activeIndex = targetIds.indexOf(playerId)

      let overIndex = -1
      if (overId.startsWith('player-')) {
        const overPlayerId = overId.replace('player-', '')
        overIndex = targetIds.indexOf(overPlayerId)
      } else {
        // Dropped on container/header -> append
        overIndex = targetIds.length
      }

      let newTeamOrder = [...targetIds]
      if (activeIndex !== -1) {
        // Reorder within same team
        if (overIndex !== -1) {
          newTeamOrder = arrayMove(targetIds, activeIndex, overIndex)
        }
      } else {
        // Move to new team
        // Ensure index is valid
        const insertIndex = Math.min(Math.max(0, overIndex), targetIds.length)
        newTeamOrder.splice(insertIndex, 0, playerId)
      }

      startTransition(async () => {
        addOptimisticUpdate({
          type: 'MOVE_PLAYER',
          playerId,
          targetTeamId,
          newTeamOrder,
        })

        const player = project.players?.find((p) => p.id === playerId)
        if (player && player.teamId !== targetTeamId) {
          await updatePlayerTeam(playerId, targetTeamId)

          // Send config to all of that player's devices with new team
          const updatedProject = {
            ...project,
            players: (project.players || []).map((p) =>
              p.id === playerId ? { ...p, teamId: targetTeamId } : p
            ),
          }
          sendConfigToAffectedDevices(connections, updatedProject, (device) =>
            device.assignedPlayerId === playerId
          )
        }
        await reorderPlayers(project.id, newTeamOrder)
      })
    } else if (activeType === 'device') {
      const deviceId = String(active.id).replace('device-', '')
      const device = optimisticProject.devices?.find((d) => d.id === deviceId)
      if (!device) return

      // Determine target player
      let targetPlayerId: string | null = null
      if (overId.startsWith('player-devices-')) {
        // Dropped on player's device zone
        targetPlayerId = overId.replace('player-devices-', '')
      } else if (overId.startsWith('player-')) {
        // Dropped directly on player (shouldn't happen with droppable zones, but handle it)
        targetPlayerId = overId.replace('player-', '')
      } else if (overId.startsWith('device-')) {
        // Dropped on another device - assign to same player as that device
        const overDeviceId = overId.replace('device-', '')
        const overDevice = optimisticProject.devices?.find((d) => d.id === overDeviceId)
        targetPlayerId = overDevice?.assignedPlayerId || null
      } else if (overId === 'unassigned-devices') {
        targetPlayerId = null
      }

      // Update device assignment
      if (device.assignedPlayerId !== targetPlayerId) {
        startTransition(async () => {
          addOptimisticUpdate({
            type: 'MOVE_DEVICE',
            deviceId,
            targetPlayerId,
          })

          // Remove from old player if assigned
          if (device.assignedPlayerId) {
            const oldPlayer = optimisticProject.players?.find(
              (p) => p.id === device.assignedPlayerId
            )
            if (oldPlayer) {
              const oldPlayerDevices = getDevicesForPlayer(oldPlayer)
                .filter((d) => d.id !== deviceId)
                .map((d) => d.id)
              await updatePlayerDevices(device.assignedPlayerId, oldPlayerDevices)
            }

            // Send "unassigned" config to the removed device
            if (device.ipAddress) {
              const conn = connections.get(device.ipAddress)
              if (conn) {
                conn.updateConfig({
                  player_id: 0,
                  team_id: 0,
                  device_id: device.deviceId,
                  color_rgb: undefined,
                })
              }
            }
          }

          // Add to new player if target exists
          if (targetPlayerId) {
            const newPlayer = optimisticProject.players?.find((p) => p.id === targetPlayerId)
            if (newPlayer) {
              const newPlayerDevices = getDevicesForPlayer(newPlayer).map((d) => d.id)
              await updatePlayerDevices(targetPlayerId, [...newPlayerDevices, deviceId])

              // Send config to device immediately after assignment
              if (device.ipAddress) {
                const conn = connections.get(device.ipAddress)
                if (conn) {
                  const team = optimisticProject.teams?.find((t) => t.id === newPlayer.teamId)
                  const gm = selectedGameMode ?? optimisticProject.gameMode
                  conn.updateConfig(buildAssignmentConfig(newPlayer, team, device, gm, optimisticProject.players))
                }
              }
            }
          }
        })
      }
    }
  }

  // Get active drag item for overlay
  const getActiveDragItem = () => {
    if (!activeId) return null
    const [type, id] = String(activeId).split('-')

    if (type === 'team') {
      const team = optimisticProject.teams?.find((t) => t.id === id)
      return team ? { type: 'team', data: team } : null
    } else if (type === 'player') {
      const player = optimisticProject.players?.find((p) => p.id === id)
      return player ? { type: 'player', data: player } : null
    } else if (type === 'device') {
      const device = optimisticProject.devices?.find((d) => d.id === id)
      return device ? { type: 'device', data: device } : null
    }
    return null
  }

  const activeDragItem = getActiveDragItem()
  const playersWithoutTeam = getPlayersWithoutTeam()
  const unassignedDevices = getUnassignedDevices()

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Teams Section */}
        {!isGameRunning && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Teams & Players
              </h3>
              <div className="flex items-center gap-1">
                {/* Expand/Collapse buttons */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={expandAll}
                  title="Expand All"
                >
                  <ChevronsUpDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={collapseAll}
                  title="Collapse All"
                >
                  <ChevronsDownUp className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Two-column layout: Active (left) | Unassigned (right) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 min-w-0">
              {/* Left side - Active Teams */}
              <div className="xl:col-span-2 space-y-2 min-w-0">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Active Teams
                  <AddTeamDialog
                    projectId={optimisticProject.id}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
                        <Plus className="w-3 h-3" />
                        Add Team
                      </Button>
                    }
                  />
                </h4>
                {optimisticProject.teams?.length > 0 ? (
                  <SortableContext
                    items={optimisticProject.teams.map((t) => `team-${t.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {optimisticProject.teams.map((team) => (
                        <SortableTeam
                          key={team.id}
                          team={team}
                          players={getPlayersInTeam(team.id)}
                          isExpanded={expandedTeams.has(team.id)}
                          onToggle={() => toggleTeam(team.id)}
                          getDevicesForPlayer={getDevicesForPlayer}
                          getDeviceConnectionState={getDeviceConnectionState}
                          activeId={activeId}
                          overId={overId}
                          project={optimisticProject}
                        />
                      ))}
                    </div>
                  </SortableContext>
                ) : (
                  <div className="min-h-[100px] p-4 rounded border-2 border-dashed bg-muted/20 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground text-center">
                      No teams yet. Add a team to get started.
                    </p>
                  </div>
                )}
              </div>

              {/* Right side - Unassigned */}
              <div className="space-y-4 min-w-0">
                {/* Unassigned Players */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" />
                    Unassigned Players
                    <AddPlayerDialog
                      project={optimisticProject}
                      trigger={
                        <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
                          <Plus className="w-3 h-3" />
                          Add Player
                        </Button>
                      }
                    />
                  </h4>
                  <SortableContext
                    items={playersWithoutTeam.map((p) => `player-${p.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableZone
                      id="unassigned-players"
                      className={cn(
                        'min-h-[80px] p-2 rounded border-2 border-dashed',
                        playersWithoutTeam.length === 0 && 'bg-muted/20'
                      )}
                    >
                      <div className="space-y-1">
                        {playersWithoutTeam.length > 0 &&
                          playersWithoutTeam.map((player) => (
                            <SortablePlayer
                              key={player.id}
                              player={player}
                              devices={getDevicesForPlayer(player)}
                              getDeviceConnectionState={getDeviceConnectionState}
                              activeId={activeId}
                              overId={overId}
                              project={optimisticProject}
                            />
                          ))}
                        {/* Player Preview - Only if NOT in this list already */}
                        {activeId?.toString().startsWith('player-') &&
                          overId === 'unassigned-players' &&
                          !playersWithoutTeam.some(
                            (p) => p.id === activeId.toString().replace('player-', '')
                          ) && (
                            <PlayerPreview
                              player={
                                optimisticProject.players?.find(
                                  (p) => p.id === activeId.toString().replace('player-', '')
                                ) as Player
                              }
                            />
                          )}
                      </div>
                      {playersWithoutTeam.length === 0 &&
                        !(
                          activeId?.toString().startsWith('player-') &&
                          overId === 'unassigned-players'
                        ) && (
                          <div className="text-xs text-muted-foreground text-center py-4">
                            Drop players here
                          </div>
                        )}
                    </DroppableZone>
                  </SortableContext>
                </div>

                {/* Unassigned Devices */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Unassigned Devices
                  </h4>
                  <SortableContext
                    items={unassignedDevices.map((d) => `device-${d.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableZone
                      id="unassigned-devices"
                      className={cn(
                        'min-h-[60px] p-2 rounded border-2 border-dashed flex flex-wrap gap-1',
                        unassignedDevices.length === 0 && 'bg-muted/20'
                      )}
                    >
                      {unassignedDevices.length > 0 ? (
                        unassignedDevices.map((device) => (
                          <SortableDevice
                            key={device.id}
                            device={device}
                            getDeviceConnectionState={getDeviceConnectionState}
                          />
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-2 w-full">
                          Drop devices here
                        </div>
                      )}
                    </DroppableZone>
                  </SortableContext>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {(!optimisticProject.teams || optimisticProject.teams.length === 0) &&
              (!optimisticProject.players || optimisticProject.players.length === 0) &&
              (!optimisticProject.devices || optimisticProject.devices.length === 0) && (
                <Card>
                  <CardContent className="py-6 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No teams, players or devices configured.</p>
                    <p className="text-sm">
                      Use the buttons above to add teams, players, and devices.
                    </p>
                  </CardContent>
                </Card>
              )}
          </>
        )}

        {/* Live Game Stats - shown when game is running */}
        {isGameRunning && selectedGameMode && (
          <div className="space-y-4">
            {/* Overall Statistics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center p-3 rounded-md bg-muted/50">
                <Target className="w-5 h-5 mb-1 text-red-500" />
                <span className="text-2xl font-semibold">
                  {connectedDevices.reduce((sum, d) => sum + (d.kills || 0), 0)}
                </span>
                <span className="text-xs text-muted-foreground">Total Kills</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-md bg-muted/50">
                <Heart className="w-5 h-5 mb-1 text-rose-500" />
                <span className="text-2xl font-semibold">
                  {connectedDevices.reduce((sum, d) => sum + (d.deaths || 0), 0)}
                </span>
                <span className="text-xs text-muted-foreground">Total Deaths</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-md bg-muted/50">
                <Zap className="w-5 h-5 mb-1 text-yellow-500" />
                <span className="text-2xl font-semibold">
                  {connectedDevices.reduce((sum, d) => sum + (d.shots || 0), 0)}
                </span>
                <span className="text-xs text-muted-foreground">Total Shots</span>
              </div>
            </div>

            {/* Leaderboard */}
            <LiveGameStats
              winType={selectedGameMode.winType as any}
              targetScore={selectedGameMode.targetScore}
              durationMinutes={selectedGameMode.durationMinutes}
              gameStartedAt={gameStartedAt || undefined}
              players={playerStats}
              isGameRunning={isGameRunning}
              isGameOver={isGameOver}
            />
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragItem && (
          <div className="opacity-80">
            {activeDragItem.type === 'team' && (
              <div className="px-3 py-2 rounded border bg-card shadow-lg">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: (activeDragItem.data as Team).color }}
                  />
                  <span className="font-medium">{(activeDragItem.data as Team).name}</span>
                </div>
              </div>
            )}
            {activeDragItem.type === 'player' && (
              <div className="px-2 py-1.5 rounded border bg-card shadow-lg">
                <div className="flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span className="font-medium text-xs">
                    {(activeDragItem.data as Player).name}
                  </span>
                </div>
              </div>
            )}
            {activeDragItem.type === 'device' && (
              <div className="px-2 py-1 rounded border bg-card shadow-lg text-xs">
                <div className="flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  <span>
                    {(activeDragItem.data as Device).name ||
                      (activeDragItem.data as Device).ipAddress}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
