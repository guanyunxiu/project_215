import type { Server, Socket } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage, StrokeData, VoteCandidate } from '../../shared/types.js'
import * as roomService from '../services/roomService.js'
import * as gameService from '../services/gameService.js'
import * as voteService from '../services/voteService.js'
import { users } from '../middleware/auth.js'

const socketRoomMap = new Map<string, string>()
const socketUserMap = new Map<string, { userId: string; username: string; avatar: string }>()

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const { userId, username, avatar } = socket.handshake.auth as {
      userId?: string
      username?: string
      avatar?: string
    }

    if (!userId || !username) {
      socket.disconnect()
      return
    }

    socketUserMap.set(socket.id, { userId, username: username ?? '', avatar: avatar ?? '' })

    socket.on('room:join', (data: { roomId: string }) => {
      const { roomId } = data
      const user = socketUserMap.get(socket.id)
      if (!user) return

      const room = roomService.joinRoom(roomId, user.userId, user.username, user.avatar)
      if (!room) {
        socket.emit('error', { message: 'Cannot join room' })
        return
      }

      socket.join(roomId)
      socketRoomMap.set(socket.id, roomId)

      if (room.status === 'playing') {
        const strokes = gameService.getStrokes(roomId)
        socket.emit('game:existingStrokes', { strokes })
      }

      io.to(roomId).emit('room:updated', { room })

      const msg: ChatMessage = {
        id: uuidv4(),
        userId: 'system',
        username: '系统',
        content: `${user.username} 加入了房间`,
        timestamp: Date.now(),
        isSystem: true,
      }
      io.to(roomId).emit('room:chat', { message: msg })
    })

    socket.on('room:leave', () => {
      handleLeaveRoom(io, socket)
    })

    socket.on('room:kick', (data: { userId: string }) => {
      const user = socketUserMap.get(socket.id)
      if (!user) return

      const roomId = socketRoomMap.get(socket.id)
      if (!roomId) return

      const room = roomService.kickPlayer(roomId, user.userId, data.userId)
      if (!room) {
        socket.emit('error', { message: 'Cannot kick player' })
        return
      }

      const targetSockets = findSocketsByUserId(io, data.userId)
      for (const s of targetSockets) {
        s.emit('room:kicked', { roomId })
        s.leave(roomId)
        socketRoomMap.delete(s.id)
      }

      io.to(roomId).emit('room:updated', { room })

      const msg: ChatMessage = {
        id: uuidv4(),
        userId: 'system',
        username: '系统',
        content: `${user.username} 踢出了玩家`,
        timestamp: Date.now(),
        isSystem: true,
      }
      io.to(roomId).emit('room:chat', { message: msg })
    })

    socket.on('room:start', () => {
      const user = socketUserMap.get(socket.id)
      if (!user) return

      const roomId = socketRoomMap.get(socket.id)
      if (!roomId) return

      const room = roomService.getRoom(roomId)
      if (!room || room.hostId !== user.userId) {
        socket.emit('error', { message: 'Only host can start the game' })
        return
      }

      if (room.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players' })
        return
      }

      const result = gameService.startGame(roomId)
      if (!result) {
        socket.emit('error', { message: 'Failed to start game' })
        return
      }

      const updatedRoom = roomService.getRoom(roomId)!

      io.to(roomId).emit('game:started', { room: updatedRoom })

      const drawerSocket = findSocketByUserId(io, result.drawerId)
      if (drawerSocket) {
        drawerSocket.emit('game:wordAssigned', {
          word: result.word,
          drawerId: result.drawerId,
        })
      }

      const hint = gameService.getCurrentHint(roomId)
      io.to(roomId).emit('game:hintReveal', { hint })

      startRoundTimer(io, roomId)
    })

    socket.on('room:chat', (data: { content: string }) => {
      const user = socketUserMap.get(socket.id)
      if (!user) return

      const roomId = socketRoomMap.get(socket.id)
      if (!roomId) return

      const room = roomService.getRoom(roomId)
      if (!room) return

      if (room.status === 'playing') {
        const player = room.players.find(p => p.userId === user.userId)
        if (player && player.hasGuessed) {
          return
        }
      }

      const msg: ChatMessage = {
        id: uuidv4(),
        userId: user.userId,
        username: user.username,
        content: data.content,
        timestamp: Date.now(),
      }
      io.to(roomId).emit('room:chat', { message: msg })
    })

    socket.on('game:draw', (data: { stroke: StrokeData }) => {
      const user = socketUserMap.get(socket.id)
      if (!user) return

      const roomId = socketRoomMap.get(socket.id)
      if (!roomId) return

      const room = roomService.getRoom(roomId)
      if (!room || room.status !== 'playing') return

      const player = room.players.find(p => p.userId === user.userId)
      if (!player || !player.isDrawing) return

      gameService.recordStroke(roomId, data.stroke)
      socket.to(roomId).emit('game:stroke', { stroke: data.stroke })
    })

    socket.on('game:guess', (data: { guess: string }) => {
      const user = socketUserMap.get(socket.id)
      if (!user) return

      const roomId = socketRoomMap.get(socket.id)
      if (!roomId) return

      const room = roomService.getRoom(roomId)
      if (!room || room.status !== 'playing') return

      const player = room.players.find(p => p.userId === user.userId)
      if (!player || player.isDrawing || player.hasGuessed) return

      const result = gameService.handleGuess(roomId, user.userId, data.guess)

      if (result.correct) {
        const updatedRoom = roomService.getRoom(roomId)!

        io.to(roomId).emit('game:guessResult', {
          userId: user.userId,
          username: user.username,
          correct: true,
          scores: result.scores,
          guess: data.guess,
        })

        io.to(roomId).emit('room:updated', { room: updatedRoom })

        const correctMsg: ChatMessage = {
          id: uuidv4(),
          userId: 'system',
          username: '系统',
          content: `${user.username} 猜对了！`,
          timestamp: Date.now(),
          isSystem: true,
        }
        io.to(roomId).emit('room:chat', { message: correctMsg })

        if (gameService.allNonDrawersGuessed(roomId)) {
          endRound(io, roomId)
        }
      } else {
        io.to(roomId).emit('game:guessResult', {
          userId: user.userId,
          username: user.username,
          correct: false,
          scores: [],
          guess: data.guess,
        })
      }
    })

    socket.on('game:clear', () => {
      const user = socketUserMap.get(socket.id)
      if (!user) return

      const roomId = socketRoomMap.get(socket.id)
      if (!roomId) return

      const room = roomService.getRoom(roomId)
      if (!room || room.status !== 'playing') return

      const player = room.players.find(p => p.userId === user.userId)
      if (!player || !player.isDrawing) return

      gameService.clearStrokes(roomId)
      io.to(roomId).emit('game:cleared', {})
    })

    socket.on('game:undo', () => {
      const user = socketUserMap.get(socket.id)
      if (!user) return

      const roomId = socketRoomMap.get(socket.id)
      if (!roomId) return

      const room = roomService.getRoom(roomId)
      if (!room || room.status !== 'playing') return

      const player = room.players.find(p => p.userId === user.userId)
      if (!player || !player.isDrawing) return

      const strokes = gameService.getStrokes(roomId)
      if (strokes.length > 0) {
        strokes.pop()
      }
      io.to(roomId).emit('game:strokes', { strokes })
    })

    socket.on('vote:cast', (data: { candidateId: string }) => {
      const user = socketUserMap.get(socket.id)
      if (!user) return

      const roomId = socketRoomMap.get(socket.id)
      if (!roomId) return

      const success = voteService.castVote(roomId, user.userId, data.candidateId)
      if (!success) {
        socket.emit('error', { message: 'Cannot cast vote' })
        return
      }

      io.to(roomId).emit('vote:updated', {
        voterId: user.userId,
        totalVotes: voteService.getVoteResults(roomId).reduce((sum, r) => sum + r.votes, 0),
      })

      if (voteService.allVoted(roomId)) {
        const results = voteService.getVoteResults(roomId)
        io.to(roomId).emit('vote:result', { results })

        const room = roomService.getRoom(roomId)
        if (room) {
          roomService.updateRoomStatus(roomId, 'finished')
          io.to(roomId).emit('room:updated', { room: roomService.getRoom(roomId)! })
        }

        voteService.cleanupVote(roomId)
      }
    })

    socket.on('replay:save', (data: { roomId: string; strokes: StrokeData[] }) => {
    })

    socket.on('disconnect', () => {
      const user = socketUserMap.get(socket.id)
      const roomId = socketRoomMap.get(socket.id)

      if (user && roomId) {
        roomService.setPlayerConnected(roomId, user.userId, false)
        io.to(roomId).emit('room:updated', { room: roomService.getRoom(roomId) })

        const msg: ChatMessage = {
          id: uuidv4(),
          userId: 'system',
          username: '系统',
          content: `${user.username} 离开了房间`,
          timestamp: Date.now(),
          isSystem: true,
        }
        io.to(roomId).emit('room:chat', { message: msg })
      }

      socketRoomMap.delete(socket.id)
      socketUserMap.delete(socket.id)
    })
  })
}

