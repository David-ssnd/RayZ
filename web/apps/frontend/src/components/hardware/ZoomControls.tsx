import { memo } from 'react'
import { Download, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

// Constants for zoom limits
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 10
export const ZOOM_STEP = 0.01

interface ZoomControlsProps {
  zoom: number
  onZoomChange: (value: number) => void
  onResetZoom: () => void
  onDownload: () => void
}

export const ZoomControls = memo(
  ({ zoom, onZoomChange, onResetZoom, onDownload }: ZoomControlsProps) => {
    return (
      <div className="flex items-center gap-4 pb-2">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-sm font-medium min-w-12">{Math.round(zoom * 100)}%</span>
          <Slider
            value={[zoom]}
            onValueChange={([value]) => onZoomChange(value)}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            className="flex-1 max-w-[300px]"
          />
          <Button variant="outline" size="icon" onClick={onResetZoom}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="default" size="sm" onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    )
  }
)
