import { useCallback, useState } from 'react'

import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from './ZoomControls'

export const useZoom = (initialZoom = 1) => {
  const [zoom, setZoom] = useState(initialZoom)

  const setZoomValue = useCallback((value: number) => {
    setZoom(Math.max(MIN_ZOOM, Math.min(value, MAX_ZOOM)))
  }, [])

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM))
  }, [])

  const resetZoom = useCallback(() => {
    setZoom(1)
  }, [])

  return { zoom, setZoomValue, zoomIn, zoomOut, resetZoom }
}
