'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

import { prisma } from '@/lib/server/prisma'

type GameModeOverrides = {
  durationSeconds?: number
  enableHearts?: boolean
  maxHearts?: number
  spawnHearts?: number
  respawnTimeSec?: number
  friendlyFire?: boolean
  damageIn?: number
  damageOut?: number
  enableAmmo?: boolean
  maxAmmo?: number
  reloadTimeMs?: number
}

// --- Projects ---

export async function getProjects() {
  const session = await auth()
  if (!session?.user?.id) return []

  return prisma.project.findMany({
    where: { userId: session.user.id },
    include: {
      gameMode: true,
      teams: {
        orderBy: { order: 'asc' },
      },
      players: {
        orderBy: { order: 'asc' },
        include: {
          team: true,
          devices: {
            orderBy: { order: 'asc' },
          },
        },
      },
      devices: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function createProject(name: string, gameModeName: string = 'Standard') {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    // Ensure GameMode exists
    let gameMode = await prisma.gameMode.findUnique({ where: { name: gameModeName } })
    if (!gameMode) {
      gameMode = await prisma.gameMode.create({ data: { name: gameModeName } })
    }

    const project = await prisma.project.create({
      data: {
        name,
        userId: session.user.id,
        gameModeId: gameMode.id,
      },
    })

    revalidatePath('/control')
    return { success: true, project }
  } catch (error) {
    console.error('Error creating project:', error)
    return { error: 'Failed to create project' }
  }
}

export async function updateProject(
  projectId: string,
  data: { name?: string; description?: string; gameModeId?: string }
) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const project = await prisma.project.update({
      where: { id: projectId, userId: session.user.id },
      data,
    })
    revalidatePath('/control')
    return { success: true, project }
  } catch (error) {
    return { error: 'Failed to update project' }
  }
}

export async function getGameModes() {
  const session = await auth()
  const userId = session?.user?.id

  return prisma.gameMode.findMany({
    where: userId
      ? {
          OR: [
            { isSystem: true },
            { userId },
            // Allow legacy global modes that are not marked as system and have no owner
            { userId: null, isSystem: false },
          ],
        }
      : { isSystem: true },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })
}

export async function createCustomGameMode({
  name,
  description,
  baseGameModeId,
  overrides = {},
}: {
  name: string
  description?: string
  baseGameModeId: string
  overrides?: GameModeOverrides
}) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { error: 'Unauthorized' }

  const base = await prisma.gameMode.findUnique({ where: { id: baseGameModeId } })
  const canUseBase = base && (base.isSystem || base.userId === userId || base.userId === null)
  if (!base || !canUseBase) return { error: 'Base game mode not found' }

  try {
    const gameMode = await prisma.gameMode.create({
      data: {
        name,
        description: description ?? base.description,
        isSystem: false,
        userId,
        durationSeconds: overrides.durationSeconds ?? base.durationSeconds,
        enableHearts: overrides.enableHearts ?? base.enableHearts,
        maxHearts: overrides.maxHearts ?? base.maxHearts,
        spawnHearts: overrides.spawnHearts ?? base.spawnHearts,
        respawnTimeSec: overrides.respawnTimeSec ?? base.respawnTimeSec,
        friendlyFire: overrides.friendlyFire ?? base.friendlyFire,
        damageIn: overrides.damageIn ?? base.damageIn,
        damageOut: overrides.damageOut ?? base.damageOut,
        enableAmmo: overrides.enableAmmo ?? base.enableAmmo,
        maxAmmo: overrides.maxAmmo ?? base.maxAmmo,
        reloadTimeMs: overrides.reloadTimeMs ?? base.reloadTimeMs,
      },
    })

    revalidatePath('/control')
    return { success: true, gameMode }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { error: 'A game mode with this name already exists' }
    }
    console.error('Error creating game mode:', error)
    return { error: 'Failed to create game mode' }
  }
}

export async function deleteProject(projectId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    await prisma.project.delete({
      where: { id: projectId, userId: session.user.id },
    })
    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to delete project' }
  }
}

// --- Teams ---

export async function addTeam(projectId: string, name: string, color: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: session.user.id },
    })
    if (!project) return { error: 'Project not found' }

    // Assign the lowest available team number between 1-255 within the project
    const existingTeams = await prisma.team.findMany({
      where: { projectId },
      select: { number: true },
    })
    const usedNumbers = new Set(existingTeams.map((t) => t.number))
    let nextNumber = 1
    while (nextNumber <= 255 && usedNumbers.has(nextNumber)) {
      nextNumber++
    }
    if (nextNumber > 255) return { error: 'Maximum teams reached' }

    const team = await prisma.team.create({
      data: {
        name,
        color,
        number: nextNumber,
        projectId,
      },
    })
    revalidatePath('/control')
    return { success: true, team }
  } catch (error) {
    return { error: 'Failed to add team' }
  }
}

export async function updateTeam(teamId: string, data: { name?: string; color?: string }) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { project: true },
    })
    if (!team || team.project.userId !== session.user.id) return { error: 'Unauthorized' }

    await prisma.team.update({
      where: { id: teamId },
      data,
    })
    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to update team' }
  }
}

