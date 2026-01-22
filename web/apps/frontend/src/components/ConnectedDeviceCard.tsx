import { Trash, Trash2 } from 'lucide-react'

import type { ConnectedDevice } from '@/types/hardware'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Button } from './ui/button'
import { Input } from './ui/input'

type ConnectedDeviceCardProps = ConnectedDevice & {
  isNew?: boolean
  onDelete?: () => void
}

export function ConnectedDeviceCard({ onDelete, ...props }: ConnectedDeviceCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row justify-between items-center">
          <CardTitle>{props.name}</CardTitle>
          {onDelete && (
            <Button variant={'destructive'} size={'sm'} onClick={onDelete}>
              <Trash2 />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>IP: {props.ipAddress}</CardDescription>
      </CardContent>
    </Card>
  )
}
