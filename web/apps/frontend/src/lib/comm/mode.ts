/**
 * Mode Detection Utilities
 *
 * Determines whether the app is running in local or cloud mode
 * based on environment variables and runtime detection.
 */

import type { AppMode } from './types'

/**
 * Get the current application mode
 *
 * Priority:
 * 1. NEXT_PUBLIC_MODE environment variable (explicit override)
 * 2. Runtime detection based on hostname/protocol
 *
 * @returns 'local' or 'cloud'
 */
export function getAppMode(): AppMode {
  // 1. Check explicit environment variable
  const envMode = process.env.NEXT_PUBLIC_MODE?.toLowerCase()
  if (envMode === 'local' || envMode === 'cloud') {
    return envMode
  }

  // 2. Runtime detection (client-side only)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const isLocalhost =
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')

    // Check for Electron environment
    const isElectron =
      typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')

    // Check for Tauri environment
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

    // Local mode if running in desktop app or on localhost
    if (isElectron || isTauri || isLocalhost) {
      return 'local'
    }

    // Check if running on Vercel or known cloud domains
    const isVercel =
      hostname.includes('.vercel.app') ||
      hostname.includes('.vercel.sh') ||
      process.env.NEXT_PUBLIC_VERCEL === '1'

    if (isVercel) {
      return 'cloud'
    }
  }

  // 3. Default based on build environment
  // If NEXT_PUBLIC_VERCEL is set, we're on Vercel
  if (process.env.NEXT_PUBLIC_VERCEL === '1') {
    return 'cloud'
  }

  // Default to local for development
  return process.env.NODE_ENV === 'production' ? 'cloud' : 'local'
}

/**
 * Check if the app is in local mode
 */
export function isLocalMode(): boolean {
  return getAppMode() === 'local'
}

/**
 * Check if the app is in cloud mode
 */
export function isCloudMode(): boolean {
  return getAppMode() === 'cloud'
}

/**
 * Get the WebSocket server URL for local mode
 *
 * Priority:
 * 1. NEXT_PUBLIC_LOCAL_WS_URL environment variable
 * 2. NEXT_PUBLIC_WS_BRIDGE_URL environment variable
 * 3. Default based on current hostname
 */
export function getLocalWsUrl(): string {
  // Check environment variables
  const envUrl = process.env.NEXT_PUBLIC_LOCAL_WS_URL || process.env.NEXT_PUBLIC_WS_BRIDGE_URL

  if (envUrl) {
    return envUrl
  }

  // Build URL based on current location
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const hostname = window.location.hostname
    return `${protocol}//${hostname}:8080`
  }

  // Default for SSR
  return 'ws://localhost:8080'
}

/**
 * Get Ably configuration for cloud mode
 */
export function getAblyConfig(): { apiKey?: string; tokenUrl?: string } {
  return {
    apiKey: process.env.NEXT_PUBLIC_ABLY_API_KEY,
    tokenUrl: process.env.NEXT_PUBLIC_ABLY_TOKEN_URL || '/api/ably/token',
  }
}
