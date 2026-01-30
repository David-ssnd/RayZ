/**
 * GameOverDialog - Displays game results and winner announcement
 */

'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trophy, Target, Clock, Heart, Zap, TrendingUp } from 'lucide-react'

interface PlayerResult {
  playerId: string
  playerName: string
  playerNumber: number
  teamId?: string
  teamName?: string
  score: number
  kills: number
  deaths: number
  hits: number
  shots: number
  finalHearts: number
  eliminated: boolean
}

interface GameOverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  winType: 'time' | 'score' | 'elimination' | 'draw'
  winnerName?: string
  winnerType?: 'team' | 'player'
  matchDuration?: number // seconds
  players: PlayerResult[]
  onNewGame: () => void
  onRematch: () => void
}

export function GameOverDialog({
  open,
  onOpenChange,
  winType,
  winnerName,
  winnerType,
  matchDuration,
  players,
  onNewGame,
  onRematch
}: GameOverDialogProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const topPlayer = sortedPlayers[0]

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const totalKills = players.reduce((sum, p) => sum + p.kills, 0)
  const totalShots = players.reduce((sum, p) => sum + p.shots, 0)
  const totalHits = players.reduce((sum, p) => sum + p.hits, 0)
  const accuracy = totalShots > 0 ? ((totalHits / totalShots) * 100).toFixed(1) : '0.0'

  const getWinTypeIcon = () => {
    switch (winType) {
      case 'time':
        return <Clock className="w-6 h-6" />
      case 'score':
        return <Target className="w-6 h-6" />
      case 'elimination':
        return <Heart className="w-6 h-6" />
      default:
        return <Trophy className="w-6 h-6" />
    }
  }

  const getWinTypeLabel = () => {
    switch (winType) {
      case 'time':
        return 'Time Expired'
      case 'score':
        return 'Target Score Reached'
      case 'elimination':
        return 'Last Standing'
      case 'draw':
        return 'Draw'
      default:
        return 'Game Over'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Game Over</DialogTitle>
        </DialogHeader>

        {/* Winner Announcement */}
        {winType !== 'draw' && winnerName && (
          <div className="text-center py-6 space-y-3 border rounded-lg bg-gradient-to-b from-yellow-500/10 to-transparent">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                {winnerType === 'team' ? 'Team' : 'Player'} Victory
              </div>
              <div className="text-2xl font-bold mt-1">{winnerName}</div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {getWinTypeIcon()}
              <span>{getWinTypeLabel()}</span>
            </div>
          </div>
        )}

        {winType === 'draw' && (
          <div className="text-center py-6 space-y-3 border rounded-lg">
            <div className="text-xl font-semibold">It's a Draw!</div>
            <div className="text-sm text-muted-foreground">{getWinTypeLabel()}</div>
          </div>
        )}

        {/* Match Statistics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{formatDuration(matchDuration || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">Duration</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{totalKills}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Kills</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{accuracy}%</div>
            <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
          </div>
        </div>

        {/* Final Leaderboard */}
        <div className="border rounded-lg">
          <div className="p-2 border-b bg-muted/50">
            <h3 className="text-sm font-medium">Final Standings</h3>
          </div>
          <div className="divide-y">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.playerId}
                className={`p-3 ${index === 0 ? 'bg-yellow-500/5' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0
                        ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                        : index === 1
                          ? 'bg-gray-400/20 text-gray-600 dark:text-gray-400'
                          : index === 2
                            ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                            : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{player.playerName}</span>
                      {player.eliminated && (
                        <span className="text-xs text-muted-foreground">(Eliminated)</span>
                      )}
                    </div>
                    {player.teamName && (
                      <div className="text-xs text-muted-foreground">{player.teamName}</div>
                    )}

                    <div className="grid grid-cols-4 gap-3 mt-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Score</div>
                        <div className="font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {player.score}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">K/D</div>
                        <div className="font-medium">
                          {player.kills} / {player.deaths}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Accuracy</div>
                        <div className="font-medium">
                          {player.shots > 0
                            ? `${((player.hits / player.shots) * 100).toFixed(0)}%`
                            : '0%'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Ratio</div>
                        <div className="font-medium">
                          {player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills}
                        </div>
                      </div>
                    </div>
                  </div>

                  {index === 0 && (
                    <div className="flex-shrink-0">
                      <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={onRematch} variant="outline" className="flex-1">
            Rematch
          </Button>
          <Button onClick={onNewGame} className="flex-1">
            New Game
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
