import type { StrokeData, ScoreUpdate } from '../../shared/types.js'
import { getRandomWord } from '../data/words.js'
import * as roomService from './roomService.js'

const GUESS_SCORES = [100, 80, 60, 40, 20]
const ASSIST_SCORE = 50
const ROUND_DURATION = 60

interface GameState {
  currentRound: number
  totalRounds: number
  currentWord: string
  currentHint: string
  strokes: StrokeData[]
  roundStartTime: number
  timerInterval: ReturnType<typeof setInterval> | null
  drawerIndex: number
  playersDrawn: Set<string>
  correctGuessCount: number
  roundScores: ScoreUpdate[]
  usedWords: string[]
}

const gameStates = new Map<string, GameState>()

function getGameState(roomId: string): GameState | undefined {
  return gameStates.get(roomId)
}

function initGameState(roomId: string, totalRounds: number): GameState {
  const state: GameState = {
    currentRound: 0,
    totalRounds,
    currentWord: '',
    currentHint: '',
    strokes: [],
    roundStartTime: 0,
    timerInterval: null,
    drawerIndex: 0,
    playersDrawn: new Set(),
    correctGuessCount: 0,
    roundScores: [],
    usedWords: [],
  }
  gameStates.set(roomId, state)
  return state
}

export function startGame(roomId: string): {
  drawerId: string
  word: string
  hint: string
} | null {
  const room = roomService.getRoom(roomId)
  if (!room || room.players.length < 2) return null

  const state = initGameState(roomId, room.totalRounds)
  room.currentRound = 1

  const connectedPlayers = room.players.filter(p => p.isConnected)
  if (connectedPlayers.length === 0) return null

  state.drawerIndex = 0
  const drawer = connectedPlayers[state.drawerIndex]
  const wordEntry = getRandomWord()
  state.currentWord = wordEntry.word
  state.currentHint = generateHint(wordEntry.word, 0)
  state.usedWords.push(wordEntry.word)
  state.playersDrawn.add(drawer.userId)
  state.roundStartTime = Date.now()
  state.strokes = []
  state.correctGuessCount = 0
  state.roundScores = []

  roomService.updateRoomStatus(roomId, 'playing')
  roomService.resetPlayersForNewRound(roomId)
  roomService.setPlayerDrawing(roomId, drawer.userId, true)

  return {
    drawerId: drawer.userId,
    word: wordEntry.word,
    hint: state.currentHint,
  }
}

export function startNextRound(roomId: string): {
  drawerId: string
  word: string
  hint: string
} | null {
  const room = roomService.getRoom(roomId)
  const state = getGameState(roomId)
  if (!room || !state) return null

  const connectedPlayers = room.players.filter(p => p.isConnected)
  if (connectedPlayers.length === 0) return null

  state.drawerIndex = (state.drawerIndex + 1) % connectedPlayers.length
  const drawer = connectedPlayers[state.drawerIndex]

  if (state.playersDrawn.has(drawer.userId)) {
    if (state.playersDrawn.size >= connectedPlayers.length) {
      state.currentRound++
      state.playersDrawn.clear()
      if (state.currentRound > state.totalRounds) {
        roomService.updateRoomStatus(roomId, 'finished')
        return null
      }
      room.currentRound = state.currentRound
      state.drawerIndex = 0
      const nextDrawer = connectedPlayers[0]
      state.playersDrawn.add(nextDrawer.userId)
      const wordEntry = getRandomWord(state.usedWords)
      state.currentWord = wordEntry.word
      state.currentHint = generateHint(wordEntry.word, 0)
      state.usedWords.push(wordEntry.word)
      state.roundStartTime = Date.now()
      state.strokes = []
      state.correctGuessCount = 0
      state.roundScores = []

      roomService.resetPlayersForNewRound(roomId)
      roomService.setPlayerDrawing(roomId, nextDrawer.userId, true)

      return {
        drawerId: nextDrawer.userId,
        word: wordEntry.word,
        hint: state.currentHint,
      }
    }

    for (let i = 0; i < connectedPlayers.length; i++) {
      const idx = (state.drawerIndex + i) % connectedPlayers.length
      const candidate = connectedPlayers[idx]
      if (!state.playersDrawn.has(candidate.userId)) {
        state.drawerIndex = idx
        break
      }
    }
  }

  const nextDrawer = connectedPlayers[state.drawerIndex]
  state.playersDrawn.add(nextDrawer.userId)
  const wordEntry = getRandomWord(state.usedWords)
  state.currentWord = wordEntry.word
  state.currentHint = generateHint(wordEntry.word, 0)
  state.usedWords.push(wordEntry.word)
  state.roundStartTime = Date.now()
  state.strokes = []
  state.correctGuessCount = 0
  state.roundScores = []

  roomService.resetPlayersForNewRound(roomId)
  roomService.setPlayerDrawing(roomId, nextDrawer.userId, true)

  return {
    drawerId: nextDrawer.userId,
    word: wordEntry.word,
    hint: state.currentHint,
  }
}

