import { useEffect, useState } from 'react'
import { dashboardService } from '../services/dashboard'
import '../styles/dashboard.css'

export default function ResearcherDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await dashboardService.getResearcherDashboard()
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
    <div className="container">
      <div className="dashboard-header">
        <h1>Researcher Dashboard</h1>
        <div className="user-info">
          <div className="user-avatar">{data.user.name.charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{data.user.name}</div>
            {data.user.institution && (
              <div className="text-muted">{data.user.institution}</div>
            )}
          </div>
        </div>
      </div>

      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-number">{data.total_participants}</div>
          <div className="stat-label">Total Participants</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.completed_tests}</div>
          <div className="stat-label">Completed Tests</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Research Overview</h3>
        </div>
        <div className="card-body">
          <p>Welcome to the researcher dashboard. Here you can view aggregated participant data and analyze test results.</p>
        </div>
      </div>
    </div>
  )
}

