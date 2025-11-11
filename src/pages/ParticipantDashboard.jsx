import { useEffect, useState } from 'react'
import { dashboardService } from '../services/dashboard'
import Sidebar from '../components/layout/Sidebar';
import '../styles/dashboard.css'

export default function ParticipantDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await dashboardService.getParticipantDashboard()
        setData(dashboardData)
      } catch (error) {
        console.error('Error fetching dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const sidebarLinks = [
    { path: '/screening/0', label: 'Pre-Screening Test' },
    { path: '/tests/color/letter', label: 'Letter Color Test' },
    { path: '/tests/color/number', label: 'Number Color Test' },
    { path: '/tests/color/word', label: 'Word Color Test' },
    { path: '/tests/color/sound', label: 'Sound Color Test' },
    { path: '/tests/color/speed-congruency', label: 'Speed Congruency' },
    // { path: '/tests/flavor', label: 'Flavor Test' },
    // { path: '/tests/association', label: 'Association' },
    // { path: '/analytics', label: 'Analytics' },
    { path: '/settings', label: 'Settings' },
  ];

  if (loading) {
    return <div className="container">Loading...</div>
  }

  if (!data) {
    return <div className="container">Error loading dashboard</div>
  }

  return (
    <div className="dashboard-grid">
      <Sidebar links={sidebarLinks} />

      <main style={{ padding: 'var(--spacing-3xl)' }}>
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>

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

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recommended Tests</h3>
          </div>
          <div className="card-body">
            {data.recommended_tests && data.recommended_tests.length > 0 ? (
              <ul className="list-unstyled">
                {data.recommended_tests.map((test) => (
                  <li key={test.id} style={{ marginBottom: 'var(--spacing-md)' }}>
                    <strong>{test.name}</strong>
                    {test.description && <p className="text-muted">{test.description}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No recommended tests at this time.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

