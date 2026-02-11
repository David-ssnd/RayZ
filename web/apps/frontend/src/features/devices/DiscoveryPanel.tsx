'use client'

/**
 * Device Discovery Panel
 * 
 * Displays automatically discovered ESP32 devices on the network
 * and allows one-click addition to the project.
 */

import { useState } from 'react'
import { useDeviceDiscovery } from './use-device-discovery'
import { addDevice } from './actions'

export function DiscoveryPanel({ projectId }: { projectId: string }) {
  const {
    discovering,
    devices,
    error,
    startDiscovery,
    stopDiscovery,
  } = useDeviceDiscovery()

  const [adding, setAdding] = useState<string | null>(null)

  const handleAddDevice = async (ip: string, hostname: string, role: string) => {
    setAdding(ip)
    try {
      await addDevice(ip, hostname || `${role}-device`)
      // TODO: Assign to project automatically
      // await assignDeviceToProject(device.id, projectId)
    } catch (err) {
      console.error('Failed to add device:', err)
      alert('Failed to add device: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Network Discovery</h3>
          <p className="text-sm text-muted-foreground">
            Automatically find ESP32 devices on your network
          </p>
        </div>
        
        <button
          onClick={discovering ? stopDiscovery : startDiscovery}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            discovering
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {discovering ? 'Stop Scanning' : 'Scan Network'}
        </button>
      </div>

      {/* Status */}
      {discovering && (
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          <span>Scanning for devices...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 mb-4 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Discovered Devices List */}
      {devices.length > 0 ? (
        <div className="grid gap-3">
          {devices.map((device) => (
            <div
              key={device.ip}
              className="flex items-center justify-between bg-muted/50 rounded-md p-3 border border-border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{device.hostname}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      device.role === 'target'
                        ? 'bg-blue-500/20 text-blue-400'
                        : device.role === 'weapon'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {device.role}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="font-mono">{device.ip}</span>
                  {device.deviceId && (
                    <span className="ml-3">Device ID: {device.deviceId}</span>
                  )}
                  {device.version && (
                    <span className="ml-3">v{device.version}</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleAddDevice(device.ip, device.hostname, device.role)}
                disabled={adding === device.ip}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {adding === device.ip ? 'Adding...' : 'Add Device'}
              </button>
            </div>
          ))}
        </div>
      ) : discovering ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No devices found yet...</p>
          <p className="text-sm mt-1">
            Make sure your ESP32 devices are powered on and connected to the same network
          </p>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>Click "Scan Network" to search for devices</p>
        </div>
      )}
    </div>
  )
}
