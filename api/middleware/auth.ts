import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { User } from '../../shared/types.js'

const JWT_SECRET = 'doodle-battle-secret'

export const users = new Map<string, User>()

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' })
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    const user = users.get(decoded.userId)
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' })
      return
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}
