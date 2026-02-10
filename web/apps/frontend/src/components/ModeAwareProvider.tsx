'use client'

/**
 * Mode-Aware Project Manager Wrapper
 *
 * Wraps the ProjectManager with the appropriate communication provider
 * based on the current app mode (local vs cloud).
 */
import { type ReactNode } from 'react'

import {
  CloudOnly,
  CommModeIndicator,
  GameCommProvider,
  LocalOnly,
  useAppMode,
  useFeatureFlags,
} from '@/lib/comm'
import { DeviceConnectionsProvider } from '@/lib/websocket'
import { cn } from '@/lib/utils'

import { Device } from './project-manager/types'

interface ModeAwareProviderProps {
  children: ReactNode
  projectId: string
  devices: Device[]
  sessionId?: string
}

/**
 * Provides the appropriate connection context based on mode
 *
 * - Local mode: Uses DeviceConnectionsProvider (direct WS to devices)
 * - Cloud mode: Uses GameCommProvider (Ably pub/sub)
 */
export function ModeAwareConnectionProvider({
  children,
  projectId,
  devices,
  sessionId,
}: ModeAwareProviderProps) {
  const { isLocal } = useAppMode()

  const gameCommProvider = (
    <GameCommProvider
      mode={isLocal ? 'local' : 'cloud'}
      sessionId={sessionId ?? projectId}
      autoConnect={true}
    >
      {children}
    </GameCommProvider>
  )

  // Always provide DeviceConnectionsProvider so useDeviceConnections is safe in any mode.
  // In cloud mode, we keep it idle with no initial devices and no auto-connect.
  return (
    <DeviceConnectionsProvider
      key={projectId}
      initialDevices={isLocal ? devices.map((d) => d.ipAddress) : []}
      autoConnect={isLocal}
      autoReconnect={isLocal}
    >
      {gameCommProvider}
    </DeviceConnectionsProvider>
  )
}

/**
 * Mode status bar showing current connection mode
 */
export function ModeStatusBar({ className }: { className?: string }) {
  const { mode } = useAppMode()
  const features = useFeatureFlags()

  return (
    <div
      className={cn("flex items-center justify-between p-2 bg-muted/50 rounded-lg", className)}
    >
      <CommModeIndicator />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <CloudOnly>
          <span>☁️ Cloud features enabled</span>
        </CloudOnly>
        <LocalOnly>
          <span>🏠 Offline mode</span>
        </LocalOnly>
      </div>
    </div>
  )
}

/**
 * Cloud-only feature placeholder
 * Shows a message when a cloud feature is accessed in local mode
 */
export function CloudFeaturePlaceholder({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg bg-muted/30">
      <div className="text-4xl mb-4">☁️</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mt-2">{description}</p>
      <p className="text-xs text-muted-foreground mt-4">
        This feature is available when using the cloud version of RayZ.
      </p>
    </div>
  )
}

/**
 * Example cloud-only components
 */
export function LeaderboardWidget() {
  return (
    <CloudOnly
      fallback={
        <CloudFeaturePlaceholder
          title="Leaderboards"
          description="Compare your stats with players worldwide"
        />
      }
    >
      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">🏆 Global Leaderboard</h3>
        <p className="text-sm text-muted-foreground">
          Leaderboard content would load here from cloud...
        </p>
      </div>
    </CloudOnly>
  )
}

export function MatchHistoryWidget() {
  return (
    <CloudOnly
      fallback={
        <CloudFeaturePlaceholder
          title="Match History"
          description="View your past games and statistics"
        />
      }
    >
      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">📊 Match History</h3>
        <p className="text-sm text-muted-foreground">Match history would load here from cloud...</p>
      </div>
    </CloudOnly>
  )
}

/**
 * Local-only components
 */
export function LocalServerControl() {
  return (
    <LocalOnly>
      <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
        <h3 className="font-semibold mb-2">🖥️ Local Server Control</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Manage your local WebSocket bridge server
        </p>
        <div className="flex gap-2">
          <button className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">
            Start Server
          </button>
          <button className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
            View Logs
          </button>
        </div>
      </div>
    </LocalOnly>
  )
}
