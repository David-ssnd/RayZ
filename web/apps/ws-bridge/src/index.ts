/**
 * WebSocket Bridge Server for Local Mode
 *
 * This server acts as a bridge between the browser and ESP32 devices.
 * In local mode, the browser connects to this server, which then maintains
 * connections to all ESP32 devices on the LAN.
 *
 * Protocol:
 * - Browser sends: { target: "192.168.x.x", payload: {...} } or { broadcast: true, payload: {...} }
 * - Server sends: { source: "192.168.x.x", payload: {...} }
 */

import type { IncomingMessage } from 'http'
import { WebSocket, WebSocketServer } from 'ws'

// Configuration
const PORT = parseInt(process.env.WS_BRIDGE_PORT ?? '8080', 10)
const DEVICE_RECONNECT_DELAY = 3000
const HEARTBEAT_INTERVAL = 30000

interface DeviceConnection {
  ip: string
  ws: WebSocket | null
  connected: boolean
  reconnecting: boolean
}

interface BrowserMessage {
  type?: string
  target?: string
  broadcast?: boolean
  payload: unknown
}

interface DeviceMessage {
  source: string
  payload: unknown
}

class WsBridge {
  private server: WebSocketServer
  private browserClients: Set<WebSocket> = new Set()
  private devices: Map<string, DeviceConnection> = new Map()
  private heartbeatTimer: NodeJS.Timeout | null = null

  constructor(port: number) {
    this.server = new WebSocketServer({ port })
    this.setupServer()
    this.startHeartbeat()

    console.log(`[WsBridge] Server started on ws://localhost:${port}`)
  }

