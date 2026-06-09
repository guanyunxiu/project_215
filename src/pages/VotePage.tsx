import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocket } from '@/hooks/useSocket'
import {
  Vote, Trophy, Crown, Users, ArrowRight, Star, ThumbsUp
} from 'lucide-react'

export default function VotePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    room, voteCandidates, voteResults, hasVoted, setRoom,
  } = useGameStore()
  const { castVote, connect, joinRoom } = useSocket()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [voted, setVoted] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    connect()
    if (roomId) {
      joinRoom(roomId)
    }
  }, [user, roomId])

  useEffect(() => {
    if (room?.status === 'finished' && voteResults) {
      setTimeout(() => {
        navigate(`/result/${roomId}`)
      }, 3000)
    }
  }, [room?.status, voteResults, roomId])

  const handleVote = useCallback(() => {
    if (!selectedId || voted) return
    castVote(selectedId)
    setVoted(true)
  }, [selectedId, voted, castVote])

  if (!room || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-dark)' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/60">加载投票页面...</p>
        </div>
      </div>
    )
  }

  const hasVoteResults = voteResults && voteResults.length > 0
  const maxVotes = hasVoteResults ? Math.max(...voteResults.map(r => r.votes)) : 0
  const winners = hasVoteResults ? voteResults.filter(r => r.isWinner) : []

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg-dark)' }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'rgba(255,107,53,0.15)' }}>
            <Vote className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-3xl font-bold text-white font-display mb-2">
            {hasVoteResults ? '投票结果' : '评选最佳画手'}
          </h1>
          <p className="text-white/50">
            {hasVoteResults ? '最终结果已出炉！' : '投票选出你心目中的最佳画手'}
          </p>
        </div>

        {!hasVoteResults ? (
          <div className="space-y-3">
            {voteCandidates.map((candidate) => {
              const isSelf = candidate.userId === user.id
              return (
                <button
                  key={candidate.userId}
                  onClick={() => !isSelf && setSelectedId(candidate.userId)}
                  disabled={isSelf || voted}
                  className={`w-full glass-card-solid p-4 flex items-center gap-4 transition-all text-left ${
                    isSelf
                      ? 'opacity-50 cursor-not-allowed'
                      : selectedId === candidate.userId
                      ? 'ring-2 scale-[1.02]'
                      : 'hover:bg-white/[0.08] hover:scale-[1.01]'
                  }`}
                  style={selectedId === candidate.userId ? { outlineColor: 'var(--color-primary)', outlineWidth: '2px', outlineStyle: 'solid' } : {}}
                >
                  <span className="text-3xl">{candidate.avatar}</span>
                  <div className="flex-1">
                    <p className="text-white font-medium">{candidate.username}</p>
                    {isSelf && <p className="text-white/30 text-xs">不能投给自己</p>}
                  </div>
                  {selectedId === candidate.userId && (
                    <Star className="w-6 h-6" style={{ color: 'var(--color-accent-yellow)' }} />
                  )}
                </button>
              )
            })}

            <button
              onClick={handleVote}
              disabled={!selectedId || voted}
              className={`w-full py-3.5 rounded-xl font-bold text-lg font-display transition-all flex items-center justify-center gap-2 mt-4 ${
                selectedId && !voted
                  ? 'text-white hover:brightness-110 active:scale-[0.98]'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
              style={selectedId && !voted ? { background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))' } : {}}
            >
              {voted ? (
                <>
                  <ThumbsUp className="w-5 h-5" />
                  已投票，等待其他人...
                </>
              ) : (
                <>
                  <Vote className="w-5 h-5" />
                  投票
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in-up">
            {voteResults
              .sort((a, b) => b.votes - a.votes)
              .map((result, idx) => {
                const candidate = voteCandidates.find(c => c.userId === result.userId)
                if (!candidate) return null
                const votePercent = maxVotes > 0 ? (result.votes / maxVotes) * 100 : 0
                return (
                  <div
                    key={result.userId}
                    className={`glass-card-solid p-4 relative overflow-hidden ${
                      result.isWinner ? 'ring-2 ring-yellow-400/50' : ''
                    }`}
                  >
                    {result.isWinner && (
                      <div className="absolute top-2 right-2">
                        <Crown className="w-5 h-5 text-yellow-400" />
                      </div>
                    )}
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-sm font-bold text-white/40 w-6">{idx + 1}</span>
                      <span className="text-2xl">{candidate.avatar}</span>
                      <div className="flex-1">
                        <p className="text-white font-medium">{candidate.username}</p>
                        <p className="text-xs text-white/40">{result.votes} 票</p>
                      </div>
                      {result.isWinner && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,217,61,0.2)', color: 'var(--color-accent-yellow)' }}>
                          🏆 最佳画手
                        </span>
                      )}
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full animate-bar-grow"
                        style={{
                          width: `${votePercent}%`,
                          background: result.isWinner
                            ? 'linear-gradient(90deg, var(--color-accent-yellow), var(--color-primary))'
                            : 'var(--color-primary)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}

            <div className="text-center mt-6">
              <p className="text-white/40 text-sm">即将跳转到结果页面...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
