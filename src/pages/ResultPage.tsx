import { useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocket } from '@/hooks/useSocket'
import {
  Trophy, Crown, Medal, Home, RotateCcw, Gamepad2, Star, Sparkles
} from 'lucide-react'

export default function ResultPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { room, voteResults, voteCandidates, resetGame, clearChat, setRoom } = useGameStore()
  const { connect, leaveRoom } = useSocket()

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user])

  const handleBackToLobby = useCallback(() => {
    leaveRoom()
    resetGame()
    clearChat()
    setRoom(null)
    navigate('/lobby')
  }, [leaveRoom, resetGame, clearChat, setRoom])

  if (!room || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-dark)' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/60">加载结果...</p>
        </div>
      </div>
    )
  }

  const rankedPlayers = [...room.players]
    .filter(p => p.isConnected)
    .sort((a, b) => b.score - a.score)

  const winner = rankedPlayers[0]
  const voteWinner = voteResults?.find(r => r.isWinner)
  const voteWinnerCandidate = voteCandidates?.find(c => c.userId === voteWinner?.userId)

  const podiumOrder = rankedPlayers.length >= 3
    ? [rankedPlayers[1], rankedPlayers[0], rankedPlayers[2]]
    : rankedPlayers.length === 2
    ? [rankedPlayers[1], rankedPlayers[0]]
    : rankedPlayers

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg-dark)' }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 animate-float" style={{ background: 'rgba(255,217,61,0.15)' }}>
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-4xl font-bold text-white font-display mb-2">游戏结束</h1>
          <p className="text-white/50">最终结果揭晓！</p>
        </div>

        {rankedPlayers.length >= 2 && (
          <div className="flex items-end justify-center gap-4 mb-8">
            {podiumOrder.map((player, idx) => {
              const actualRank = rankedPlayers.indexOf(player) + 1
              const heights = { 1: 'h-32', 2: 'h-44', 3: 'h-24' }
              const height = heights[actualRank as keyof typeof heights] || 'h-20'
              const isFirst = actualRank === 1

              return (
                <div key={player.userId} className="flex flex-col items-center" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="relative mb-2">
                    <span className={`text-4xl block ${isFirst ? 'animate-float' : ''}`}>
                      {player.avatar}
                    </span>
                    {isFirst && (
                      <Crown className="w-5 h-5 text-yellow-400 absolute -top-3 left-1/2 -translate-x-1/2" />
                    )}
                  </div>
                  <p className="text-sm text-white font-medium mb-1 max-w-[80px] truncate">{player.username}</p>
                  <div
                    className={`w-20 ${height} rounded-t-xl flex flex-col items-center justify-end pb-3 transition-all ${
                      isFirst
                        ? 'bg-gradient-to-t from-yellow-500/30 to-yellow-400/10 border-t-2 border-yellow-400'
                        : actualRank === 2
                        ? 'bg-gradient-to-t from-gray-400/20 to-gray-300/5 border-t-2 border-gray-400'
                        : 'bg-gradient-to-t from-amber-700/20 to-amber-600/5 border-t-2 border-amber-600'
                    }`}
                  >
                    <span className={`text-lg font-bold font-display ${
                      isFirst ? 'text-yellow-400' : actualRank === 2 ? 'text-gray-300' : 'text-amber-500'
                    }`}>
                      {player.score}
                    </span>
                    <span className="text-[10px] text-white/40">分</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="glass-card-solid p-5 mb-6">
          <h3 className="text-lg font-bold text-white mb-4 font-display flex items-center gap-2">
            <Medal className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            完整排名
          </h3>
          <div className="space-y-2">
            {rankedPlayers.map((player, idx) => {
              const isUser = player.userId === user.id
              return (
                <div
                  key={player.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isUser ? 'bg-white/10 border border-white/10' : 'bg-white/[0.03]'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                    idx === 2 ? 'bg-amber-600/20 text-amber-500' :
                    'bg-white/5 text-white/40'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-xl">{player.avatar}</span>
                  <div className="flex-1">
                    <p className="text-white font-medium flex items-center gap-2">
                      {player.username}
                      {isUser && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,107,53,0.15)', color: 'var(--color-primary)' }}>你</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-display" style={{ color: 'var(--color-accent-yellow)' }}>
                      {player.score}
                    </p>
                    <p className="text-[10px] text-white/30">分</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {voteWinnerCandidate && (
          <div className="glass-card-solid p-5 mb-6 text-center" style={{ borderColor: 'rgba(255,217,61,0.2)' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-lg font-bold text-white font-display">最佳画手</span>
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-4xl block mb-1">{voteWinnerCandidate.avatar}</span>
            <p className="text-white font-bold">{voteWinnerCandidate.username}</p>
            <p className="text-yellow-400/60 text-sm">{voteWinner?.votes ?? 0} 票</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleBackToLobby}
            className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-purple-900 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-lg font-display"
          >
            <Home className="w-5 h-5" />
            返回大厅
          </button>
        </div>
      </div>
    </div>
  )
}
