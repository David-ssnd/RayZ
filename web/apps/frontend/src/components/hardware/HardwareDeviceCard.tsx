'use client'

import { memo, useCallback, useState } from 'react'

import type { HardwareDevice } from '@/types/hardware'
import { downloadImage } from '@/lib/downloadUtils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { DeviceBadge } from './DeviceBadge'
import { useZoom } from './useZoom'
import { ZoomControls } from './ZoomControls'

export const HardwareDeviceCard = memo(
  ({
    name,
    microcontroller,
    description,
    real_img_url,
    scheme_img_url,
    badge,
    badgeVariant,
  }: HardwareDevice) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const { zoom, setZoomValue, resetZoom } = useZoom()

    // Download handler
    const handleDownload = useCallback(() => {
      if (!scheme_img_url) return
      const filename = `${name.replace(/\s+/g, '_')}_scheme.png`
      downloadImage(scheme_img_url, filename)
    }, [scheme_img_url, name])

    return (
      <Card className="flex flex-col h-full">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-base sm:text-lg font-semibold">{name}</CardTitle>
          <DeviceBadge badge={badge} badgeVariant={badgeVariant} />
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Real image display */}
          {real_img_url && (
            <div className="mb-3 sm:mb-4 flex flex-col items-center">
              <img
                src={real_img_url}
                alt={`${name} Image`}
                className="object-cover rounded-md w-full"
              />
            </div>
          )}

          {/* Microcontroller info */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Microcontroller: {microcontroller}
            </p>
          </div>

          {/* Description */}
          <CardDescription className="mt-3 sm:mt-4 text-xs sm:text-sm">
            {description}
          </CardDescription>

          {/* Scheme dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full text-xs sm:text-sm"
                disabled={!scheme_img_url}
              >
                View Scheme
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[90vh] sm:max-h-[95vh] w-full">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">{name} - Circuit Scheme</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Detailed circuit schematic for {name}
                </DialogDescription>
              </DialogHeader>

              <ZoomControls
                zoom={zoom}
                onZoomChange={setZoomValue}
                onResetZoom={resetZoom}
                onDownload={handleDownload}
              />

              {/* Zoomable image container */}
              <div className="relative overflow-auto max-h-[60vh] sm:max-h-[75vh] border rounded-md bg-muted/20">
                <div
                  style={{
                    width: `${zoom * 100}%`,
                    height: `${zoom * 100}%`,
                    transition: 'width 0.1s ease-out, height 0.1s ease-out',
                  }}
                >
                  {scheme_img_url && (
                    <img
                      src={scheme_img_url}
                      alt={`${name} Scheme`}
                      className="rounded-md w-full h-auto block"
                      draggable={false}
                      style={{ cursor: 'default' }}
                    />
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    )
  }
)