export async function removeTeam(teamId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    // Verify ownership via project
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { project: true },
    })
    if (!team || team.project.userId !== session.user.id) return { error: 'Unauthorized' }

    await prisma.team.delete({ where: { id: teamId } })
    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to remove team' }
  }
}

// --- Players ---

export async function addPlayer(projectId: string, name: string, playerNumber: number) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: session.user.id },
    })
    if (!project) return { error: 'Project not found' }

    const player = await prisma.player.create({
      data: {
        name,
        number: playerNumber,
        projectId,
      },
    })
    revalidatePath('/control')
    return { success: true, player }
  } catch (error) {
    return { error: 'Failed to add player' }
  }
}

export async function updatePlayer(playerId: string, data: { name?: string; number?: number }) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { project: true },
    })
    if (!player || player.project.userId !== session.user.id) return { error: 'Unauthorized' }

    await prisma.player.update({
      where: { id: playerId },
      data,
    })
    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to update player' }
  }
}

export async function removePlayer(playerId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { project: true },
    })
    if (!player || player.project.userId !== session.user.id) return { error: 'Unauthorized' }

    await prisma.player.delete({ where: { id: playerId } })
    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to remove player' }
  }
}

export async function updatePlayerTeam(playerId: string, teamId: string | null) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { project: true },
    })
    if (!player || player.project.userId !== session.user.id) return { error: 'Unauthorized' }

    await prisma.player.update({
      where: { id: playerId },
      data: { teamId },
    })
    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to update player team' }
  }
}

export async function updatePlayerDevice(playerId: string, deviceId: string | null) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { project: true },
    })
    if (!player || player.project.userId !== session.user.id) return { error: 'Unauthorized' }

    await updatePlayerDevices(playerId, deviceId ? [deviceId] : [])
    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: 'Failed to update player device' }
  }
}

export async function updatePlayerDevices(playerId: string, deviceIds: string[]) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { project: true },
    })
    if (!player || player.project.userId !== session.user.id) return { error: 'Unauthorized' }

    if (deviceIds.length > 0) {
      const devices = await prisma.device.findMany({
        where: { id: { in: deviceIds } },
        include: { profile: true },
      })
      if (devices.length !== deviceIds.length) return { error: 'Device not found' }
      if (devices.some((d) => d.profile.userId !== session.user.id))
        return { error: 'Device not found or unauthorized' }
      if (devices.some((d) => d.assignedPlayerId && d.assignedPlayerId !== playerId))
        return { error: 'One or more devices already assigned' }
    }

    await prisma.$transaction(async (tx) => {
      // Ensure devices are part of the same project
      if (deviceIds.length > 0) {
        await tx.device.updateMany({
          where: { id: { in: deviceIds } },
          data: { projectId: player.projectId },
        })
      }

      // Unassign removed devices
      await tx.device.updateMany({
        where: {
          assignedPlayerId: playerId,
          ...(deviceIds.length > 0 ? { id: { notIn: deviceIds } } : {}),
        },
        data: { assignedPlayerId: null },
      })

      // Assign current devices
      if (deviceIds.length > 0) {
        await tx.device.updateMany({
          where: { id: { in: deviceIds } },
          data: { assignedPlayerId: playerId },
        })
      }
    })

    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: 'Failed to update player devices' }
  }
}

// --- Devices in Project ---

export async function addDeviceToProject(projectId: string, deviceId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: session.user.id },
    })
    if (!project) return { error: 'Project not found' }

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { profile: true },
    })
    if (!device || device.profile.userId !== session.user.id) return { error: 'Device not found' }

    await prisma.device.update({
      where: { id: deviceId },
      data: { projectId },
    })
    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to add device to project' }
  }
}

export async function removeDeviceFromProject(deviceId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { profile: true },
    })
    if (!device || device.profile.userId !== session.user.id) return { error: 'Unauthorized' }

    await prisma.device.update({
      where: { id: deviceId },
      data: { projectId: null, assignedPlayerId: null },
    })
    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to remove device from project' }
  }
}

// --- Reordering ---

export async function reorderTeams(projectId: string, teamIds: string[]) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: session.user.id },
    })
    if (!project) return { error: 'Project not found' }

    await prisma.$transaction(
      teamIds.map((id, index) =>
        prisma.team.update({
          where: { id },
          data: { order: index },
        })
      )
    )
    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to reorder teams' }
  }
}

export async function reorderPlayers(projectId: string, playerIds: string[]) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: session.user.id },
    })
    if (!project) return { error: 'Project not found' }

    await prisma.$transaction(
      playerIds.map((id, index) =>
        prisma.player.update({
          where: { id },
          data: { order: index },
        })
      )
    )
    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to reorder players' }
  }
}

export async function reorderDevices(projectId: string, deviceIds: string[]) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId: session.user.id },
    })
    if (!project) return { error: 'Project not found' }

    await prisma.$transaction(
      deviceIds.map((id, index) =>
        prisma.device.update({
          where: { id },
          data: { order: index },
        })
      )
    )
    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to reorder devices' }
  }
}
