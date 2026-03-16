import type { Device, GameMode, Player, Project, Team } from './types'

/**
 * Send config updates to all devices that match an optional filter.
 * Skips devices without an IP or without an assigned player (unless
 * you explicitly want to handle those via the filter).
 */
export function sendConfigToAffectedDevices(
  connections: Map<string, any>,
  project: Project,
  affectedDeviceFilter?: (device: Device) => boolean
) {
  for (const device of project.devices || []) {
    if (!device.ipAddress || !device.assignedPlayerId) continue
    if (affectedDeviceFilter && !affectedDeviceFilter(device)) continue

    const conn = connections.get(device.ipAddress)
    if (!conn) continue

    const player = project.players?.find((p) => p.id === device.assignedPlayerId)
    const team = player ? project.teams?.find((t) => t.id === player.teamId) : null
    conn.updateConfig(buildAssignmentConfig(player, team, device, project.gameMode, project.players))
  }
}

/**
 * Build the config payload to send over WebSocket when a device is
 * assigned to (or unassigned from) a player.  Mirrors the auto-sync
 * logic in DeviceConnectionCard so every assignment path produces the
 * same message shape.
 */
export function buildAssignmentConfig(
  player: Player | null | undefined,
  team: Team | null | undefined,
  device: Device,
  gameMode: GameMode | null | undefined,
  allPlayers?: Player[]
): Record<string, unknown> {
  let colorRgb: number | undefined = undefined
  if (team?.color) {
    const hex = team.color.replace('#', '')
    const parsed = parseInt(hex, 16)
    if (!isNaN(parsed)) colorRgb = parsed
  }

  const config: Record<string, unknown> = {
    player_id: player?.number ?? 0,
    team_id: team?.number ?? 0,
    color_rgb: colorRgb,
  }

  if (device.deviceId !== undefined) {
    config.device_id = device.deviceId
  }

  if (gameMode) {
    config.win_type = gameMode.winType ?? 'score'
    config.target_score = gameMode.targetScore ?? 100
    config.game_duration_s = gameMode.durationMinutes ? gameMode.durationMinutes * 60 : 600
    config.max_hearts = gameMode.maxHearts ?? 5
    config.spawn_hearts = gameMode.spawnHearts ?? 3
    config.respawn_time_s = gameMode.respawnTimeSec ?? 10
    config.damage_in = gameMode.damageIn ?? 1
    config.damage_out = gameMode.damageOut ?? 1
    config.friendly_fire = gameMode.friendlyFire ?? false
    config.enable_ammo = gameMode.enableAmmo ?? true
    config.max_ammo = gameMode.maxAmmo ?? 30
    config.reload_time_ms = gameMode.reloadTimeMs ?? 2500
  }

  config.players = allPlayers?.map(p => ({ id: p.number, name: p.name })) ?? []

  return config
}
