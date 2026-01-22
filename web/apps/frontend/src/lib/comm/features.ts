/**
 * Feature Gating Utilities
 *
 * Controls which features are available based on app mode.
 * Cloud-only features are hidden in local mode.
 */

import { getAppMode, isCloudMode, isLocalMode } from './mode'

/**
 * Feature flags that differ between modes
 */
export interface FeatureFlags {
  // Cloud-only features
  leaderboards: boolean
  globalStats: boolean
  adminDashboard: boolean
  userAccounts: boolean
  matchHistory: boolean
  achievements: boolean
  cloudBackup: boolean

  // Local-only features
  directDeviceConnection: boolean
  offlinePlay: boolean
  localServerControl: boolean

  // Available in both modes
  gameControl: boolean
  deviceManagement: boolean
  teamSetup: boolean
  gameRules: boolean
}

/**
 * Get feature flags based on current mode
 */
export function getFeatureFlags(): FeatureFlags {
  const mode = getAppMode()

  const baseFlags: FeatureFlags = {
    // Always available
    gameControl: true,
    deviceManagement: true,
    teamSetup: true,
    gameRules: true,

    // Cloud-only - disabled by default
    leaderboards: false,
    globalStats: false,
    adminDashboard: false,
    userAccounts: false,
    matchHistory: false,
    achievements: false,
    cloudBackup: false,

    // Local-only - disabled by default
    directDeviceConnection: false,
    offlinePlay: false,
    localServerControl: false,
  }

  if (mode === 'cloud') {
    return {
      ...baseFlags,
      leaderboards: true,
      globalStats: true,
      adminDashboard: true,
      userAccounts: true,
      matchHistory: true,
      achievements: true,
      cloudBackup: true,
    }
  }

  // Local mode
  return {
    ...baseFlags,
    directDeviceConnection: true,
    offlinePlay: true,
    localServerControl: true,
  }
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatureFlags()[feature]
}

/**
 * Higher-order function for conditional rendering based on mode
 */
export function withCloudOnly<T>(cloudValue: T, localValue: T): T {
  return isCloudMode() ? cloudValue : localValue
}

/**
 * Higher-order function for conditional rendering based on mode
 */
export function withLocalOnly<T>(localValue: T, cloudValue: T): T {
  return isLocalMode() ? localValue : cloudValue
}
