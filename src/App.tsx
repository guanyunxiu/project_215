import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import LoginPage from '@/pages/LoginPage'
import LobbyPage from '@/pages/LobbyPage'
import RoomPage from '@/pages/RoomPage'
import GamePage from '@/pages/GamePage'
import VotePage from '@/pages/VotePage'
import ResultPage from '@/pages/ResultPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/lobby" replace /> : <LoginPage />} />
      <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
      <Route path="/room/:roomId" element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
      <Route path="/game/:roomId" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
      <Route path="/vote/:roomId" element={<ProtectedRoute><VotePage /></ProtectedRoute>} />
      <Route path="/result/:roomId" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/lobby' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  const { restore } = useAuthStore()

  useEffect(() => {
    restore()
  }, [restore])

  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}
