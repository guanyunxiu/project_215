export interface User {
  id: string
  username: string
  avatar: string
  createdAt: string
}

export interface Room {
  id: string
  name: string
  hostId: string
  maxPlayers: number
  rounds: number
  status: 'waiting' | 'playing' | 'voting' | 'finished'
  players: Player[]
  currentRound: number
  totalRounds: number
  createdAt: string
}

export interface Player {
  userId: string
  username: string
  avatar: string
  score: number
  isDrawing: boolean
  hasGuessed: boolean
  isConnected: boolean
}

export interface StrokeData {
  type: 'path'
  points: { x: number; y: number }[]
  color: string
  width: number
  tool: 'pen' | 'eraser'
  timestamp: number
}

export interface GameRound {
  roundNumber: number
  drawerId: string
  word: string
  hint: string
  timeLeft: number
  startTime: number
}

export interface ScoreUpdate {
  userId: string
  pointsEarned: number
  reason: 'guess' | 'assist' | 'vote'
}

export interface VoteCandidate {
  userId: string
  username: string
  avatar: string
  thumbnailDataUrl: string
}

export interface VoteResult {
  userId: string
  votes: number
  isWinner: boolean
}

export interface LeaderboardEntry {
  userId: string
  username: string
  avatar: string
  totalScore: number
  gamesPlayed: number
  wins: number
}

export interface ChatMessage {
  id: string
  userId: string
  username: string
  content: string
  timestamp: number
  isSystem?: boolean
}

export interface GuessRecord {
  userId: string
  username: string
  content: string
  isCorrect: boolean
  timestamp: number
}
