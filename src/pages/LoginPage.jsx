import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('participant')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password, role)
      navigate(role === 'participant' ? '/participant/dashboard' : '/researcher/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      console.error('Error response:', err.response)
      console.error('Error status:', err.response?.status)
      console.error('Error data:', err.response?.data)
      
      let errorMessage = 'Invalid email or password'
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.response?.status === 403) {
        errorMessage = 'Access forbidden. Please check CORS settings.'
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.'
      } else if (err.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container container-sm container-centered">
      <h1 className="text-center mb-4">Login</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="role-selector">
          <div
            className={`role-card ${role === 'participant' ? 'active' : ''}`}
            onClick={() => setRole('participant')}
          >
            <h3>Participant</h3>
            <p>Take synesthesia tests</p>
          </div>
          <div
            className={`role-card ${role === 'researcher' ? 'active' : ''}`}
            onClick={() => setRole('researcher')}
          >
            <h3>Researcher</h3>
            <p>Access research data</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input type="hidden" name="role" value={role} />

          <div className="form-field">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="text-center" style={{ marginTop: '20px' }}>
          <p className="text-muted">
            Don't have an account? <Link to="/signup">Sign up here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

