import { useEffect, useState } from 'react'
import { dashboardService } from '../services/dashboard'
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

  if (loading) {
    return <div className="container">Loading...</div>
  }

  if (!data) {
    return <div className="container">Error loading dashboard</div>
  }

  return (
    <div className="dashboard-grid">
      <aside className="dashboard-sidebar">
        <div className="avatar">{data.user.name.charAt(0).toUpperCase()}</div>
        <h2>{data.user.name}</h2>
        <p className="text-muted">{data.user.email}</p>
      </aside>

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

