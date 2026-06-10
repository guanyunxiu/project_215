import { Router, type Request, type Response } from 'express'
import { verifyToken } from '../middleware/auth.js'
import * as replayService from '../services/replayService.js'

const router = Router()

router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id
  const replays = replayService.getUserReplays(userId)
  res.status(200).json({ success: true, replays })
})

router.get('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const replay = replayService.getReplay(req.params.id)
  if (!replay) {
    res.status(404).json({ success: false, error: 'Replay not found' })
    return
  }
  res.status(200).json({ success: true, replay })
})

router.post('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const { id, roomId, roomName, rounds } = req.body
  if (!id || !roomId || !rounds || !Array.isArray(rounds)) {
    res.status(400).json({ success: false, error: 'Invalid replay data' })
    return
  }
  const record = {
    id,
    roomId,
    roomName: roomName || '',
    userId: req.user!.id,
    username: req.user!.username,
    avatar: req.user!.avatar,
    createdAt: new Date().toISOString(),
    rounds,
  }
  replayService.saveReplay(record)
  res.status(201).json({ success: true, replay: record })
})

router.delete('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const deleted = replayService.deleteReplay(req.params.id, req.user!.id)
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Replay not found or not authorized' })
    return
  }
  res.status(200).json({ success: true })
})

export default router
