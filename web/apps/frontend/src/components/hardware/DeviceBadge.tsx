import { memo } from 'react'
import { BowArrow, Target } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

interface DeviceBadgeProps {
  badge?: string
  badgeVariant?: 'Target' | 'BowArrow' | 'Connected'
}

export const DeviceBadge = memo(({ badge, badgeVariant }: DeviceBadgeProps) => {
  if (!badgeVariant) return null

  const icon =
    badgeVariant === 'Target' ? <Target className="h-4 w-4" /> : <BowArrow className="h-4 w-4" />

  return (
    <Badge variant="hardware" className="px-2 py-1">
      {icon}
      <span>{badge}</span>
    </Badge>
  )
})