export function handleGuess(
  roomId: string,
  userId: string,
  guess: string,
): { correct: boolean; scores: ScoreUpdate[] } {
  const room = roomService.getRoom(roomId)
  const state = getGameState(roomId)
  if (!room || !state) return { correct: false, scores: [] }

  const player = room.players.find(p => p.userId === userId)
  if (!player || player.isDrawing || player.hasGuessed) {
    return { correct: false, scores: [] }
  }

  const isCorrect = guess.trim() === state.currentWord
  const scores: ScoreUpdate[] = []

  if (isCorrect) {
    roomService.setPlayerGuessed(roomId, userId, true)

    const guessScoreIdx = Math.min(
      state.correctGuessCount,
      GUESS_SCORES.length - 1,
    )
    const guessScore = GUESS_SCORES[guessScoreIdx]
    state.correctGuessCount++

    roomService.updatePlayerScore(roomId, userId, guessScore)
    scores.push({ userId, pointsEarned: guessScore, reason: 'guess' })

    const drawer = room.players.find(p => p.isDrawing)
    if (drawer) {
      roomService.updatePlayerScore(roomId, drawer.userId, ASSIST_SCORE)
      scores.push({
        userId: drawer.userId,
        pointsEarned: ASSIST_SCORE,
        reason: 'assist',
      })
    }

    state.roundScores.push(...scores)
  }

  return { correct: isCorrect, scores }
}

export function getTimeLeft(roomId: string): number {
  const state = getGameState(roomId)
  if (!state || !state.roundStartTime) return 0
  const elapsed = Math.floor((Date.now() - state.roundStartTime) / 1000)
  return Math.max(0, ROUND_DURATION - elapsed)
}

export function recordStroke(roomId: string, stroke: StrokeData): void {
  const state = getGameState(roomId)
  if (!state) return
  state.strokes.push(stroke)
}

export function getStrokes(roomId: string): StrokeData[] {
  const state = getGameState(roomId)
  return state?.strokes ?? []
}

export function clearStrokes(roomId: string): void {
  const state = getGameState(roomId)
  if (!state) return
  state.strokes = []
}

export function startRoundTimer(
  roomId: string,
  onTick: (timeLeft: number) => void,
  onEnd: () => void,
): void {
  const state = getGameState(roomId)
  if (!state) return

  stopRoundTimer(roomId)

  state.roundStartTime = Date.now()

  state.timerInterval = setInterval(() => {
    const timeLeft = getTimeLeft(roomId)
    onTick(timeLeft)
    if (timeLeft <= 0) {
      stopRoundTimer(roomId)
      onEnd()
    }
  }, 1000)
}

export function stopRoundTimer(roomId: string): void {
  const state = getGameState(roomId)
  if (!state) return
  if (state.timerInterval) {
    clearInterval(state.timerInterval)
    state.timerInterval = null
  }
}

export function generateHint(word: string, revealPercent: number): string {
  if (revealPercent <= 0) {
    return word.replace(/[^\s]/g, '_')
  }

  const chars = word.split('')
  const totalChars = chars.filter(c => c.trim().length > 0).length
  const revealCount = Math.max(1, Math.floor(totalChars * revealPercent))

  const charIndices: number[] = []
  chars.forEach((c, i) => {
    if (c.trim().length > 0) charIndices.push(i)
  })

  const revealed = new Set<number>()
  while (revealed.size < revealCount && revealed.size < charIndices.length) {
    const idx = charIndices[Math.floor(Math.random() * charIndices.length)]
    revealed.add(idx)
  }

  return chars
    .map((c, i) => {
      if (c.trim().length === 0) return c
      return revealed.has(i) ? c : '_'
    })
    .join('')
}

export function allNonDrawersGuessed(roomId: string): boolean {
  const room = roomService.getRoom(roomId)
  if (!room) return true
  const nonDrawers = room.players.filter(p => !p.isDrawing && p.isConnected)
  return nonDrawers.length > 0 && nonDrawers.every(p => p.hasGuessed)
}

export function getCurrentWord(roomId: string): string {
  const state = getGameState(roomId)
  return state?.currentWord ?? ''
}

export function getCurrentHint(roomId: string): string {
  const state = getGameState(roomId)
  return state?.currentHint ?? ''
}

export function updateHint(roomId: string, hint: string): void {
  const state = getGameState(roomId)
  if (state) state.currentHint = hint
}

export function cleanupGame(roomId: string): void {
  stopRoundTimer(roomId)
  gameStates.delete(roomId)
}
