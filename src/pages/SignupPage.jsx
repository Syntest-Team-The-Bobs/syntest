import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/auth'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'participant',
    age: '',
    country: 'Spain',
    institution: '',
    accessCode: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await authService.signup(formData)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container container-sm container-centered">
      <h1 className="text-center mb-4">Sign Up</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="role-selector">
          <div
            className={`role-card ${formData.role === 'participant' ? 'active' : ''}`}
            onClick={() => setFormData({ ...formData, role: 'participant' })}
          >
            <h3>Participant</h3>
            <p>Take synesthesia tests</p>
          </div>
          <div
            className={`role-card ${formData.role === 'researcher' ? 'active' : ''}`}
            onClick={() => setFormData({ ...formData, role: 'researcher' })}
          >
            <h3>Researcher</h3>
            <p>Access research data</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {formData.role === 'participant' && (
            <>
              <div className="form-field">
                <label htmlFor="age">Age</label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="country">Country</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {formData.role === 'researcher' && (
            <>
              <div className="form-field">
                <label htmlFor="institution">Institution</label>
                <input
                  type="text"
                  id="institution"
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="accessCode">Access Code</label>
                <input
                  type="text"
                  id="accessCode"
                  name="accessCode"
                  value={formData.accessCode}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center" style={{ marginTop: '20px' }}>
          <p className="text-muted">
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}


