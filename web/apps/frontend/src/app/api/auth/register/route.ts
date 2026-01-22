import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { hashPassword } from '@/lib/server/password'
import { prisma } from '@/lib/server/prisma'

export const runtime = 'nodejs'

const registerSchema = z.object({
  name: z.string().min(2).max(60).trim(),
  email: z.string().email().trim(),
  password: z.string().min(8).max(128),
})

export async function POST(request: NextRequest) {
  try {
    const payload = registerSchema.parse(await request.json())
    const email = payload.email.toLowerCase()

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const passwordHash = await hashPassword(payload.password)

    const user = await prisma.user.create({
      data: {
        email,
        name: payload.name,
        password: passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', issues: error.issues }, { status: 422 })
    }

    console.error('Error registering user', error)
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 })
  }
}
