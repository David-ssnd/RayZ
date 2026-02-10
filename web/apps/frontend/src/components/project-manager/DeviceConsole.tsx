'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Terminal, Trash2, WrapText } from 'lucide-react'

import { useDeviceConnections } from '@/lib/websocket'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

import { cn } from '@/lib/utils'

export function DeviceConsole() {
  const { messageLog, clearLog } = useDeviceConnections()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [wrapText, setWrapText] = useState(false)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messageLog])

  const handleCopyAll = () => {
    const logText = messageLog
      .map((log) => {
        const timestamp = log.timestamp.toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
        const direction = log.direction === 'in' ? '↓' : '↑'
        const device = log.deviceId || log.ipAddress || 'Broadcast'
        const payload =
          typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload)
        return `[${timestamp}] ${direction} ${device} [${log.type}] ${payload}`
      })
      .join('\n')

    navigator.clipboard.writeText(logText).then(() => {
      // Could add a toast notification here
    })
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full border rounded-md bg-zinc-950 text-zinc-50 font-mono text-sm shadow-sm',
        'transition-all duration-200'
      )}
      style={{ minWidth: 0 }}
    >
      <div className="flex items-center justify-between px-2 py-1 border-b bg-zinc-900 rounded-t-md flex-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="font-semibold text-xs">Device Console</span>
          <Badge
            variant="secondary"
            className="text-[10px] h-4 px-1 bg-zinc-800 text-zinc-300 border-zinc-700"
          >
            {messageLog.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-zinc-800"
            onClick={() => setWrapText(!wrapText)}
            title={wrapText ? 'Disable text wrap' : 'Enable text wrap'}
          >
            <WrapText className={cn('w-3 h-3', wrapText && 'text-cyan-400')} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-zinc-800"
            onClick={handleCopyAll}
            title="Copy all logs"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-zinc-800 hover:text-red-400"
            onClick={clearLog}
            title="Clear log"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-2 min-h-0 min-w-0" ref={scrollRef}>
        <div className="space-y-1.5 min-w-0">
          {messageLog.length === 0 ? (
            <div className="text-zinc-500 italic text-center py-8">
              No messages logged yet. Start a game or connect devices to see activity.
            </div>
          ) : (
            messageLog.map((log) => (
              <div
                key={log.id}
                className="flex gap-2 items-start group hover:bg-zinc-900/50 p-0.5 rounded"
              >
                <div className="text-zinc-500 text-xs whitespace-nowrap pt-0.5 w-[70px]">
                  {log.timestamp.toLocaleTimeString([], {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>

                <div className="flex items-center justify-center w-5 h-5 shrink-0 pt-0.5">
                  {log.direction === 'in' ? (
                    <ArrowDown className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <ArrowUp className="w-3 h-3 text-green-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      className={`text-xs font-bold ${log.direction === 'in' ? 'text-cyan-400' : 'text-green-400'}`}
                    >
                      {log.deviceId || log.ipAddress || 'Broadcast'}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1 py-0 border-zinc-700 text-zinc-400"
                    >
                      {log.type}
                    </Badge>
                  </div>
                  <div
                    className={cn(
                      'text-zinc-300 opacity-90',
                      wrapText ? 'break-words whitespace-normal' : 'break-words'
                    )}
                  >
                    {typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
