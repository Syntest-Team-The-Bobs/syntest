import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ParticipantDashboard from './pages/ParticipantDashboard'
import ResearcherDashboard from './pages/ResearcherDashboard'
import ScreeningFlow from './pages/ScreeningFlow'
import ScreeningExit from './pages/ScreeningExit'
import ColorNumberTest from './pages/trigger_color/ColorNumberTest'
import ColorLetterTest from './pages/trigger_color/ColorLetterTest'
import ColorWordTest from './pages/trigger_color/ColorWordTest'
import SpeedCongruencyInstructions from './pages/trigger_color/SpeedCongruencyInstructions'
import SpeedCongruencyTest from './pages/trigger_color/SpeedCongruencyTest'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import './styles/app.css'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* To wrap page in Layout.jsx (header and footer)  */}
        <Route element={<Layout />}>
          <Route index path="/" element={<LandingPage />} />
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
          <Route path="/screening/:step" element={<ScreeningFlow />} />
          <Route path="/screening/exit/:code" element={<ScreeningExit />} />
          <Route
            path="/tests/color/number"
            element={
              // <ProtectedRoute role="participant">
              <ColorNumberTest />
              // </ProtectedRoute>
            }
          />
          {/* Color tests: TEMPORARY DISABLE LOGIN FOR TESTING */}
          <Route
            path="/tests/color/letter"
            element={
              // <ProtectedRoute role="participant">
              <ColorLetterTest />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/tests/color/word"
            element={
              // <ProtectedRoute role="participant">
              <ColorWordTest />
              // </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="/researcher/dashboard"
          element={
            <ProtectedRoute role="researcher">
              <ResearcherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tests/color/speed-congruency"
          element={
            <ProtectedRoute role="participant">
              <SpeedCongruencyTest />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

export default App


