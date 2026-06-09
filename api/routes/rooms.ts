import { Router, type Request, type Response } from 'express'
import { verifyToken } from '../middleware/auth.js'
import * as roomService from '../services/roomService.js'

const router = Router()

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const rooms = roomService.getAllRooms()
  res.status(200).json({ success: true, rooms })
})

router.post('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const { name, maxPlayers, rounds } = req.body
  const user = req.user!

  if (!name || typeof name !== 'string') {
    res.status(400).json({ success: false, error: 'Room name is required' })
    return
  }

  const room = roomService.createRoom(
    user.id,
    user.username,
    user.avatar,
    name,
    maxPlayers ?? 8,
    rounds ?? 3,
  )
  res.status(201).json({ success: true, room })
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const room = roomService.getRoom(req.params.id)
  if (!room) {
    res.status(404).json({ success: false, error: 'Room not found' })
    return
  }
  res.status(200).json({ success: true, room })
})

export default router
