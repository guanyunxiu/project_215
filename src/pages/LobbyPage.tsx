import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocket } from '@/hooks/useSocket'
import ReplayCanvas from '@/components/ReplayCanvas'
import {
  Plus, LogOut, Users, Gamepad2, RefreshCw,
  DoorOpen, Crown, Clock, X, Minus, User as UserIcon,
  Play, Trash2, Palette, ChevronDown, ChevronUp
} from 'lucide-react'
import type { Room, ReplayRecord } from '../../shared/types'

export default function LobbyPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [rounds, setRounds] = useState(3)
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'lobby' | 'replay'>('lobby')
  const [replays, setReplays] = useState<ReplayRecord[]>([])
  const [expandedReplay, setExpandedReplay] = useState<string | null>(null)
  const [selectedRound, setSelectedRound] = useState<number | null>(null)
  const [replayLoading, setReplayLoading] = useState(false)

  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { setRoom } = useGameStore()
  const { joinRoom, connect } = useSocket()

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms')
      const data = await res.json()
      if (data.success) {
        setRooms(data.rooms)
      }
    } catch (err) {
      console.error('Failed to fetch rooms', err)
    }
  }, [])

  const fetchReplays = useCallback(async () => {
    if (!user) return
    setReplayLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/replays', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setReplays(data.replays)
      }
    } catch (err) {
      console.error('Failed to fetch replays', err)
    } finally {
      setReplayLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    connect()
    fetchRooms()
    fetchReplays()
    const interval = setInterval(fetchRooms, 3000)
    return () => clearInterval(interval)
  }, [user, navigate, fetchRooms, fetchReplays, connect])

  useEffect(() => {
    if (activeTab === 'replay') {
      fetchReplays()
    }
  }, [activeTab, fetchReplays])

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: roomName.trim(),
          maxPlayers,
          rounds,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setRoom(data.room)
        joinRoom(data.room.id)
        navigate(`/room/${data.room.id}`)
      }
    } catch (err) {
      console.error('Failed to create room', err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = (roomId: string) => {
    setJoining(roomId)
    setRoom(null)
    joinRoom(roomId)
    setTimeout(() => {
      navigate(`/room/${roomId}`)
    }, 300)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleDeleteReplay = async (replayId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/replays/${replayId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setReplays(prev => prev.filter(r => r.id !== replayId))
        if (expandedReplay === replayId) {
          setExpandedReplay(null)
          setSelectedRound(null)
        }
      }
    } catch (err) {
      console.error('Failed to delete replay', err)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-6 h-6 text-yellow-400" />
            <h1 className="text-xl font-bold text-white">涂鸦对战</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
              <span className="text-2xl">{user.avatar}</span>
              <span className="text-white font-medium">{user.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-white/60 hover:text-red-400 transition-colors"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 max-w-xs">
          <button
            onClick={() => setActiveTab('lobby')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'lobby'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            <Users className="w-4 h-4" />
            游戏大厅
          </button>
          <button
            onClick={() => setActiveTab('replay')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'replay'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            <Play className="w-4 h-4" />
            创作回放
          </button>
        </div>

        {activeTab === 'lobby' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6" />
                游戏大厅
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={fetchRooms}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center gap-2 border border-white/10"
                >
                  <RefreshCw className="w-4 h-4" />
                  刷新
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-purple-900 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  创建房间
                </button>
              </div>
            </div>

            {rooms.length === 0 ? (
              <div className="text-center py-20">
                <DoorOpen className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg">暂无房间，快来创建一个吧！</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => {
                  const isFull = room.players.length >= room.maxPlayers
                  const isPlaying = room.status === 'playing'
                  return (
                    <div
                      key={room.id}
                      className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-white/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-white truncate max-w-[180px]">
                          {room.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            room.status === 'waiting'
                              ? 'bg-green-500/20 text-green-400'
                              : room.status === 'playing'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {room.status === 'waiting'
                            ? '等待中'
                            : room.status === 'playing'
                            ? '游戏中'
                            : room.status === 'voting'
                            ? '投票中'
                            : '已结束'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-white/60 mb-4">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5" />
                          {room.players.length}/{room.maxPlayers}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {room.totalRounds}轮
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mb-4">
                        {room.players.slice(0, 6).map((p) => (
                          <span key={p.userId} className="text-lg" title={p.username}>
                            {p.avatar}
                          </span>
                        ))}
                        {room.players.length > 6 && (
                          <span className="text-white/40 text-xs ml-1">
                            +{room.players.length - 6}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40 flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          {room.players.find((p) => p.userId === room.hostId)?.username}
                        </span>
                        <button
                          onClick={() => handleJoinRoom(room.id)}
                          disabled={isFull || isPlaying}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isFull || isPlaying
                              ? 'bg-white/5 text-white/30 cursor-not-allowed'
                              : 'bg-white/20 hover:bg-white/30 text-white'
                          }`}
                        >
                          {isFull ? '已满' : isPlaying ? '游戏中' : '加入'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'replay' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Play className="w-6 h-6" />
                创作回放
              </h2>
              <button
                onClick={fetchReplays}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center gap-2 border border-white/10"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
            </div>

            {replayLoading && replays.length === 0 ? (
              <div className="text-center py-20">
                <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-white/40">加载回放记录...</p>
              </div>
            ) : replays.length === 0 ? (
              <div className="text-center py-20">
                <Palette className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg">暂无创作记录</p>
                <p className="text-white/25 text-sm mt-1">完成一局游戏后，你的创作过程将自动保存</p>
              </div>
            ) : (
              <div className="space-y-3">
                {replays.map((replay) => {
                  const isExpanded = expandedReplay === replay.id
                  const totalStrokes = replay.rounds.reduce((sum, r) => sum + r.strokes.length, 0)
                  return (
                    <div
                      key={replay.id}
                      className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => {
                          setExpandedReplay(isExpanded ? null : replay.id)
                          setSelectedRound(null)
                        }}
                        className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-all text-left"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                          <span className="text-2xl">{replay.avatar}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{replay.roomName || '涂鸦对战'}</p>
                          <p className="text-white/40 text-sm">
                            {replay.rounds.length} 轮 · {totalStrokes} 笔画 · {new Date(replay.createdAt).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDeleteReplay(replay.id, e)}
                            className="p-2 text-white/30 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-white/40" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-white/40" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-white/5">
                          <div className="flex gap-2 mt-3 mb-3 overflow-x-auto pb-1">
                            {replay.rounds.map((round) => {
                              const isOwn = round.drawerId === user?.id
                              return (
                                <button
                                  key={round.roundNumber}
                                  onClick={() => setSelectedRound(selectedRound === round.roundNumber ? null : round.roundNumber)}
                                  className={`shrink-0 px-3 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${
                                    selectedRound === round.roundNumber
                                      ? 'bg-white/15 border border-white/20'
                                      : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.06]'
                                  }`}
                                >
                                  <span className="text-base">{round.drawerAvatar}</span>
                                  <div className="text-left">
                                    <p className="text-white/80 font-medium">第 {round.roundNumber} 轮</p>
                                    <p className="text-white/40 text-xs">{round.drawerName}</p>
                                  </div>
                                  {isOwn && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,107,53,0.15)', color: 'var(--color-primary)' }}>
                                      你画的
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>

                          {selectedRound !== null && (() => {
                            const round = replay.rounds.find(r => r.roundNumber === selectedRound)
                            if (!round) return null
                            return (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-2xl">{round.drawerAvatar}</span>
                                  <div>
                                    <p className="text-white font-bold text-sm">{round.drawerName} 的创作</p>
                                    <p className="text-white/40 text-xs">
                                      第 {round.roundNumber} 轮 · {round.strokes.length} 笔画 · 答案：
                                      <span className="font-bold" style={{ color: 'var(--color-accent-yellow)' }}>{round.word}</span>
                                    </p>
                                  </div>
                                </div>
                                <ReplayCanvas strokes={round.strokes} />
                              </div>
                            )
                          })()}

                          {selectedRound === null && (
                            <p className="text-white/30 text-sm text-center py-3">点击上方回合查看回放</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">创建房间</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-purple-200 text-sm mb-1.5">房间名称</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="输入房间名称"
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-1.5">
                  最大人数: {maxPlayers}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMaxPlayers((p) => Math.max(2, p - 1))}
                    className="w-10 h-10 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center text-2xl font-bold text-white">
                    {maxPlayers}
                  </div>
                  <button
                    onClick={() => setMaxPlayers((p) => Math.min(8, p + 1))}
                    className="w-10 h-10 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-1.5">
                  游戏轮数: {rounds}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRounds((r) => Math.max(1, r - 1))}
                    className="w-10 h-10 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center text-2xl font-bold text-white">
                    {rounds}
                  </div>
                  <button
                    onClick={() => setRounds((r) => Math.min(10, r + 1))}
                    className="w-10 h-10 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={loading || !roomName.trim()}
                className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-purple-900 font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? '创建中...' : '创建并进入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