function handleLeaveRoom(io: Server, socket: Socket): void {
  const user = socketUserMap.get(socket.id)
  const roomId = socketRoomMap.get(socket.id)
  if (!user || !roomId) return

  socket.leave(roomId)
  socketRoomMap.delete(socket.id)

  const room = roomService.leaveRoom(roomId, user.userId)
  if (room) {
    io.to(roomId).emit('room:updated', { room })

    const msg: ChatMessage = {
      id: uuidv4(),
      userId: 'system',
      username: '系统',
      content: `${user.username} 离开了房间`,
      timestamp: Date.now(),
      isSystem: true,
    }
    io.to(roomId).emit('room:chat', { message: msg })
  } else {
    gameService.cleanupGame(roomId)
    voteService.cleanupVote(roomId)
  }
}

function findSocketByUserId(io: Server, userId: string): Socket | null {
  for (const [socketId, user] of socketUserMap) {
    if (user.userId === userId) {
      return io.sockets.sockets.get(socketId) ?? null
    }
  }
  return null
}

function findSocketsByUserId(io: Server, userId: string): Socket[] {
  const result: Socket[] = []
  for (const [socketId, user] of socketUserMap) {
    if (user.userId === userId) {
      const s = io.sockets.sockets.get(socketId)
      if (s) result.push(s)
    }
  }
  return result
}

