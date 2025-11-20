import { useEffect, useState } from 'react'
import { dashboardService } from '../services/dashboard'
import Sidebar from '../components/layout/Sidebar'
import TestCard from '../components/dashboard/TestCard'
import '../styles/dashboard.css'

/**
 * ParticipantDashboard Component
 * Main dashboard view for participants showing:
 * - Stats overview (tests completed, pending, completion %)
 * - Screening test (always visible)
 * - Warning banner if screening incomplete
 * - Recommended tests (locked until screening complete)
 */

export default function ParticipantDashboard() {
  // State management
  const [data, setData] = useState(null) // Dashboard data from API
  const [loading, setLoading] = useState(true) // Loading state
  const [screeningCompleted, setScreeningCompleted] = useState(false) // Screening completion status

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await dashboardService.getParticipantDashboard()
        setData(dashboardData)
        // Check if screening is completed from backend data
        setScreeningCompleted(dashboardData.screening_completed || false)
      } catch (error) {
        console.error('Error fetching dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Sidebar navigation links
  const sidebarLinks = [
    { path: '/settings', label: 'Settings' }
  ]

  // Screening test object (always shown at top)
  const screeningTest = {
    id: 'screening',
    name: 'Screening Test',
    description: 'Complete this test first to unlock other tests',
    path: '/screening/0',
    isLocked: false, // Screening is never locked
    isCompleted: screeningCompleted,
  }

  // Recommended tests array (locked until screening complete)
  const recommendedTests = [
    {
      id: 'letter-color',
      name: 'Letter to Color',
      description: 'Associate letters with colors',
      path: '/tests/color/letter',
      isLocked: !screeningCompleted, // Locked if screening not done
      isCompleted: false,
    },
    {
      id: 'number-color',
      name: 'Number to Color',
      description: 'Associate numbers with colors',
      path: '/tests/color/number',
      isLocked: !screeningCompleted,
      isCompleted: false,
    },
    {
      id: 'word-color',
      name: 'Word Color Test',
      description: 'Associate words with colors',
      path: '/tests/color/word',
      isLocked: !screeningCompleted,
      isCompleted: false,
    },
    {
      id: 'sound-color',
      name: 'Sound Color Test',
      description: 'Associate sounds with colors',
      path: '/tests/color/sound',
      isLocked: !screeningCompleted,
      isCompleted: false,
    },
    {
      id: 'speed-congruency',
      name: 'Speed Congruency',
      description: 'Test your response speed',
      path: '/tests/color/speed-congruency',
      isLocked: !screeningCompleted,
      isCompleted: false,
    },
  ]

  // Loading state - show while fetching data
  if (loading) {
    return <div className="container">Loading...</div>
  }

  // Error state - show if data fetch failed
  if (!data) {
    return <div className="container">Error loading dashboard</div>
  }

  return (
    <div className="dashboard-grid">
      {/* Sidebar navigation */}
      <Sidebar links={sidebarLinks} />

      {/* Main content area */}
      <main style={{ padding: 'var(--spacing-3xl)' }}>
        {/* Dashboard header */}
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>

        {/* Stats cards - shows completion metrics */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-number">{data.tests_completed}</div>
            <div className="stat-label">Tests Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{data.tests_pending}</div>
            <div className="stat-label">Tests Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{data.completion_percentage}%</div>
            <div className="stat-label">Completion</div>
          </div>
        </div>

        {/* Screening Test Section - always visible */}
        <div className="section">
          <h2 className="section-title">Screening Test</h2>
          <div className="tests-grid">
            <TestCard test={screeningTest} />
          </div>
        </div>

        {/* Screening Notice - only show if screening not completed */}
        {!screeningCompleted && (
          <div className="screening-notice">
            <h3>Complete the Screening Test First</h3>
            <p>You need to complete the screening test to unlock all other tests.</p>
          </div>
        )}

        {/* Recommended Tests Section - shows all available tests */}
        <div className="section">
          <h2 className="section-title">Recommended Tests</h2>
          <div className="tests-grid">
            {recommendedTests.map((test) => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}