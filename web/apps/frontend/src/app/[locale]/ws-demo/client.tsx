'use client'

import { useEffect, useMemo, useState } from 'react'
import { GameCommandType, OpCode, type ClientMessage, type ServerMessage } from '@rayz/types'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Plug,
  Send,
  Terminal,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'

import {
  GameCommProvider,
  useGameCommContext,
} from '@/lib/comm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageLayout } from '@/components/PageLayout'

function CommDemoContent() {
  const {
    mode,
    state,
    connectedDevices,
    send,
    broadcast,
    onMessage,
    connect,
    disconnect,
    isConnected,
    isConnecting,
  } = useGameCommContext()

  const [log, setLog] = useState<string[]>([])
  const [customOpCode, setCustomOpCode] = useState('')
  const [pingLatency, setPingLatency] = useState<number | null>(null)
  const [pingStart, setPingStart] = useState<number | null>(null)

  useEffect(() => {
    const unsubscribe = onMessage('*', (message: ServerMessage, fromDevice: string) => {
      const line = `${new Date().toLocaleTimeString()} [${fromDevice}] op=${message.op ?? message.type}`
      setLog((prev) => [line, ...prev].slice(0, 100))

      // Measure latency from status response
      if (pingStart && (message.type === 'status' || message.op === OpCode.STATUS)) {
        setPingLatency(Date.now() - pingStart)
        setPingStart(null)
      }
    })
    return () => unsubscribe()
  }, [onMessage, pingStart])

  const requestStatus = () => {
    setPingStart(Date.now())
    const msg: ClientMessage = { op: OpCode.GET_STATUS, type: 'get_status' }
    broadcast(msg)
  }

  const startGame = () => {
    const msg: ClientMessage = {
      op: OpCode.GAME_COMMAND,
      type: 'game_command',
      command: GameCommandType.START,
    }
    broadcast(msg)
  }

  const stopGame = () => {
    const msg: ClientMessage = {
      op: OpCode.GAME_COMMAND,
      type: 'game_command',
      command: GameCommandType.STOP,
    }
    broadcast(msg)
  }

  const sendCustomOpCode = () => {
    if (!customOpCode.trim()) return
    try {
      const parsed = JSON.parse(customOpCode)
      broadcast(parsed)
      setLog((prev) => [`${new Date().toLocaleTimeString()} [SENT] ${customOpCode}`, ...prev].slice(0, 100))
    } catch {
      const msg = { op: parseInt(customOpCode, 10) || 0, type: customOpCode }
      broadcast(msg as any)
      setLog((prev) => [`${new Date().toLocaleTimeString()} [SENT] op=${customOpCode}`, ...prev].slice(0, 100))
    }
    setCustomOpCode('')
  }

  return (
    <PageLayout
      title="WebSocket Test Console"
      description={`Test ${mode === 'cloud' ? 'Ably pub/sub' : 'direct WebSocket'} communication with ESP32 devices. Use this page to verify connectivity, send commands, and monitor responses.`}
    >
      <Button variant="ghost" size="sm" asChild className="w-fit -mt-4">
        <a href="/control">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Control
        </a>
      </Button>

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              )}
              Connection
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {mode === 'cloud' ? '☁️ Cloud' : '🏠 Local'}
              </Badge>
              <Badge
                variant={state === 'connected' ? 'default' : state === 'error' ? 'destructive' : 'secondary'}
                className="capitalize text-xs"
              >
                {state}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button
              onClick={connect}
              disabled={isConnected || isConnecting}
              size="sm"
            >
              Connect
            </Button>
            <Button
              onClick={disconnect}
              disabled={!isConnected && !isConnecting}
              variant="outline"
              size="sm"
            >
              Disconnect
            </Button>
            <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Plug className="h-3.5 w-3.5" />
                {connectedDevices.length} device{connectedDevices.length !== 1 ? 's' : ''}
              </span>
              {pingLatency !== null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {pingLatency}ms
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Commands */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-purple-500" />
              Commands
            </CardTitle>
            <CardDescription>Send commands to all connected devices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={requestStatus}
                disabled={!isConnected}
                variant="secondary"
                size="sm"
                className="font-medium"
              >
                <Activity className="w-3.5 h-3.5 mr-1" />
                Ping
              </Button>
              <Button
                onClick={startGame}
                disabled={!isConnected}
                size="sm"
                className="font-medium bg-green-600 hover:bg-green-700"
              >
                Start
              </Button>
              <Button
                onClick={stopGame}
                disabled={!isConnected}
                variant="destructive"
                size="sm"
                className="font-medium"
              >
                Stop
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder='Custom: {"op": 1, "type": "get_status"}'
                value={customOpCode}
                onChange={(e) => setCustomOpCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendCustomOpCode()}
                className="font-mono text-xs"
                disabled={!isConnected}
              />
              <Button
                onClick={sendCustomOpCode}
                disabled={!isConnected || !customOpCode.trim()}
                size="icon"
                variant="outline"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connected Devices */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              Connected Devices
              <Badge variant="secondary" className="ml-auto text-xs">
                {connectedDevices.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectedDevices.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-auto">
                {connectedDevices.map((id) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-md border p-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      <span className="font-mono text-xs">{id}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setPingStart(Date.now())
                        send(id, { op: OpCode.GET_STATUS, type: 'get_status' })
                      }}
                      disabled={!isConnected}
                    >
                      Ping
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">
                {isConnected
                  ? 'Waiting for devices to connect...'
                  : 'Connect to see available devices'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="h-5 w-5" />
              Message Log
            </CardTitle>
            {log.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setLog([])}
              >
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/30 p-3 font-mono text-xs max-h-64 overflow-auto space-y-0.5">
            {log.length > 0 ? (
              log.map((line, idx) => (
                <div
                  key={`${line}-${idx}`}
                  className="text-muted-foreground hover:text-foreground transition-colors py-0.5"
                >
                  {line}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Messages from devices will appear here...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  )
}

export function CommDemoClient({ locale }: { locale: string }) {
  const sessionId = useMemo(() => `demo-${locale}`, [locale])

  return (
    <GameCommProvider sessionId={sessionId} autoConnect>
      <CommDemoContent />
    </GameCommProvider>
  )
}