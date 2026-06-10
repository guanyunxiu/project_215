import type { StrokeData } from '../../shared/types.js'

interface ReplayRound {
  roundNumber: number
  drawerId: string
  drawerName: string
  drawerAvatar: string
  word: string
  strokes: StrokeData[]
}

interface ReplayRecord {
  id: string
  roomId: string
  roomName: string
  userId: string
  username: string
  avatar: string
  createdAt: string
  rounds: ReplayRound[]
}

const replayStore = new Map<string, ReplayRecord>()

export function saveReplay(record: ReplayRecord): void {
  replayStore.set(record.id, record)
}

export function getReplay(id: string): ReplayRecord | undefined {
  return replayStore.get(id)
}

export function getUserReplays(userId: string): ReplayRecord[] {
  const results: ReplayRecord[] = []
  for (const [, record] of replayStore) {
    if (record.userId === userId) {
      results.push(record)
    }
  }
  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function deleteReplay(id: string, userId: string): boolean {
  const record = replayStore.get(id)
  if (!record || record.userId !== userId) return false
  replayStore.delete(id)
  return true
}
