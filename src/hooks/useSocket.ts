import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'
import type { ChatMessage, StrokeData } from '../../shared/types'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const { user, token } = useAuthStore()
  const gameStore = useGameStore

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return
    if (!user) return

    const socket = io({
      auth: {
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('Socket connected')
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    socket.on('room:updated', (data: { room: any }) => {
      gameStore.getState().setRoom(data.room)
    })

    socket.on('room:chat', (data: { message: ChatMessage }) => {
      gameStore.getState().addChatMessage(data.message)
    })

    socket.on('room:kicked', () => {
      gameStore.getState().setRoom(null)
      gameStore.getState().resetGame()
    })

    socket.on('game:started', (data: { room: any }) => {
      gameStore.getState().setRoom(data.room)
      gameStore.getState().setIsGameStarted(true)
      gameStore.getState().clearStrokes()
      gameStore.getState().clearChat()
      gameStore.getState().clearGuessRecords()
      gameStore.getState().setCurrentWord(null)
      gameStore.getState().setCurrentHint('')
      gameStore.getState().setTimeLeft(60)
      gameStore.getState().setRoundEndWord(null)
      const drawer = data.room?.players?.find((p: any) => p.isDrawing)
      if (drawer) {
        gameStore.getState().setCurrentDrawer({
          userId: drawer.userId,
          username: drawer.username,
          avatar: drawer.avatar,
        })
      }
    })

    socket.on('game:wordAssigned', (data: { word: string; drawerId: string }) => {
      if (user && data.drawerId === user.id) {
        gameStore.getState().setCurrentWord(data.word)
      }
    })

    socket.on('game:hintReveal', (data: { hint: string }) => {
      gameStore.getState().setCurrentHint(data.hint)
    })

    socket.on('game:timer', (data: { timeLeft: number }) => {
      gameStore.getState().setTimeLeft(data.timeLeft)
    })

    socket.on('game:roundStart', (data: { roundNumber: number; drawerId: string; room: any }) => {
      gameStore.getState().setRoom(data.room)
      gameStore.getState().clearStrokes()
      gameStore.getState().clearGuessRecords()
      gameStore.getState().setCurrentWord(null)
      gameStore.getState().setCurrentHint('')
      gameStore.getState().setTimeLeft(60)
      gameStore.getState().setRoundEndWord(null)
      const drawer = data.room?.players?.find((p: any) => p.isDrawing)
      if (drawer) {
        gameStore.getState().setCurrentDrawer({
          userId: drawer.userId,
          username: drawer.username,
          avatar: drawer.avatar,
        })
      }
    })

    socket.on('game:roundEnd', (data: { word: string; room: any }) => {
      const state = gameStore.getState()
      const drawer = state.currentDrawer
      if (drawer && state.strokes.length > 0 && state.room) {
        const already = state.replayRounds.some(r => r.roundNumber === state.room!.currentRound)
        if (!already) {
          gameStore.getState().saveRoundReplay({
            roundNumber: state.room.currentRound,
            drawerId: drawer.userId,
            drawerName: drawer.username,
            drawerAvatar: drawer.avatar,
            word: data.word,
            strokes: [...state.strokes],
          })
        }
      }
      gameStore.getState().setRoundEndWord(data.word)
      gameStore.getState().setRoom(data.room)
      gameStore.getState().setCurrentWord(null)
      gameStore.getState().setCurrentHint('')
    })

    socket.on('game:gameEnd', (data: { room: any }) => {
      const state = gameStore.getState()
      const drawer = state.currentDrawer
      if (drawer && state.strokes.length > 0 && state.room) {
        const already = state.replayRounds.some(r => r.roundNumber === state.room!.currentRound)
        if (!already) {
          gameStore.getState().saveRoundReplay({
            roundNumber: state.room.currentRound,
            drawerId: drawer.userId,
            drawerName: drawer.username,
            drawerAvatar: drawer.avatar,
            word: state.roundEndWord || state.currentWord || '',
            strokes: [...state.strokes],
          })
        }
      }
      gameStore.getState().setRoom(data.room)
      gameStore.getState().setIsGameStarted(false)
    })

    socket.on('game:stroke', (data: { stroke: StrokeData }) => {
      gameStore.getState().addStroke(data.stroke)
    })

    socket.on('game:existingStrokes', (data: { strokes: StrokeData[] }) => {
      gameStore.getState().setStrokes(data.strokes)
    })

    socket.on('game:cleared', () => {
      gameStore.getState().clearStrokes()
    })

    socket.on('game:strokes', (data: { strokes: StrokeData[] }) => {
      gameStore.getState().setStrokes(data.strokes)
    })

    socket.on('game:guessResult', (data: { userId: string; username: string; correct: boolean; scores: any[]; guess: string }) => {
      gameStore.getState().setScores(data.scores)
      gameStore.getState().addGuessRecord({
        userId: data.userId,
        username: data.username,
        content: data.guess,
        isCorrect: data.correct,
        timestamp: Date.now(),
      })
    })

    socket.on('vote:start', (data: { candidates: any[] }) => {
      gameStore.getState().setIsVoting(true)
      gameStore.getState().setVoteCandidates(data.candidates)
      gameStore.getState().setVoteResults(null)
      gameStore.getState().setHasVoted(false)
    })

    socket.on('vote:updated', (_data: { voterId: string; totalVotes: number }) => {
    })

    socket.on('vote:result', (data: { results: any[] }) => {
      gameStore.getState().setVoteResults(data.results)
    })

    socket.on('error', (data: { message: string }) => {
      console.error('Socket error:', data.message)
    })

    socketRef.current = socket
  }, [user, gameStore])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('room:join', { roomId })
  }, [])

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave')
  }, [])

  const startGame = useCallback(() => {
    socketRef.current?.emit('room:start')
  }, [])

  const sendChat = useCallback((content: string) => {
    socketRef.current?.emit('room:chat', { content })
  }, [])

  const sendDraw = useCallback((stroke: StrokeData) => {
    socketRef.current?.emit('game:draw', { stroke })
  }, [])

  const sendGuess = useCallback((guess: string) => {
    socketRef.current?.emit('game:guess', { guess })
  }, [])

  const clearCanvas = useCallback(() => {
    socketRef.current?.emit('game:clear')
  }, [])

  const undoStroke = useCallback(() => {
    socketRef.current?.emit('game:undo')
  }, [])

  const kickPlayer = useCallback((userId: string) => {
    socketRef.current?.emit('room:kick', { userId })
  }, [])

  const castVote = useCallback((candidateId: string) => {
    socketRef.current?.emit('vote:cast', { candidateId })
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    socket: socketRef,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    startGame,
    sendChat,
    sendDraw,
    sendGuess,
    clearCanvas,
    undoStroke,
    kickPlayer,
    castVote,
  }
}
