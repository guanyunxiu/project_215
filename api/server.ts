import http from 'http'
import fs from 'fs'
import path from 'path'
import { Server as SocketIOServer } from 'socket.io'
import app from './app.js'
import { registerSocketHandlers } from './socket/socketHandler.js'

const DEFAULT_PORT = parseInt(process.env.PORT || '3001', 10)
const MAX_PORT_ATTEMPTS = 20
const PORT_FILE = path.resolve(process.cwd(), '.server-port')

function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    let currentPort = startPort

    function tryPort() {
      if (currentPort > startPort + MAX_PORT_ATTEMPTS) {
        reject(new Error(`No available port found between ${startPort} and ${startPort + MAX_PORT_ATTEMPTS}`))
        return
      }

      const testServer = http.createServer()
      testServer.listen(currentPort, () => {
        testServer.close(() => resolve(currentPort))
      })
      testServer.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`)
          currentPort++
          tryPort()
        } else {
          reject(err)
        }
      })
    }

    tryPort()
  })
}

async function startServer() {
  const port = await findAvailablePort(DEFAULT_PORT)

  fs.writeFileSync(PORT_FILE, String(port), 'utf-8')

  const httpServer = http.createServer(app)

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        `http://localhost:5174`,
        `http://localhost:5175`,
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  registerSocketHandlers(io)

  httpServer.listen(port, () => {
    console.log(`Server ready on port ${port}`)
    console.log(`Port written to ${PORT_FILE}`)
  })

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received')
    io.close()
    httpServer.close(() => {
      try { fs.unlinkSync(PORT_FILE) } catch {}
      console.log('Server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('SIGINT signal received')
    io.close()
    httpServer.close(() => {
      try { fs.unlinkSync(PORT_FILE) } catch {}
      console.log('Server closed')
      process.exit(0)
    })
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

export default app
