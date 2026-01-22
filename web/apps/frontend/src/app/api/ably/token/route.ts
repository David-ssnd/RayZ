/**
 * Ably Token Authentication Endpoint
 *
 * This endpoint creates Ably tokens for browser clients.
 * In production, never expose the API key directly to the browser.
 */

import { NextResponse } from 'next/server'

// Note: Install ably package: pnpm add ably
// import Ably from 'ably'

export async function GET(request: Request) {
  const apiKey = process.env.ABLY_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'Ably API key not configured' }, { status: 500 })
  }

  try {
    // Uncomment when ably is installed:
    // const ably = new Ably.Rest(apiKey)
    // const tokenRequest = await ably.auth.createTokenRequest({
    //   clientId: `browser-${Date.now()}`,
    //   capability: {
    //     'rayz-game:*': ['subscribe', 'publish', 'presence'],
    //   },
    // })
    // return NextResponse.json(tokenRequest)

    // Placeholder response until ably is installed
    return NextResponse.json(
      {
        error: 'Ably package not installed. Run: pnpm add ably',
        instructions: [
          '1. Install ably: pnpm add ably',
          '2. Set ABLY_API_KEY in .env.local',
          '3. Uncomment the token creation code above',
        ],
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('[Ably Token] Error creating token:', error)
    return NextResponse.json({ error: 'Failed to create Ably token' }, { status: 500 })
  }
}
