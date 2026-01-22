export interface HardwareDevice {
  name: string
  microcontroller: string
  description: string
  scheme_img_url?: string
  real_img_url?: string
  badge?: string
  badgeVariant?: 'Target' | 'BowArrow' | 'Connected'
}

export interface color {
  id: string
  name: string
  hex: string
}

export interface ConnectedDevice {
  id: string
  name: string
  ipAddress: string
  status?: 'online' | 'offline'
  role?: 'target' | 'weapon' | 'other'
  team?: string
  color?: color
  projectId?: string | null
}
