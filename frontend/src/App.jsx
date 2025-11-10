import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ParticipantDashboard from './pages/ParticipantDashboard'
import ResearcherDashboard from './pages/ResearcherDashboard'
import ScreeningFlow from './pages/ScreeningFlow'
import ScreeningExit from './pages/ScreeningExit'
import ColorNumberTest from './pages/ColorNumberTest'
import ColorLetterTest from './pages/ColorLetterTest'
import ColorWordTest from './pages/ColorWordTest'
import SpeedCongruencyInstructions from './pages/SpeedCongruencyInstructions'
import SpeedCongruencyTest from './pages/SpeedCongruencyTest'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import './styles/app.css'

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          <Route
            path="/participant/dashboard"
            element={
              <ProtectedRoute role="participant">
                <ParticipantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/researcher/dashboard"
            element={
              <ProtectedRoute role="researcher">
                <ResearcherDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route path="/screening/:step" element={<ScreeningFlow />} />
          <Route path="/screening/exit/:code" element={<ScreeningExit />} />
          
          <Route
            path="/color/number"
            element={
              <ProtectedRoute role="participant">
                <ColorNumberTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/color/letter"
            element={
              <ProtectedRoute role="participant">
                <ColorLetterTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/color/word"
            element={
              <ProtectedRoute role="participant">
                <ColorWordTest />
              </ProtectedRoute>
            }
          />
          
          <Route path="/speed-congruency/instructions" element={<SpeedCongruencyInstructions />} />
          <Route
            path="/speed-congruency"
            element={
              <ProtectedRoute role="participant">
                <SpeedCongruencyTest />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}

export default App


