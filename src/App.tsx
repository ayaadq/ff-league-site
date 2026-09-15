import { Route, Routes } from 'react-router'
import { PasswordGate } from './auth/PasswordGate'
import { useAuthGate } from './auth/useAuthGate'
import { Layout } from './components/Layout'
import { ReducedMotionProvider } from './motion/ReducedMotionProvider'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { TeamPage } from './pages/TeamPage'

function App() {
  const { unlocked, unlock } = useAuthGate()

  return (
    <ReducedMotionProvider>
      {unlocked ? (
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/team/:ownerId" element={<TeamPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </Layout>
      ) : (
        <PasswordGate onUnlock={unlock} />
      )}
    </ReducedMotionProvider>
  )
}

export default App
