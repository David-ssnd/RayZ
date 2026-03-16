'use client'

import { useEffect, useRef } from 'react'
import { Wifi, WifiOff, Radio, CheckCircle2 } from 'lucide-react'
import { useDeviceDiscovery, type DiscoveredDevice } from './use-device-discovery'
import { addDevice } from './actions'
import { addDeviceToProject } from '@/features/projects/actions'

export function DiscoveryPanel({ className, projectId }: { className?: string; projectId?: string }) {
  const { devices, connected, error } = useDeviceDiscovery()
  const registeredRef = useRef<Set<string>>(new Set())

  // Auto-register discovered devices to DB and optionally add to active project
  useEffect(() => {
    for (const device of devices) {
      if (device.deviceId != null && !registeredRef.current.has(device.ip)) {
        registeredRef.current.add(device.ip)
        addDevice(device.ip, device.deviceId, device.role, device.hostname, device.version)
          .then((res) => {
            if (projectId && res?.success && res?.device) {
              addDeviceToProject(projectId, res.device.id).catch((err) =>
                console.error('[Discovery] Failed to add device to project:', err)
              )
            }
          })
          .catch((err) => console.error('[Discovery] Failed to register device:', err))
      }
    }
  }, [devices, projectId])

  const connectedDevices = devices.filter((d) => d.connected)

  return (
    <div className={`rounded-lg border border-border bg-card p-3 ${className || ''}`}>
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connected ? (
            <div className="flex items-center gap-1.5 text-sm text-emerald-500">
              <Radio className="h-4 w-4 animate-pulse" />
              <span>Auto-discovery active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <WifiOff className="h-4 w-4" />
              <span>{error || 'Connecting to WS Bridge...'}</span>
            </div>
          )}
        </div>
        {devices.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {connectedDevices.length}/{devices.length} connected
          </span>
        )}
      </div>

      {/* Discovered devices */}
      {devices.length > 0 && (
        <div className="mt-3 grid gap-2">
          {devices.map((device) => (
            <DeviceRow key={device.ip} device={device} />
          ))}
        </div>
      )}
    </div>
  )
}

function DeviceRow({ device }: { device: DiscoveredDevice }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        {device.connected ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="font-medium">{device.hostname || device.ip}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
            device.role === 'target'
              ? 'bg-blue-500/20 text-blue-500'
              : device.role === 'weapon'
                ? 'bg-red-500/20 text-red-500'
                : 'bg-gray-500/20 text-gray-500'
          }`}
        >
          {device.role}
        </span>
      </div>
      <span className="font-mono text-xs text-muted-foreground">{device.ip}</span>
    </div>
  )
}
