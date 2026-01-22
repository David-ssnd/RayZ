'use client'

/**
 * Feature Gate Components
 *
 * React components for conditionally rendering features based on app mode.
 */
import { type ReactNode } from 'react'

import { isFeatureEnabled, type FeatureFlags } from './features'
import { getAppMode, isCloudMode, isLocalMode } from './mode'

interface FeatureGateProps {
  children: ReactNode
  /** Fallback content when feature is disabled */
  fallback?: ReactNode
}

/**
 * Only render children in cloud mode
 *
 * @example
 * ```tsx
 * <CloudOnly>
 *   <LeaderboardWidget />
 * </CloudOnly>
 * ```
 */
export function CloudOnly({ children, fallback = null }: FeatureGateProps): ReactNode {
  if (isCloudMode()) {
    return children
  }
  return fallback
}

/**
 * Only render children in local mode
 *
 * @example
 * ```tsx
 * <LocalOnly>
 *   <ServerControlPanel />
 * </LocalOnly>
 * ```
 */
export function LocalOnly({ children, fallback = null }: FeatureGateProps): ReactNode {
  if (isLocalMode()) {
    return children
  }
  return fallback
}

interface FeatureProps extends FeatureGateProps {
  /** Feature flag to check */
  name: keyof FeatureFlags
}

/**
 * Render children only if a specific feature is enabled
 *
 * @example
 * ```tsx
 * <Feature name="leaderboards">
 *   <LeaderboardWidget />
 * </Feature>
 * ```
 */
export function Feature({ name, children, fallback = null }: FeatureProps): ReactNode {
  if (isFeatureEnabled(name)) {
    return children
  }
  return fallback
}

/**
 * Mode indicator component for debugging/UI
 */
export function ModeIndicator({ className }: { className?: string }): ReactNode {
  const mode = getAppMode()

  return (
    <span className={className} data-mode={mode} title={`Running in ${mode} mode`}>
      {mode === 'cloud' ? '☁️ Cloud' : '🏠 Local'}
    </span>
  )
}

/**
 * Hook to get feature flags with reactivity
 */
export function useFeatureFlags(): FeatureFlags {
  // For now, feature flags are static based on mode
  // In the future, this could be reactive based on server-side flags
  return {
    // Cloud-only features
    leaderboards: isCloudMode(),
    globalStats: isCloudMode(),
    adminDashboard: isCloudMode(),
    userAccounts: isCloudMode(),
    matchHistory: isCloudMode(),
    achievements: isCloudMode(),
    cloudBackup: isCloudMode(),

    // Local-only features
    directDeviceConnection: isLocalMode(),
    offlinePlay: isLocalMode(),
    localServerControl: isLocalMode(),

    // Always available
    gameControl: true,
    deviceManagement: true,
    teamSetup: true,
    gameRules: true,
  }
}

/**
 * Hook to get current app mode
 */
export function useAppMode() {
  const mode = getAppMode()

  return {
    mode,
    isCloud: mode === 'cloud',
    isLocal: mode === 'local',
  }
}
