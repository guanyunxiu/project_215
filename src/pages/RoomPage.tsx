import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocket } from '@/hooks/useSocket'
import {
  Crown, LogOut, Send, Play, UserX, Users, Gamepad2, MessageCircle
} from 'lucide-react'
import type { ChatMessage } from '../../shared/types'

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { room, chatMessages, isGameStarted, setRoom, resetGame, addChatMessage, clearChat } = useGameStore()
  const { connect, joinRoom, leaveRoom, startGame, sendChat, kickPlayer } = useSocket()
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

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
    if (isGameStarted && roomId) {
      navigate(`/game/${roomId}`)
    }
  }, [isGameStarted, roomId])

  useEffect(() => {
    if (room?.status === 'playing' && roomId) {
      navigate(`/game/${roomId}`)
    }
  }, [room?.status, roomId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleLeave = useCallback(() => {
    leaveRoom()
    resetGame()
    clearChat()
    setRoom(null)
    navigate('/lobby')
  }, [leaveRoom, resetGame, clearChat, setRoom])

  const handleStart = useCallback(() => {
    startGame()
  }, [startGame])

  const handleChat = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    sendChat(chatInput.trim())
    setChatInput('')
  }, [chatInput, sendChat])

  const handleKick = useCallback((userId: string) => {
    kickPlayer(userId)
  }, [kickPlayer])

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-dark)' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/60">正在加入房间...</p>
          <button onClick={handleLeave} className="mt-4 btn-secondary text-sm">返回大厅</button>
        </div>
      </div>
    )
  }

  const isHost = user?.id === room.hostId
  const canStart = isHost && room.players.filter(p => p.isConnected).length >= 2

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-dark)' }}>
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-6 h-6" style={{ color: 'var(--color-accent-yellow)' }} />
            <h1 className="text-xl font-bold text-white font-display">{room.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/50 text-sm flex items-center gap-1">
              <Users className="w-4 h-4" />
              {room.players.filter(p => p.isConnected).length}/{room.maxPlayers}
            </span>
            <button onClick={handleLeave} className="btn-secondary text-sm flex items-center gap-1.5 py-1.5">
              <LogOut className="w-4 h-4" />
              离开
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="glass-card-solid p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-display">
                <Users className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                玩家列表
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {room.players.filter(p => p.isConnected).map((player) => (
                  <div
                    key={player.userId}
                    className="relative bg-white/5 rounded-xl p-3 text-center border border-white/5 hover:border-white/20 transition-all"
                  >
                    {player.userId === room.hostId && (
                      <Crown className="w-4 h-4 absolute top-1.5 right-1.5" style={{ color: 'var(--color-accent-yellow)' }} />
                    )}
                    <span className="text-3xl block mb-1">{player.avatar}</span>
                    <p className="text-white text-sm font-medium truncate">{player.username}</p>
                    {player.userId === room.hostId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block" style={{ background: 'rgba(255,217,61,0.15)', color: 'var(--color-accent-yellow)' }}>房主</span>
                    )}
                    {isHost && player.userId !== user?.id && (
                      <button
                        onClick={() => handleKick(player.userId)}
                        className="absolute top-1.5 left-1.5 p-1 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                        title="踢出玩家"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {Array.from({ length: room.maxPlayers - room.players.filter(p => p.isConnected).length }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-white/[0.02] rounded-xl p-3 text-center border border-dashed border-white/10">
                    <span className="text-3xl block mb-1 opacity-20">?</span>
                    <p className="text-white/20 text-sm">等待加入</p>
                  </div>
                ))}
              </div>
            </section>

            {isHost && (
              <section className="glass-card-solid p-6">
                <h2 className="text-lg font-bold text-white mb-4 font-display">游戏设置</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-sm">最大人数</p>
                    <p className="text-2xl font-bold text-white font-display">{room.maxPlayers}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-sm">游戏轮数</p>
                    <p className="text-2xl font-bold text-white font-display">{room.totalRounds}</p>
                  </div>
                </div>
                <button
                  onClick={handleStart}
                  disabled={!canStart}
                  className={`w-full mt-4 py-3.5 rounded-xl font-bold text-lg font-display transition-all flex items-center justify-center gap-2 ${
                    canStart
                      ? 'text-white hover:brightness-110 active:scale-[0.98]'
                      : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                  style={canStart ? { background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))' } : {}}
                >
                  <Play className="w-5 h-5" />
                  {canStart ? '开始游戏' : '等待更多玩家...'}
                </button>
              </section>
            )}
          </div>

          <div className="lg:col-span-1">
            <section className="glass-card-solid p-4 h-[500px] flex flex-col">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2 font-display">
                <MessageCircle className="w-5 h-5" style={{ color: 'var(--color-accent-green)' }} />
                聊天
              </h2>
              <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
                {chatMessages.map((msg: ChatMessage) => (
                  <div key={msg.id} className={`text-sm ${msg.isSystem ? 'text-center' : ''}`}>
                    {msg.isSystem ? (
                      <span className="text-white/40 text-xs bg-white/5 rounded-full px-3 py-1 inline-block">
                        {msg.content}
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <span className="font-medium shrink-0" style={{ color: 'var(--color-primary)' }}>
                          {msg.username}:
                        </span>
                        <span className="text-white/80">{msg.content}</span>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="发送消息..."
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  maxLength={100}
                />
                <button type="submit" className="p-2 rounded-lg text-white transition-all active:scale-90" style={{ background: 'var(--color-primary)' }}>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
