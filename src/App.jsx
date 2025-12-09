import { Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ParticipantDashboard from "./pages/ParticipantDashboard";
import ResearcherDashboard from "./pages/ResearcherDashboard";
import ScreeningExit from "./pages/ScreeningExit";
import ScreeningFlow from "./pages/ScreeningFlow";
import SignupPage from "./pages/SignupPage";
import ColorLetterTest from "./pages/trigger_color/ColorLetterTest";
import ColorMusicTest from "./pages/trigger_color/ColorMusicTest";
import ColorNumberTest from "./pages/trigger_color/ColorNumberTest";
import ColorWordTest from "./pages/trigger_color/ColorWordTest";
import SpeedCongruencyTest from "./pages/trigger_color/SpeedCongruencyTest";
import "./styles/app.css";

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
              <ProtectedRoute requiredRole="participant">
                <ParticipantDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/screening/:step?" element={<ScreeningFlow />} />
          <Route path="/screening/exit/:code" element={<ScreeningExit />} />
          <Route
            path="/tests/color/number"
            element={
              // <ProtectedRoute requiredRole="participant">
              <ColorNumberTest />
              // </ProtectedRoute>
            }
          />
          {/* Color tests: TEMPORARY DISABLE LOGIN FOR TESTING */}
          <Route
            path="/tests/color/letter"
            element={
              // <ProtectedRoute requiredRole="participant">
              <ColorLetterTest />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/tests/color/word"
            element={
              // <ProtectedRoute requiredRole="participant">
              <ColorWordTest />
              // </ProtectedRoute>
            }
          />

          {/* Music/Sound to Color test */}
          <Route path="/tests/color/music" element={<ColorMusicTest />} />
        </Route>

        <Route
          path="/researcher/dashboard"
          element={
            <ProtectedRoute requiredRole="researcher">
              <ResearcherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tests/color/speed-congruency"
          element={
            <ProtectedRoute requiredRole="participant">
              <SpeedCongruencyTest />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
