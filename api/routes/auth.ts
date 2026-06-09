import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { users, generateToken, verifyToken } from '../middleware/auth.js'

const router = Router()

const AVATARS = [
  '🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁',
  '🐯', '🐸', '🐵', '🦄', '🐲', '🦋', '🐝', '🐙',
]

function getRandomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username } = req.body
  if (!username || typeof username !== 'string') {
    res.status(400).json({ success: false, error: 'Username is required' })
    return
  }

  for (const [, user] of users) {
    if (user.username === username) {
      res.status(409).json({ success: false, error: 'Username already exists' })
      return
    }
  }

  const userId = uuidv4()
  const user = {
    id: userId,
    username,
    avatar: getRandomAvatar(),
    createdAt: new Date().toISOString(),
  }
  users.set(userId, user)

  const token = generateToken(userId)
  res.status(201).json({ success: true, token, user })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username } = req.body
  if (!username || typeof username !== 'string') {
    res.status(400).json({ success: false, error: 'Username is required' })
    return
  }

  let foundUser = null
  for (const [, user] of users) {
    if (user.username === username) {
      foundUser = user
      break
    }
  }

  if (!foundUser) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  const token = generateToken(foundUser.id)
  res.status(200).json({ success: true, token, user: foundUser })
})

router.get('/me', verifyToken, async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, user: req.user })
})

export default router
