'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

import { prisma } from '@/lib/server/prisma'

export async function addDevice(ipAddress: string, name?: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    let profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    })

    if (!profile) {
      // Create a profile if it doesn't exist
      profile = await prisma.profile.create({
        data: {
          userId: session.user.id,
        },
      })
    }

    const device = await prisma.device.create({
      data: {
        ipAddress,
        name: name || `Device ${ipAddress}`,
        profileId: profile.id,
      },
    })

    revalidatePath('/control')
    return { success: true, device }
  } catch (error) {
    console.error('Error adding device:', error)
    return { error: 'Failed to add device' }
  }
}

export async function removeDevice(deviceId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    // Verify ownership
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { profile: true },
    })

    if (!device) {
      return { error: 'Device not found' }
    }

    if (device.profile.userId !== session.user.id) {
      return { error: 'Unauthorized' }
    }

    await prisma.device.delete({
      where: { id: deviceId },
    })

    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    console.error('Error removing device:', error)
    return { error: 'Failed to remove device' }
  }
}

export async function updateDevice(deviceId: string, data: { name?: string }) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { profile: true },
    })

    if (!device) {
      return { error: 'Device not found' }
    }

    if (device.profile.userId !== session.user.id) {
      return { error: 'Unauthorized' }
    }

    await prisma.device.update({
      where: { id: deviceId },
      data: {
        name: data.name,
      },
    })

    revalidatePath('/control')
    return { success: true }
  } catch (error) {
    console.error('Error updating device:', error)
    return { error: 'Failed to update device' }
  }
}

export async function getDevices() {
  const session = await auth()
  if (!session?.user?.id) {
    return []
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { devices: true },
  })

  return profile?.devices || []
}