  private setupServer() {
    this.server.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      // Parse query params for target
      const requestUrl = new URL(req.url ?? '', `http://localhost:${PORT}`)
      const targetIp = requestUrl.searchParams.get('target')

      console.log(`[WsBridge] Browser client connected${targetIp ? ` (target: ${targetIp})` : ''}`)
      this.browserClients.add(ws)

      if (targetIp) {
        this.addDevice(targetIp)
      }

      // Send current device states
      this.sendDeviceList(ws)

      ws.on('message', (data: Buffer) => {
        try {
          const raw = JSON.parse(data.toString())

          // Check if message is already structured as BrowserMessage or is a management command
          const isStructured =
            raw.target ||
            raw.broadcast ||
            raw.type === 'add_device' ||
            raw.type === 'remove_device' ||
            raw.type === 'ping' // Handle explicit ping

          if (isStructured) {
            this.handleBrowserMessage(raw as BrowserMessage)
          } else if (targetIp) {
            // It's a raw payload meant for the target IP declared in connection
            this.handleBrowserMessage({
              target: targetIp,
              payload: raw,
            })
          } else {
            console.warn('[WsBridge] received message without target', raw)
          }
        } catch (err) {
          console.error('[WsBridge] Failed to parse browser message:', err)
        }
      })

      ws.on('close', () => {
        console.log('[WsBridge] Browser client disconnected')
        this.browserClients.delete(ws)
      })

      ws.on('error', (err: Error) => {
        console.error('[WsBridge] Browser client error:', err)
        this.browserClients.delete(ws)
      })

      // Handle ping from browser
      ws.on('pong', () => {
        // Client is alive
      })
    })

    this.server.on('error', (err: Error) => {
      console.error('[WsBridge] Server error:', err)
    })
  }

  /**
   * Add a device to manage
   */
  addDevice(ip: string) {
    if (this.devices.has(ip)) {
      return
    }

    const device: DeviceConnection = {
      ip,
      ws: null,
      connected: false,
      reconnecting: false,
    }

    this.devices.set(ip, device)
    this.connectToDevice(ip)
  }

  /**
   * Remove a device
   */
  removeDevice(ip: string) {
    const device = this.devices.get(ip)
    if (device?.ws) {
      device.ws.close()
    }
    this.devices.delete(ip)
  }

  /**
   * Connect to an ESP32 device
   */
  private connectToDevice(ip: string) {
    const device = this.devices.get(ip)
    if (!device || device.connected || device.reconnecting) {
      return
    }

    device.reconnecting = true
    const wsUrl = `ws://${ip}/ws`

    console.log(`[WsBridge] Connecting to device ${ip}...`)

    try {
      const ws = new WebSocket(wsUrl, {
        handshakeTimeout: 5000,
      })

      ws.on('open', () => {
        console.log(`[WsBridge] Connected to device ${ip}`)
        device.ws = ws
        device.connected = true
        device.reconnecting = false

        // Request initial status
        ws.send(JSON.stringify({ op: 1, type: 'get_status' }))

        // Notify browsers
        this.broadcastToBrowsers({
          type: 'device_connected',
          ip,
        })
      })

      ws.on('message', (data: Buffer) => {
        try {
          const payload = JSON.parse(data.toString())
          this.handleDeviceMessage(ip, payload)
        } catch (err) {
          console.error(`[WsBridge] Failed to parse device message from ${ip}:`, err)
        }
      })

      ws.on('close', () => {
        console.log(`[WsBridge] Disconnected from device ${ip}`)
        device.ws = null
        device.connected = false
        device.reconnecting = false

        // Notify browsers
        this.broadcastToBrowsers({
          type: 'device_disconnected',
          ip,
        })

        // Schedule reconnect
        setTimeout(() => {
          if (this.devices.has(ip)) {
            this.connectToDevice(ip)
          }
        }, DEVICE_RECONNECT_DELAY)
      })

      ws.on('error', (err: Error) => {
        console.error(`[WsBridge] Device ${ip} error:`, err.message)
        device.reconnecting = false
      })
    } catch (err) {
      console.error(`[WsBridge] Failed to create WebSocket for ${ip}:`, err)
      device.reconnecting = false

      // Schedule reconnect
      setTimeout(() => {
        if (this.devices.has(ip)) {
          this.connectToDevice(ip)
        }
      }, DEVICE_RECONNECT_DELAY)
    }
  }

  /**
   * Handle message from browser
   */
  private handleBrowserMessage(message: BrowserMessage) {
    if (message.type === 'ping') {
      // Heartbeat ping, ignore
      return
    }

    // Check for device management commands
    if ((message as any).type === 'add_device' && (message as any).ip) {
      this.addDevice((message as any).ip)
      return
    }

    if ((message as any).type === 'remove_device' && (message as any).ip) {
      this.removeDevice((message as any).ip)
      return
    }

    if (message.broadcast) {
      // Broadcast to all connected devices
      for (const [ip, device] of this.devices) {
        if (device.connected && device.ws?.readyState === WebSocket.OPEN) {
          device.ws.send(JSON.stringify(message.payload))
        }
      }
    } else if (message.target) {
      // Send to specific device
      const device = this.devices.get(message.target)
      if (device?.connected && device.ws?.readyState === WebSocket.OPEN) {
        device.ws.send(JSON.stringify(message.payload))
      }
    }
  }

  /**
   * Handle message from ESP32 device
   */
  private handleDeviceMessage(ip: string, payload: unknown) {
    const message: DeviceMessage = {
      source: ip,
      payload,
    }

    this.broadcastToBrowsers(message)
  }

  /**
   * Send message to all browser clients
   */
  private broadcastToBrowsers(message: unknown) {
    const data = JSON.stringify(message)
    for (const client of this.browserClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  /**
   * Send current device list to a browser client
   */
  private sendDeviceList(ws: WebSocket) {
    const devices = Array.from(this.devices.entries()).map(([ip, device]) => ({
      ip,
      connected: device.connected,
    }))

    ws.send(
      JSON.stringify({
        type: 'device_list',
        devices,
      })
    )
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      // Ping browser clients
      for (const client of this.browserClients) {
        if (client.readyState === WebSocket.OPEN) {
          client.ping()
        }
      }

      // Send heartbeat to devices
      for (const [ip, device] of this.devices) {
        if (device.connected && device.ws?.readyState === WebSocket.OPEN) {
          device.ws.send(JSON.stringify({ op: 2, type: 'heartbeat' }))
        }
      }
    }, HEARTBEAT_INTERVAL)
  }

  /**
   * Stop the server
   */
  stop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    // Close all device connections
    for (const [, device] of this.devices) {
      device.ws?.close()
    }

    // Close all browser connections
    for (const client of this.browserClients) {
      client.close()
    }

    this.server.close()
    console.log('[WsBridge] Server stopped')
  }
}

// Create and start the bridge
const bridge = new WsBridge(PORT)

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[WsBridge] Shutting down...')
  bridge.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  bridge.stop()
  process.exit(0)
})

// Export for programmatic use
export { WsBridge }
export default bridge
