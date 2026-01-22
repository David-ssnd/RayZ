import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/server/prisma'

// GET /api/profiles - List all profiles
export async function GET() {
  try {
    const profiles = await prisma.profile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(profiles)
  } catch (error) {
    console.error('Error fetching profiles:', error)
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }
}

// POST /api/profiles - Create a new profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, bio, avatarUrl } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if profile already exists for this user
    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    })

    if (existingProfile) {
      return NextResponse.json({ error: 'Profile already exists for this user' }, { status: 409 })
    }

    const profile = await prisma.profile.create({
      data: {
        userId,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
      },
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

    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error('Error creating profile:', error)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}
