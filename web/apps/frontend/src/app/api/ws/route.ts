import { NextRequest } from 'next/server'

/**
 * WebSocket Proxy Route for ESP32 Device Communication
 *
 * NOTE: Vercel Serverless Functions do NOT support persistent WebSocket connections.
 * This route is intended for:
 * 1. Local development with Next.js dev server
 * 2. Self-hosted Next.js deployment
 * 3. Providers that support Node.js WebSocket upgrades (e.g., Railway, Render, etc.)
 *
 * For production Vercel deployment, use a separate WebSocket bridge server
 * or cloud-hosted solution (AWS API Gateway, Azure Web PubSub, etc.)
 */

interface WebSocketProxyMap {
  [key: string]: {
    deviceWs: WebSocket
    clients: Set<WebSocket>
  }
}

const proxyConnections: WebSocketProxyMap = {}

/**
 * GET handler for WebSocket upgrade requests
 * Proxies connections to local ESP32 devices
 */
export async function GET(request: NextRequest) {
  // Check for WebSocket upgrade header
  const upgrade = request.headers.get('upgrade')
  if (upgrade !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 })
  }

  // Extract device IP from query parameters
  const { searchParams } = new URL(request.url)
  const deviceIp = searchParams.get('target') || searchParams.get('device')

  if (!deviceIp) {
    return new Response('Missing target/device parameter', { status: 400 })
  }

  // Validate IP format (basic check to allow IPs or hostnames)
  if (!/^[\w.-]+$/.test(deviceIp)) {
    return new Response('Invalid device format', { status: 400 })
  }

  try {
    // NOTE: This endpoint is NOT compatible with Vercel's serverless environment
    // Vercel does not support WebSocket upgrades in stateless functions
    //
    // For Vercel + WebSocket support, use one of:
    // 1. Separate WebSocket bridge server (recommended)
    // 2. Client-side direct connection to WS bridge
    // 3. Cloud WebSocket services (AWS API Gateway, Azure Web PubSub)

    // If you're running locally or on a compatible host, implement WebSocket logic here
    // Otherwise, return an error guiding users to the bridge

    return new Response(
      JSON.stringify({
        error: 'WebSocket not supported on serverless platform',
        message: 'Use a separate WebSocket bridge or connect directly to device on local network',
        docs: 'See CONTRIBUTING.md for WebSocket setup instructions',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[WS Proxy] Error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to establish WebSocket connection',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
