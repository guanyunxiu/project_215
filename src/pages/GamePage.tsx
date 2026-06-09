import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocket } from '@/hooks/useSocket'
import DrawingCanvas from '@/components/DrawingCanvas'
import {
  Send, LogOut, Eraser, Pen, Minus, Plus, RotateCcw,
  Trash2, Clock, Users, Trophy, Eye, MessageCircle
} from 'lucide-react'
import type { ChatMessage } from '../../shared/types'

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#FF6B35', '#FFD93D',
  '#6BCB77', '#4ECDC4', '#3B82F6', '#8B5CF6', '#FF6B8A',
  '#A0522D', '#808080', '#FF69B4', '#00CED1',
]

const WIDTHS = [2, 4, 6, 10, 16]

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    room, currentWord, currentHint, timeLeft, strokes, chatMessages,
    scores, guessRecords, roundEndWord, voteResults, setRoom, resetGame, addChatMessage, clearChat,
  } = useGameStore()
  const { sendDraw, sendGuess, clearCanvas, undoStroke, leaveRoom, connect, joinRoom } = useSocket()

  const [color, setColor] = useState('#000000')
  const [width, setWidth] = useState(4)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [guessInput, setGuessInput] = useState('')
  const [clearCounter, setClearCounter] = useState(0)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [scoreAnimations, setScoreAnimations] = useState<{ userId: string; points: number; id: number }[]>([])

  const chatEndRef = useRef<HTMLDivElement>(null)
  const animIdRef = useRef(0)

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
    if (room?.status === 'waiting' && roomId) {
      navigate(`/room/${roomId}`)
    }
  }, [room?.status, roomId])

  useEffect(() => {
    if (room?.status === 'voting' && roomId) {
      navigate(`/vote/${roomId}`)
    }
  }, [room?.status, roomId])

  useEffect(() => {
    if (room?.status === 'finished' && roomId && voteResults && voteResults.length > 0) {
      setTimeout(() => {
        navigate(`/result/${roomId}`)
      }, 3000)
    }
  }, [room?.status, voteResults, roomId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, guessRecords])

  useEffect(() => {
    if (scores.length > 0) {
      const newAnims = scores.map((s) => ({
        userId: s.userId,
        points: s.pointsEarned,
        id: ++animIdRef.current,
      }))
      setScoreAnimations((prev) => [...prev, ...newAnims])
      setTimeout(() => {
        setScoreAnimations((prev) => prev.filter((a) => !newAnims.find((n) => n.id === a.id)))
      }, 1500)
    }
  }, [scores])

  const handleGuess = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!guessInput.trim()) return

    const guessText = guessInput.trim()
    setGuessInput('')

    const isDrawer = room?.players.find(p => p.userId === user?.id)?.isDrawing
    if (isDrawer) return

    const hasGuessed = room?.players.find(p => p.userId === user?.id)?.hasGuessed
    if (hasGuessed) return

    sendGuess(guessText)
  }, [guessInput, sendGuess, room, user])

  const handleClearCanvas = useCallback(() => {
    clearCanvas()
    setClearCounter(c => c + 1)
  }, [clearCanvas])

  const handleUndo = useCallback(() => {
    undoStroke()
  }, [undoStroke])

  const handleLeave = useCallback(() => {
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
          <p className="text-white/60">加载游戏中...</p>
        </div>
      </div>
    )
  }

  const currentPlayer = room.players.find(p => p.userId === user.id)
  const isDrawer = currentPlayer?.isDrawing ?? false
  const hasGuessed = currentPlayer?.hasGuessed ?? false
  const connectedPlayers = room.players.filter(p => p.isConnected)
  const timerPercent = (timeLeft / 60) * 100
  const timerColor = timeLeft <= 10 ? 'bg-red-500' : timeLeft <= 20 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg-dark)' }}>
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/50">第</span>
              <span className="text-lg font-bold text-white font-display">{room.currentRound}</span>
              <span className="text-sm text-white/50">/ {room.totalRounds} 轮</span>
            </div>

            <div className="h-6 w-px bg-white/10" />

            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-white/50" />
              <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${timerColor}`}
                  style={{ width: `${timerPercent}%` }}
                />
              </div>
              <span className={`text-sm font-bold font-display min-w-[2rem] text-center ${
                timeLeft <= 10 ? 'text-red-400 animate-countdown-pulse' : 'text-white'
              }`}>
                {timeLeft}s
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isDrawer && currentWord ? (
              <div className="px-3 py-1 rounded-lg flex items-center gap-2" style={{ background: 'rgba(255,107,53,0.15)' }}>
                <Pen className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>你的词：</span>
                <span className="text-lg font-bold text-white font-display">{currentWord}</span>
              </div>
            ) : !isDrawer ? (
              <div className="px-3 py-1 rounded-lg flex items-center gap-2" style={{ background: 'rgba(255,217,61,0.1)' }}>
                <Eye className="w-4 h-4" style={{ color: 'var(--color-accent-yellow)' }} />
                <span className="text-sm" style={{ color: 'var(--color-accent-yellow)' }}>提示：</span>
                <span className="text-lg font-bold text-white font-display tracking-widest">{currentHint || '___'}</span>
              </div>
            ) : null}

            <div className="flex items-center gap-1 text-white/50 text-sm">
              <Users className="w-4 h-4" />
              {connectedPlayers.length}
            </div>

            <button onClick={handleLeave} className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all" title="离开">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex min-h-0 max-w-7xl mx-auto w-full p-3 gap-3">
        <div className="flex flex-col gap-3 w-56 shrink-0">
          <div className="glass-card-solid p-3 flex-1 overflow-y-auto">
            <h3 className="text-sm font-bold text-white/60 mb-2 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" style={{ color: 'var(--color-accent-yellow)' }} />
              排行榜
            </h3>
            <div className="space-y-1.5">
              {[...room.players]
                .filter(p => p.isConnected)
                .sort((a, b) => b.score - a.score)
                .map((player, idx) => (
                  <div
                    key={player.userId}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-all relative ${
                      player.userId === user.id ? 'bg-white/10' : 'bg-white/[0.03]'
                    } ${player.isDrawing ? 'ring-1 ring-orange-500/50' : ''}`}
                  >
                    <span className={`text-xs font-bold w-5 text-center ${
                      idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-white/40'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-base">{player.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate flex items-center gap-1">
                        {player.username}
                        {player.isDrawing && <Pen className="w-3 h-3 text-orange-400" />}
                        {player.hasGuessed && !player.isDrawing && <span className="text-green-400">✓</span>}
                      </p>
                      <p className="text-xs font-bold font-display" style={{ color: 'var(--color-accent-yellow)' }}>
                        {player.score}
                      </p>
                    </div>
                    {scoreAnimations.filter(a => a.userId === player.userId).map(a => (
                      <span key={a.id} className="absolute -top-1 right-1 text-xs font-bold animate-score-fly" style={{ color: 'var(--color-accent-green)' }}>
                        +{a.points}
                      </span>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {isDrawer && (
            <div className="glass-card-solid p-2 flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTool('pen')}
                  className={`p-2 rounded-lg transition-all ${tool === 'pen' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
                  title="画笔"
                >
                  <Pen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
                  title="橡皮擦"
                >
                  <Eraser className="w-4 h-4" />
                </button>
              </div>

              <div className="h-6 w-px bg-white/10" />

              <div className="flex items-center gap-1 relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-8 h-8 rounded-lg border-2 border-white/20 transition-all hover:border-white/40"
                  style={{ backgroundColor: color }}
                  title="选择颜色"
                />
                {showColorPicker && (
                  <div className="absolute top-10 left-0 z-20 glass-card-solid p-2 grid grid-cols-7 gap-1">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => { setColor(c); setTool('pen'); setShowColorPicker(false) }}
                        className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${
                          color === c ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
                <div className="flex gap-0.5">
                  {COLORS.slice(0, 8).map(c => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setTool('pen') }}
                      className={`w-5 h-5 rounded transition-all hover:scale-110 ${
                        color === c && tool === 'pen' ? 'ring-1 ring-white' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="h-6 w-px bg-white/10" />

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWidth(w => Math.max(2, w - 2))}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/10 transition-all"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1 px-2">
                  {WIDTHS.map(w => (
                    <button
                      key={w}
                      onClick={() => setWidth(w)}
                      className={`rounded-full transition-all ${
                        width === w ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                      }`}
                      style={{ width: `${Math.max(w, 6)}px`, height: `${Math.max(w, 6)}px` }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setWidth(w => Math.min(20, w + 2))}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/10 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-6 w-px bg-white/10" />

              <div className="flex items-center gap-1">
                <button
                  onClick={handleUndo}
                  className="p-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/10 transition-all"
                  title="撤销"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClearCanvas}
                  className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="清空画布"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 relative min-h-0" style={{ background: '#fff' }}>
            <DrawingCanvas
              isDrawing={isDrawer}
              strokes={strokes}
              onDraw={sendDraw}
              onClear={() => {}}
              onUndo={() => {}}
              color={color}
              width={width}
              tool={tool}
              clearStrokes={clearCounter}
            />
            {!isDrawer && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {hasGuessed && (
                  <div className="bg-green-500/80 text-white px-6 py-3 rounded-xl font-bold text-lg backdrop-blur-sm">
                    ✓ 你已猜对！
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="w-64 shrink-0 flex flex-col gap-3">
          <div className="glass-card-solid p-3 flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-bold text-white/60 mb-2 flex items-center gap-1.5 shrink-0">
              <MessageCircle className="w-3.5 h-3.5" style={{ color: 'var(--color-accent-green)' }} />
              猜词聊天
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 mb-2 min-h-0">
              {chatMessages.map((msg: ChatMessage) => (
                <div key={msg.id} className={`text-xs ${msg.isSystem ? 'text-center' : ''}`}>
                  {msg.isSystem ? (
                    <span className="text-white/30 text-[10px] bg-white/5 rounded-full px-2 py-0.5 inline-block">
                      {msg.content}
                    </span>
                  ) : (
                    <div className="flex gap-1.5">
                      <span className="font-medium shrink-0" style={{ color: 'var(--color-primary)' }}>
                        {msg.username}:
                      </span>
                      <span className="text-white/70">{msg.content}</span>
                    </div>
                  )}
                </div>
              ))}
              {guessRecords.map((rec, i) => (
                <div key={i} className={`text-xs flex gap-1.5 items-center ${rec.isCorrect ? 'text-green-400' : 'text-white/40'}`}>
                  <span className="font-medium shrink-0">{rec.username}:</span>
                  <span>{rec.isCorrect ? '✓ 猜对了！' : rec.content}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {!isDrawer && !hasGuessed && room.status === 'playing' && (
              <form onSubmit={handleGuess} className="flex gap-1.5 shrink-0">
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="输入你的猜测..."
                  className="flex-1 px-2.5 py-1.5 bg-white/10 border border-white/10 rounded-lg text-white text-xs placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30"
                  maxLength={20}
                  autoComplete="off"
                />
                <button type="submit" className="p-1.5 rounded-lg text-white transition-all active:scale-90" style={{ background: 'var(--color-primary)' }}>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {isDrawer && (
              <div className="text-xs text-white/30 text-center py-1.5 bg-white/5 rounded-lg shrink-0">
                你是画手，不能猜词
              </div>
            )}

            {hasGuessed && !isDrawer && (
              <div className="text-xs text-green-400 text-center py-1.5 bg-green-500/10 rounded-lg shrink-0">
                等待其他玩家猜词...
              </div>
            )}
          </div>
        </div>
      </main>

      {roundEndWord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card-solid p-8 text-center max-w-md animate-fade-in-up">
            <h2 className="text-2xl font-bold text-white mb-4 font-display">回合结束！</h2>
            <p className="text-white/60 mb-2">正确答案是：</p>
            <p className="text-3xl font-bold mb-6 font-display" style={{ color: 'var(--color-accent-yellow)' }}>{roundEndWord}</p>
            <div className="space-y-2 mb-6">
              {room.players
                .filter(p => p.isConnected)
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <div key={p.userId} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white/40">{i + 1}</span>
                      <span>{p.avatar}</span>
                      <span className="text-sm text-white">{p.username}</span>
                    </div>
                    <span className="text-sm font-bold font-display" style={{ color: 'var(--color-accent-yellow)' }}>{p.score}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
