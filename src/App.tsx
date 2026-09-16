import { Route, Routes } from 'react-router'
import { SoundProvider } from './audio/SoundProvider'
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
      {/* Inside ReducedMotionProvider so the sound controls can read the
          same preference, and outside the gate so the toggle state
          survives unlocking. Nothing is loaded or played until asked. */}
      <SoundProvider>
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
      </SoundProvider>
    </ReducedMotionProvider>
  )
}

export default App
