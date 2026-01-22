/**
 * JS-friendly entrypoint for the dual-mode communication layer.
 * Re-exports the typed GameComm API so plain JS files can import from one place.
 */
import {
  CloudComm,
  CloudOnly,
  CommModeIndicator,
  createGameComm,
  Feature,
  GameCommProvider,
  LocalComm,
  LocalOnly,
  ModeIndicator,
  useAppMode,
  useFeatureFlags,
  useGameCommContext,
} from './comm'

export {
  createGameComm,
  CloudComm,
  LocalComm,
  GameCommProvider,
  useGameCommContext,
  CloudOnly,
  LocalOnly,
  Feature,
  ModeIndicator,
  CommModeIndicator,
  useFeatureFlags,
  useAppMode,
}

// Convenience namespace-style export for vanilla JS usage
export const GameComm = {
  create: createGameComm,
  LocalComm,
  CloudComm,
}
