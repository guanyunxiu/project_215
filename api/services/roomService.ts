import { v4 as uuidv4 } from 'uuid'
import type { Room, Player } from '../../shared/types.js'

const rooms = new Map<string, Room>()

export function createRoom(
  hostId: string,
  hostName: string,
  hostAvatar: string,
  name: string,
  maxPlayers: number,
  rounds: number,
): Room {
  const room: Room = {
    id: uuidv4(),
    name,
    hostId,
    maxPlayers,
    rounds,
    status: 'waiting',
    players: [
      {
        userId: hostId,
        username: hostName,
        avatar: hostAvatar,
        score: 0,
        isDrawing: false,
        hasGuessed: false,
        isConnected: true,
      },
    ],
    currentRound: 0,
    totalRounds: rounds,
    createdAt: new Date().toISOString(),
  }
  rooms.set(room.id, room)
  return room
}

export function joinRoom(
  roomId: string,
  userId: string,
  username: string,
  avatar: string,
): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null
  if (room.players.length >= room.maxPlayers && !room.players.some(p => p.userId === userId)) return null

  const existingPlayer = room.players.find(p => p.userId === userId)
  if (existingPlayer) {
    existingPlayer.isConnected = true
    return room
  }

  const player: Player = {
    userId,
    username,
    avatar,
    score: 0,
    isDrawing: false,
    hasGuessed: false,
    isConnected: true,
  }
  room.players.push(player)
  return room
}

export function leaveRoom(roomId: string, userId: string): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null

  room.players = room.players.filter(p => p.userId !== userId)

  if (room.players.length === 0) {
    rooms.delete(roomId)
    return null
  }

  if (room.hostId === userId) {
    room.hostId = room.players[0].userId
  }

  return room
}

export function kickPlayer(roomId: string, hostId: string, userId: string): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null
  if (room.hostId !== hostId) return null
  if (hostId === userId) return null

  room.players = room.players.filter(p => p.userId !== userId)
  return room
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId)
}

export function getAllRooms(): Room[] {
  return Array.from(rooms.values())
}

export function removeRoom(roomId: string): void {
  rooms.delete(roomId)
}

export function updateRoomStatus(
  roomId: string,
  status: Room['status'],
): Room | undefined {
  const room = rooms.get(roomId)
  if (!room) return undefined
  room.status = status
  return room
}

export function updatePlayerScore(
  roomId: string,
  userId: string,
  points: number,
): Room | undefined {
  const room = rooms.get(roomId)
  if (!room) return undefined
  const player = room.players.find(p => p.userId === userId)
  if (!player) return undefined
  player.score += points
  return room
}

export function setPlayerDrawing(
  roomId: string,
  userId: string,
  isDrawing: boolean,
): Room | undefined {
  const room = rooms.get(roomId)
  if (!room) return undefined
  const player = room.players.find(p => p.userId === userId)
  if (!player) return undefined
  player.isDrawing = isDrawing
  return room
}

export function setPlayerGuessed(
  roomId: string,
  userId: string,
  hasGuessed: boolean,
): Room | undefined {
  const room = rooms.get(roomId)
  if (!room) return undefined
  const player = room.players.find(p => p.userId === userId)
  if (!player) return undefined
  player.hasGuessed = hasGuessed
  return room
}

export function setPlayerConnected(
  roomId: string,
  userId: string,
  isConnected: boolean,
): Room | undefined {
  const room = rooms.get(roomId)
  if (!room) return undefined
  const player = room.players.find(p => p.userId === userId)
  if (!player) return undefined
  player.isConnected = isConnected
  return room
}

export function resetPlayersForNewRound(roomId: string): Room | undefined {
  const room = rooms.get(roomId)
  if (!room) return undefined
  for (const player of room.players) {
    player.isDrawing = false
    player.hasGuessed = false
  }
  return room
}
