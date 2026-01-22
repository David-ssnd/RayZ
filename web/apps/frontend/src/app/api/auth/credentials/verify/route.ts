import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyPassword } from '@/lib/server/password'
import { prisma } from '@/lib/server/prisma'

const verifySchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = verifySchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(null, { status: 401 })
    }

    if (!user.password) {
      return NextResponse.json(null, { status: 401 })
    }

    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return NextResponse.json(null, { status: 401 })
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Verify credentials error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
