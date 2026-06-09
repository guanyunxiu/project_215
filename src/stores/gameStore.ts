import { create } from 'zustand'
import type { Room, ChatMessage, StrokeData, ScoreUpdate, VoteCandidate, VoteResult, GuessRecord, ReplayRound } from '../../shared/types'

interface DrawerInfo {
  userId: string
  username: string
  avatar: string
}

interface GameState {
  room: Room | null
  currentWord: string | null
  currentHint: string
  timeLeft: number
  chatMessages: ChatMessage[]
  strokes: StrokeData[]
  scores: ScoreUpdate[]
  guessRecords: GuessRecord[]
  isVoting: boolean
  voteCandidates: VoteCandidate[]
  voteResults: VoteResult[] | null
  hasVoted: boolean
  roundEndWord: string | null
  isGameStarted: boolean
  replayRounds: ReplayRound[]
  currentDrawer: DrawerInfo | null

  setRoom: (room: Room | null) => void
  setCurrentWord: (word: string | null) => void
  setCurrentHint: (hint: string) => void
  setTimeLeft: (time: number) => void
  addChatMessage: (message: ChatMessage) => void
  clearChat: () => void
  addStroke: (stroke: StrokeData) => void
  setStrokes: (strokes: StrokeData[]) => void
  clearStrokes: () => void
  removeLastStroke: () => void
  setScores: (scores: ScoreUpdate[]) => void
  addGuessRecord: (record: GuessRecord) => void
  clearGuessRecords: () => void
  setIsVoting: (voting: boolean) => void
  setVoteCandidates: (candidates: VoteCandidate[]) => void
  setVoteResults: (results: VoteResult[] | null) => void
  setHasVoted: (voted: boolean) => void
  setRoundEndWord: (word: string | null) => void
  setIsGameStarted: (started: boolean) => void
  saveRoundReplay: (round: ReplayRound) => void
  setCurrentDrawer: (drawer: DrawerInfo | null) => void
  resetGame: () => void
}

export const useGameStore = create<GameState>((set) => ({
  room: null,
  currentWord: null,
  currentHint: '',
  timeLeft: 60,
  chatMessages: [],
  strokes: [],
  scores: [],
  guessRecords: [],
  isVoting: false,
  voteCandidates: [],
  voteResults: null,
  hasVoted: false,
  roundEndWord: null,
  isGameStarted: false,
  replayRounds: [],
  currentDrawer: null,

  setRoom: (room) => set({ room }),
  setCurrentWord: (word) => set({ currentWord: word }),
  setCurrentHint: (hint) => set({ currentHint: hint }),
  setTimeLeft: (time) => set({ timeLeft: time }),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  clearChat: () => set({ chatMessages: [] }),
  addStroke: (stroke) =>
    set((state) => ({ strokes: [...state.strokes, stroke] })),
  setStrokes: (strokes) => set({ strokes }),
  clearStrokes: () => set({ strokes: [] }),
  removeLastStroke: () =>
    set((state) => ({
      strokes: state.strokes.slice(0, -1),
    })),
  setScores: (scores) => set({ scores }),
  addGuessRecord: (record) =>
    set((state) => ({ guessRecords: [...state.guessRecords, record] })),
  clearGuessRecords: () => set({ guessRecords: [] }),
  setIsVoting: (voting) => set({ isVoting: voting }),
  setVoteCandidates: (candidates) => set({ voteCandidates: candidates }),
  setVoteResults: (results) => set({ voteResults: results }),
  setHasVoted: (voted) => set({ hasVoted: voted }),
  setRoundEndWord: (word) => set({ roundEndWord: word }),
  setIsGameStarted: (started) => set({ isGameStarted: started }),
  saveRoundReplay: (round) =>
    set((state) => ({ replayRounds: [...state.replayRounds, round] })),
  setCurrentDrawer: (drawer) => set({ currentDrawer: drawer }),
  resetGame: () =>
    set({
      currentWord: null,
      currentHint: '',
      timeLeft: 60,
      chatMessages: [],
      strokes: [],
      scores: [],
      guessRecords: [],
      isVoting: false,
      voteCandidates: [],
      voteResults: null,
      hasVoted: false,
      roundEndWord: null,
      isGameStarted: false,
      replayRounds: [],
      currentDrawer: null,
    }),
}))