function startRoundTimer(io: Server, roomId: string): void {
  const room = roomService.getRoom(roomId)
  if (!room) return

  let hintRevealedAt15 = false
  let hintRevealedAt30 = false
  let hintRevealedAt45 = false

  gameService.startRoundTimer(
    roomId,
    (timeLeft: number) => {
      io.to(roomId).emit('game:timer', { timeLeft })

      const elapsed = 60 - timeLeft
      const currentRoom = roomService.getRoom(roomId)
      if (!currentRoom || currentRoom.status !== 'playing') {
        gameService.stopRoundTimer(roomId)
        return
      }

      const word = gameService.getCurrentWord(roomId)

      if (elapsed >= 15 && !hintRevealedAt15) {
        hintRevealedAt15 = true
        const hint = gameService.generateHint(word, 0.2)
        gameService.updateHint(roomId, hint)
        const drawer = currentRoom.players.find(p => p.isDrawing)
        io.to(roomId).except(drawer?.userId ?? '').emit('game:hintReveal', { hint })
      }

      if (elapsed >= 30 && !hintRevealedAt30) {
        hintRevealedAt30 = true
        const hint = gameService.generateHint(word, 0.4)
        gameService.updateHint(roomId, hint)
        const drawer = currentRoom.players.find(p => p.isDrawing)
        io.to(roomId).except(drawer?.userId ?? '').emit('game:hintReveal', { hint })
      }

      if (elapsed >= 45 && !hintRevealedAt45) {
        hintRevealedAt45 = true
        const hint = gameService.generateHint(word, 0.6)
        gameService.updateHint(roomId, hint)
        const drawer = currentRoom.players.find(p => p.isDrawing)
        io.to(roomId).except(drawer?.userId ?? '').emit('game:hintReveal', { hint })
      }
    },
    () => {
      endRound(io, roomId)
    },
  )
}

function endRound(io: Server, roomId: string): void {
  gameService.stopRoundTimer(roomId)

  const room = roomService.getRoom(roomId)
  if (!room || room.status !== 'playing') return

  const word = gameService.getCurrentWord(roomId)
  io.to(roomId).emit('game:roundEnd', { word, room: roomService.getRoom(roomId)! })

  const nextResult = gameService.startNextRound(roomId)
  if (!nextResult) {
    const updatedRoom = roomService.getRoom(roomId)!

    if (updatedRoom.status === 'finished') {
      io.to(roomId).emit('game:gameEnd', { room: updatedRoom })

      const candidates: VoteCandidate[] = updatedRoom.players
        .filter(p => p.isConnected)
        .map(p => ({
          userId: p.userId,
          username: p.username,
          avatar: p.avatar,
          thumbnailDataUrl: '',
        }))

      voteService.startVote(roomId, candidates)
      roomService.updateRoomStatus(roomId, 'voting')
      io.to(roomId).emit('vote:start', { candidates })
      io.to(roomId).emit('room:updated', { room: roomService.getRoom(roomId)! })
      return
    }

    io.to(roomId).emit('game:gameEnd', { room: updatedRoom })
    return
  }

  const updatedRoom = roomService.getRoom(roomId)!
  io.to(roomId).emit('game:roundStart', {
    roundNumber: updatedRoom.currentRound,
    drawerId: nextResult.drawerId,
    room: updatedRoom,
  })

  const drawerSocket = findSocketByUserId(io, nextResult.drawerId)
  if (drawerSocket) {
    drawerSocket.emit('game:wordAssigned', {
      word: nextResult.word,
      drawerId: nextResult.drawerId,
    })
  }

  const hint = gameService.getCurrentHint(roomId)
  io.to(roomId).emit('game:hintReveal', { hint })

  startRoundTimer(io, roomId)
}
