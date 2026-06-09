import { Router, type Request, type Response } from 'express'
import { getRandomWord } from '../data/words.js'

const router = Router()

router.get('/random', async (_req: Request, res: Response): Promise<void> => {
  const word = getRandomWord()
  res.status(200).json({ success: true, word })
})

export default router
