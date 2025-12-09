import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <>
      <div className="text-center" style={{ padding: '80px 20px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Synesthesia Research Platform</h1>
        <p className="lead" style={{ maxWidth: '800px', margin: '0 auto 40px' }}>
          A comprehensive web-based platform for testing and researching synesthesia among participants in Spain.
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <Link to="/signup" className="btn btn-primary btn-lg">
            Join as Participant
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            Researcher Login
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '40px' }}>
        <div className="card-header">
          <h2 className="card-title">About This Study</h2>
        </div>
        <div className="card-body">
          <p>
            This platform is designed to identify and study synesthesia through a series of carefully designed
            assessments. Participants will complete screening questionnaires and specialized tests to determine if
            they experience synesthetic patterns.
          </p>
          <p style={{ marginTop: '20px' }}>
            All data collected is anonymized and used solely for research purposes, in compliance with ethical
            research standards.
          </p>
        </div>
      </div>

      <h2 className="text-center mb-4">Platform Features</h2>
      <div className="grid grid-3" style={{ marginBottom: '60px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pre-Screening</h3>
          </div>
          <div className="card-body">
            <p>
              Complete an initial questionnaire to determine eligibility and receive personalized test recommendations
              based on your experiences.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Specialized Tests</h3>
          </div>
          <div className="card-body">
            <p>
              Take scientifically designed tests for Trigger-Color, Trigger-Gustatory, and Sequence-Space synesthesia
              types.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Personal Dashboard</h3>
          </div>
          <div className="card-body">
            <p>
              Track your progress, view test results, and access your personalized synesthesia profile through your
              secure dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="alert alert-info">
        <strong>Privacy & Data Protection:</strong> Your participation is completely voluntary. All personal information
        is kept confidential and data is anonymized for research analysis. You can withdraw from the study at any time.
      </div>
    </>
  )
}


