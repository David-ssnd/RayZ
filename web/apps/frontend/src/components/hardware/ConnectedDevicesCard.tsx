import { Car } from 'lucide-react'

import type { HardwareDevice } from '@/types/hardware'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ConnectedDevicesCard({
  name,
  microcontroller,
  description,
  real_img_url,
}: HardwareDevice) {
  return (
    <Card className="mt-6 sm:mt-8">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-base sm:text-lg font-semibold">{name}</CardTitle>
        <Badge variant="success" className="px-2 py-1 text-xs sm:text-sm whitespace-nowrap">
          <div className="flex items-center space-x-1">
            <Car className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Connected</span>
          </div>
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="mb-3 sm:mb-4 flex flex-col items-center">
          {real_img_url && (
            <img
              src={real_img_url}
              alt={`${name} Image`}
              className="object-cover rounded-md w-full"
            />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Microcontroller: {microcontroller}
          </p>
        </div>

        <CardDescription className="mt-3 sm:mt-4 text-xs sm:text-sm">{description}</CardDescription>
      </CardContent>
    </Card>
  )
}
