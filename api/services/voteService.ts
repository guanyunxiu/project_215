import type { VoteCandidate, VoteResult } from '../../shared/types.js'

interface VoteState {
  candidates: VoteCandidate[]
  votes: Map<string, string>
}

const voteStates = new Map<string, VoteState>()

export function startVote(roomId: string, candidates: VoteCandidate[]): void {
  voteStates.set(roomId, {
    candidates,
    votes: new Map(),
  })
}

export function castVote(roomId: string, voterId: string, candidateId: string): boolean {
  const state = voteStates.get(roomId)
  if (!state) return false
  if (state.votes.has(voterId)) return false
  if (!state.candidates.some(c => c.userId === candidateId)) return false
  if (voterId === candidateId) return false

  state.votes.set(voterId, candidateId)
  return true
}

export function getVoteResults(roomId: string): VoteResult[] {
  const state = voteStates.get(roomId)
  if (!state) return []

  const tally = new Map<string, number>()
  for (const candidate of state.candidates) {
    tally.set(candidate.userId, 0)
  }
  for (const candidateId of state.votes.values()) {
    tally.set(candidateId, (tally.get(candidateId) ?? 0) + 1)
  }

  let maxVotes = 0
  for (const count of tally.values()) {
    if (count > maxVotes) maxVotes = count
  }

  return state.candidates.map(c => ({
    userId: c.userId,
    votes: tally.get(c.userId) ?? 0,
    isWinner: tally.get(c.userId) === maxVotes && maxVotes > 0,
  }))
}

export function hasVoted(roomId: string, userId: string): boolean {
  const state = voteStates.get(roomId)
  if (!state) return false
  return state.votes.has(userId)
}

export function allVoted(roomId: string): boolean {
  const state = voteStates.get(roomId)
  if (!state) return false
  const candidateIds = new Set(state.candidates.map(c => c.userId))
  const voterCount = state.candidates.length
  let validVotes = 0
  for (const [voterId] of state.votes) {
    if (candidateIds.has(voterId)) validVotes++
  }
  return validVotes >= voterCount - 1
}

export function cleanupVote(roomId: string): void {
  voteStates.delete(roomId)
}
