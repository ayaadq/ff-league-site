import { Route, Routes } from 'react-router'
import { SoundProvider } from './audio/SoundProvider'
import { PasswordGate } from './auth/PasswordGate'
import { useAuthGate } from './auth/useAuthGate'
import { Layout } from './components/Layout'
import { EffectsTierProvider } from './motion/EffectsTierProvider'
import { ReducedMotionProvider } from './motion/ReducedMotionProvider'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { TeamPage } from './pages/TeamPage'
import { WeeklyRecapsPage } from './pages/WeeklyRecapsPage'

function App() {
  const { unlocked, unlock } = useAuthGate()

  return (
    <EffectsTierProvider>
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
                <Route path="/weekly-recaps" element={<WeeklyRecapsPage />} />
                <Route path="/weekly-recaps/week/:weekNumber" element={<WeeklyRecapsPage />} />
              </Routes>
            </Layout>
          ) : (
            <PasswordGate onUnlock={unlock} />
          )}
        </SoundProvider>
      </ReducedMotionProvider>
    </EffectsTierProvider>
  )
}

export default App
