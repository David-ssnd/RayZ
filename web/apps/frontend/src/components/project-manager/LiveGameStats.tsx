/**
 * LiveGameStats - Real-time game statistics display
 * Shows countdown timer, scores, leaderboard based on game mode
 */

'use client'

import { Clock, Target, Heart, Trophy, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface PlayerScore {
  playerId: string
  playerName: string
  playerNumber: number
  teamId?: string
  teamName?: string
  score: number
  kills: number
  deaths: number
  hearts: number
  eliminated: boolean
}

interface LiveGameStatsProps {
  winType: 'time' | 'score' | 'last_man_standing'
  targetScore?: number
  durationMinutes?: number
  gameStartedAt?: Date
  players: PlayerScore[]
  isGameRunning: boolean
  isGameOver: boolean
}

export function LiveGameStats({
  winType,
  targetScore,
  durationMinutes,
  gameStartedAt,
  players,
  isGameRunning,
  isGameOver
}: LiveGameStatsProps) {
  const t = useTranslations('Control.liveStats')
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  useEffect(() => {
    if (winType !== 'time' || !gameStartedAt || !durationMinutes || !isGameRunning) {
      return
    }

    const interval = setInterval(() => {
      const endTime = new Date(gameStartedAt.getTime() + durationMinutes * 60 * 1000)
      const remaining = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000))
      setTimeRemaining(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [winType, gameStartedAt, durationMinutes, isGameRunning])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const sortedPlayers = [...players].sort((a, b) => {
    if (winType === 'last_man_standing') {
      // Sort by hearts (descending), then by kills
      if (b.hearts !== a.hearts) return b.hearts - a.hearts
      return b.kills - a.kills
    }
    // Sort by score (descending)
    return b.score - a.score
  })

  const topPlayer = sortedPlayers[0]
  const progressPercent = targetScore && topPlayer
    ? Math.min(100, (topPlayer.score / targetScore) * 100)
    : 0

  if (!isGameRunning && !isGameOver) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* Win Condition Progress */}
      <div className="border rounded-lg p-3 bg-card">
        {winType === 'time' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{t('timeRemaining')}</span>
              </div>
              <span className={`text-lg font-mono ${timeRemaining < 60 ? 'text-destructive' : ''}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${durationMinutes ? ((durationMinutes * 60 - timeRemaining) / (durationMinutes * 60)) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        )}

        {winType === 'score' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                <span className="font-medium">{t('targetScore')}</span>
              </div>
              <span className="text-lg font-semibold">
                {topPlayer?.score || 0} / {targetScore}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {winType === 'last_man_standing' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4" />
                <span className="font-medium">{t('playersAlive')}</span>
              </div>
              <span className="text-lg font-semibold">
                {players.filter(p => !p.eliminated && p.hearts > 0).length} / {players.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="border rounded-lg bg-card">
        <div className="p-2 border-b">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4" />
            <h3 className="text-sm font-medium">{t('leaderboard')}</h3>
          </div>
        </div>
        <div className="divide-y max-h-[280px] overflow-y-auto">
          {sortedPlayers.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              {t('noPlayerData')}
            </div>
          ) : (
            sortedPlayers.map((player, index) => (
              <div
                key={player.playerId}
                className={`p-2 flex items-center gap-2 ${
                  player.eliminated ? 'opacity-50' : ''
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                  index === 1 ? 'bg-gray-400/20 text-gray-600 dark:text-gray-400' :
                  index === 2 ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {player.playerName}
                    </span>
                    {player.eliminated && (
                      <span className="text-xs text-muted-foreground">({t('eliminated')})</span>
                    )}
                  </div>
                  {player.teamName && (
                    <span className="text-xs text-muted-foreground">
                      {player.teamName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  {winType === 'last_man_standing' ? (
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      <span className="font-medium">{player.hearts}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span className="font-medium">{player.score}</span>
                    </div>
                  )}
                  <div className="text-muted-foreground">
                    {player.kills}K / {player.deaths}D
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
