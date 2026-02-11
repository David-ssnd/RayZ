/**
 * mDNS Discovery Service for ESP32 Devices
 * 
 * Automatically discovers RayZ devices on the local network using mDNS/Bonjour.
 * Discovered devices are added to the WS Bridge for communication.
 */

import Bonjour, { type Service } from 'bonjour-service'

export interface DiscoveredDevice {
  ip: string
  hostname: string
  role: 'weapon' | 'target' | 'unknown'
  deviceId?: number
  playerId?: number
  version?: string
}

export type DeviceDiscoveryCallback = (device: DiscoveredDevice) => void

export class DeviceDiscovery {
  private bonjour: Bonjour
  private browser: any
  private onDeviceFound: DeviceDiscoveryCallback
  private discoveredDevices: Map<string, DiscoveredDevice> = new Map()

  constructor(onDeviceFound: DeviceDiscoveryCallback) {
    this.bonjour = new Bonjour()
    this.onDeviceFound = onDeviceFound
  }

  /**
   * Start scanning for RayZ devices
   */
  start() {
    console.log('[Discovery] Starting mDNS scan for _rayz._tcp services...')

    this.browser = this.bonjour.find({ type: 'rayz' })

    this.browser.on('up', (service: Service) => {
      this.handleServiceUp(service)
    })

    this.browser.on('down', (service: Service) => {
      this.handleServiceDown(service)
    })

    console.log('[Discovery] mDNS browser started')
  }

  /**
   * Stop scanning
   */
  stop() {
    if (this.browser) {
      this.browser.stop()
      console.log('[Discovery] mDNS browser stopped')
    }
    this.bonjour.destroy()
  }

  /**
   * Get all currently discovered devices
   */
  getDiscoveredDevices(): DiscoveredDevice[] {
    return Array.from(this.discoveredDevices.values())
  }

  /**
   * Handle a new service appearing
   */
  private handleServiceUp(service: Service) {
    console.log('[Discovery] Service found:', {
      name: service.name,
      host: service.host,
      addresses: service.addresses,
      port: service.port,
      txt: service.txt,
    })

    // Extract IP address (prefer IPv4)
    const ip = this.selectBestAddress(service.addresses || [])
    if (!ip) {
      console.warn('[Discovery] No valid IP address for service:', service.name)
      return
    }

    // Parse TXT records for device info
    const txt = service.txt || {}
    const role = txt.role as 'weapon' | 'target' | undefined
    const deviceIdStr = txt.device as string | undefined
    const playerIdStr = txt.player as string | undefined
    const version = txt.version as string | undefined

    const device: DiscoveredDevice = {
      ip,
      hostname: service.host || service.name || 'unknown',
      role: role || 'unknown',
      deviceId: deviceIdStr ? parseInt(deviceIdStr, 10) : undefined,
      playerId: playerIdStr ? parseInt(playerIdStr, 10) : undefined,
      version,
    }

    // Check if we've already discovered this device
    if (this.discoveredDevices.has(ip)) {
      console.log(`[Discovery] Device ${ip} already known, updating info`)
    } else {
      console.log(
        `[Discovery] New device found: ${ip} (${role || 'unknown'}) - Device ID: ${device.deviceId}, Player ID: ${device.playerId}`
      )
    }

    this.discoveredDevices.set(ip, device)
    this.onDeviceFound(device)
  }

  /**
   * Handle a service disappearing
   */
  private handleServiceDown(service: Service) {
    const ip = this.selectBestAddress(service.addresses || [])
    if (ip && this.discoveredDevices.has(ip)) {
      console.log(`[Discovery] Device ${ip} disappeared`)
      this.discoveredDevices.delete(ip)
    }
  }

  /**
   * Select the best IP address from a list (prefer IPv4)
   */
  private selectBestAddress(addresses: string[]): string | null {
    if (addresses.length === 0) return null

    // Prefer IPv4
    const ipv4 = addresses.find((addr) => addr.includes('.'))
    if (ipv4) return ipv4

    // Fallback to first address
    return addresses[0]
  }
}
