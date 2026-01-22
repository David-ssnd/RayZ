import type {
  ConnectionState,
  DeviceRole,
  DeviceState,
  GameState,
  GameMode as WSGameMode,
} from '@/lib/websocket/types'

import {
  Device as PrismaDevice,
  GameMode as PrismaGameMode,
  Player as PrismaPlayer,
  Project as PrismaProject,
  Team as PrismaTeam,
} from '../../../../../packages/database/src/generated/client'

export const DEFAULT_PLAYER_ID = 10
export const MIN_PLAYER_ID = 0
export const MAX_PLAYER_ID = 255

export type Project = PrismaProject & {
  devices: Device[]
  players: Player[]
  teams: Team[]
  gameMode?: GameMode
}

export type Team = PrismaTeam

export type Player = PrismaPlayer & {
  devices?: Device[]
}

export type Device = PrismaDevice & {
  role?: DeviceRole
  state?: DeviceState
  connectionState?: ConnectionState
}

export type GameMode = PrismaGameMode

export type { ConnectionState, DeviceRole, DeviceState, GameState, WSGameMode }
