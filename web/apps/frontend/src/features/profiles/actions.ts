'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { prisma } from '@/lib/server/prisma'

const updateProfileSchema = z.object({
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
})

export async function getProfile(userId: string) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
    return profile
  } catch (error) {
    console.error('Error fetching profile:', error)
    return null
  }
}

export async function createProfile(userId: string, data: { bio?: string; avatarUrl?: string }) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { error: 'User not found' }
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    })

    if (existingProfile) {
      return { error: 'Profile already exists for this user' }
    }

    const profile = await prisma.profile.create({
      data: {
        userId,
        bio: data.bio || null,
        avatarUrl: data.avatarUrl || null,
      },
    })

    revalidatePath('/profiles')
    return { success: true, profile }
  } catch (error) {
    console.error('Error creating profile:', error)
    return { error: 'Failed to create profile' }
  }
}

export async function updateProfile(profileId: string, formData: FormData) {
  try {
    const rawData = {
      bio: formData.get('bio') as string,
      avatarUrl: formData.get('avatarUrl') as string,
    }

    const validatedData = updateProfileSchema.parse(rawData)

    const existingProfile = await prisma.profile.findUnique({
      where: { id: profileId },
    })

    if (!existingProfile) {
      return { error: 'Profile not found' }
    }

    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: {
        ...(validatedData.bio !== undefined && { bio: validatedData.bio }),
        ...(validatedData.avatarUrl !== undefined && { avatarUrl: validatedData.avatarUrl }),
      },
    })

    revalidatePath(`/profiles/${profileId}`)
    return { success: true, profile }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { error: 'Failed to update profile' }
  }
}

export async function deleteProfile(profileId: string) {
  try {
    const existingProfile = await prisma.profile.findUnique({
      where: { id: profileId },
    })

    if (!existingProfile) {
      return { error: 'Profile not found' }
    }

    await prisma.profile.delete({
      where: { id: profileId },
    })

    revalidatePath('/profiles')
    return { success: true }
  } catch (error) {
    console.error('Error deleting profile:', error)
    return { error: 'Failed to delete profile' }
  }
}
