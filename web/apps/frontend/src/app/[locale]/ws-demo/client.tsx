'use client'

import { useEffect, useMemo, useState } from 'react'
import { GameCommandType, OpCode, type ClientMessage, type ServerMessage } from '@rayz/types'
import { Activity, BarChart3, Zap } from 'lucide-react'

import {
  CloudOnly,
  Feature,
  GameCommProvider,
  LocalOnly,
  ModeIndicator,
  useFeatureFlags,
  useGameCommContext,
} from '@/lib/comm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
  const flags = useFeatureFlags()

  // Subscribe to device messages
  useEffect(() => {
    const unsubscribe = onMessage('*', (message: ServerMessage, fromDevice: string) => {
      const line = `${new Date().toLocaleTimeString()} — ${fromDevice}: ${message.type}`
      setLog((prev) => [line, ...prev].slice(0, 30))
    })

    return () => unsubscribe()
  }, [onMessage])

  // Quick action handlers
  const requestStatus = () => {
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

  // Connection status badge color
  const getStatusBadgeVariant = () => {
    if (state === 'connected') return 'default'
    if (state === 'connecting') return 'secondary'
    if (state === 'error') return 'destructive'
    return 'outline'
  }

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Communication Demo
        </h1>
        <p className="text-muted-foreground text-sm">
          Test {mode === 'cloud' ? 'Ably' : 'WebSocket'} with ESP32 devices
        </p>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connection Controls */}
        <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Activity className="h-5 w-5 text-blue-500" />
              Connection
              <div className="ml-auto flex items-center gap-1.5">
                <ModeIndicator className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm" />
                <Badge
                  variant={getStatusBadgeVariant()}
                  className="capitalize text-[10px] px-2 py-0 h-5 shadow-sm"
                >
                  {state}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={connect}
                disabled={isConnected || isConnecting}
                variant="default"
                size="sm"
                className="flex-1 min-w-[100px] font-semibold"
              >
                Connect
              </Button>
              <Button
                onClick={disconnect}
                disabled={!isConnected && !isConnecting}
                variant="outline"
                size="sm"
                className="flex-1 min-w-[100px] font-semibold"
              >
                Disconnect
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border p-2.5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                  Mode
                </p>
                <p className="font-bold capitalize text-sm mt-0.5">{mode}</p>
              </div>
              <div className="rounded-lg border border-border p-2.5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                  Devices
                </p>
                <p className="font-bold text-sm mt-0.5">{connectedDevices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Zap className="h-5 w-5 text-purple-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button
                onClick={requestStatus}
                disabled={!isConnected}
                variant="secondary"
                size="sm"
                className="text-xs h-9 font-semibold shadow-sm w-full"
              >
                Status
              </Button>
              <Button
                onClick={startGame}
                disabled={!isConnected}
                variant="default"
                size="sm"
                className="text-xs h-9 font-semibold shadow-sm bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 w-full"
              >
                Start
              </Button>
              <Button
                onClick={stopGame}
                disabled={!isConnected}
                variant="destructive"
                size="sm"
                className="text-xs h-9 font-semibold shadow-sm w-full"
              >
                Stop
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Device List */}
        <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              Connected Devices
              <Badge variant="secondary" className="ml-auto text-xs font-bold">
                {connectedDevices.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectedDevices.length > 0 ? (
              <div className="space-y-1.5 max-h-24 overflow-auto scrollbar-thin">
                {connectedDevices.map((id) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-lg border border-border p-2 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 shadow-sm hover:shadow transition-shadow"
                  >
                    <span className="font-mono text-[11px] font-semibold truncate">{id}</span>
                    <Badge variant="outline" className="text-[9px] h-4 shrink-0 font-bold">
                      {mode}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-3">No devices connected</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-base font-bold">Message Log</CardTitle>
            <CardDescription className="text-xs">Real-time device communications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-3 font-mono text-[11px] max-h-32 overflow-auto space-y-1 shadow-inner">
              {log.length > 0 ? (
                log.map((line, idx) => (
                  <div
                    key={`${line}-${idx}`}
                    className="text-muted-foreground hover:text-foreground transition-colors py-0.5 px-1 rounded hover:bg-background/50"
                  >
                    {line}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  Waiting for messages...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-base font-bold">Active Features</CardTitle>
            <CardDescription className="text-xs">Enabled feature flags</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(flags)
                .filter(([, enabled]) => enabled)
                .map(([name]) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border border-emerald-200 dark:border-emerald-800 shadow-sm"
                  >
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
                    <span className="capitalize text-xs font-semibold">
                      {name.replace(/([A-Z])/g, ' $1')}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <CloudOnly>
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 dark:border-blue-700 dark:from-blue-950 dark:to-blue-900 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-blue-900 dark:text-blue-100 text-base font-bold">
                ☁️ Cloud Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 dark:text-blue-200 text-sm font-medium">
              Running in cloud mode with Ably
            </CardContent>
          </Card>
        </CloudOnly>

        <LocalOnly>
          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 dark:border-amber-700 dark:from-amber-950 dark:to-amber-900 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-amber-900 dark:text-amber-100 text-base font-bold">
                🏠 Local Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="text-amber-800 dark:text-amber-200 text-sm font-medium">
              Running in local mode with WebSocket
            </CardContent>
          </Card>
        </LocalOnly>

        <Feature name="adminDashboard">
          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:border-emerald-700 dark:from-emerald-950 dark:to-emerald-900 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-emerald-900 dark:text-emerald-100 text-base font-bold">
                👑 Admin Panel
              </CardTitle>
            </CardHeader>
            <CardContent className="text-emerald-800 dark:text-emerald-200 text-sm font-medium">
              Admin features enabled.
            </CardContent>
          </Card>
        </Feature>
      </div>
    </div>
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