import { useCallback, useEffect, useState } from "react";
import { dashboardService } from "../../services/dashboard";
import "../../styles/researcherdashboard.css";

export default function ParticipantDetailModal({ participantId, onClose }) {
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadParticipantDetails = useCallback(async () => {
    try {
      const data = await dashboardService.getParticipantDetails(participantId);
      // Transform backend response to match component expectations
      setParticipant({
        ...data.participant,
        test_results: data.test_results || [],
        screening: data.screening_sessions?.[0] || null,
        statistics: data.statistics || {},
      });
    } catch (error) {
      console.error("Failed to load participant details:", error);
    } finally {
      setLoading(false);
    }
  }, [participantId]);

  useEffect(() => {
    loadParticipantDetails();
  }, [loadParticipantDetails]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (loading) {
    return (
      <div
        className="modal-overlay"
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
          role="document"
        >
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!participant) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="participant-detail-title"
      tabIndex={-1}
    >
      <div
        className="modal-content participant-detail-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
          }
        }}
        role="document"
      >
        <div className="modal-header">
          <h2 id="participant-detail-title">Participant Details</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Basic Info */}
          <section className="detail-section">
            <h3>Basic Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Name</span>
                <span>{participant.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email</span>
                <span>{participant.email}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Participant ID</span>
                <span>{participant.participant_id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className={`status-badge status-${participant.status}`}>
                  {participant.status}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Age</span>
                <span>{participant.age || "N/A"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Country</span>
                <span>{participant.country || "N/A"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Joined</span>
                <span>
                  {new Date(participant.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Login</span>
                <span>
                  {participant.last_login
                    ? new Date(participant.last_login).toLocaleDateString()
                    : "Never"}
                </span>
              </div>
            </div>
          </section>

          {/* Screening Info */}
          {participant.screening && (
            <section className="detail-section">
              <h3>Screening Results</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span>{participant.screening.status || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Eligible</span>
                  <span>
                    {participant.screening.eligible ? "✅ Yes" : "❌ No"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Exit Code</span>
                  <span>{participant.screening.exit_code || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Synesthesia Types</span>
                  <span>
                    {participant.screening.selected_types
                      ? Array.isArray(participant.screening.selected_types)
                        ? participant.screening.selected_types.join(", ")
                        : participant.screening.selected_types
                      : "None"}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Statistics */}
          {participant.statistics && (
            <section className="detail-section">
              <h3>Statistics</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Total Tests</span>
                  <span>{participant.statistics.total_tests || 0}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Completed Tests</span>
                  <span>{participant.statistics.completed_tests || 0}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">
                    Average Consistency Score
                  </span>
                  <span>
                    {participant.statistics.avg_consistency_score
                      ? participant.statistics.avg_consistency_score.toFixed(3)
                      : "N/A"}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Test Results */}
          <section className="detail-section">
            <h3>
              Test Results ({participant.test_results?.length || 0} tests)
            </h3>
            {participant.test_results && participant.test_results.length > 0 ? (
              <div className="test-results-list">
                {participant.test_results.map((test) => (
                  <div
                    key={`${test.test_id}-${
                      test.completed_at || test.started_at
                    }`}
                    className="test-result-card"
                  >
                    <div className="test-result-header">
                      <h4>{test.test_name}</h4>
                      <span className={`status-badge status-${test.status}`}>
                        {test.status}
                      </span>
                    </div>
                    <div className="test-result-details">
                      {test.consistency_score && (
                        <div className="detail-item">
                          <span className="detail-label">
                            Consistency Score
                          </span>
                          <span>{test.consistency_score.toFixed(2)}</span>
                        </div>
                      )}
                      {test.completed_at && (
                        <div className="detail-item">
                          <span className="detail-label">Completed</span>
                          <span>
                            {new Date(test.completed_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {test.started_at && (
                        <div className="detail-item">
                          <span className="detail-label">Started</span>
                          <span>
                            {new Date(test.started_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No test results available</p>
            )}
          </section>

          {/* Activity Timeline */}
          {participant.activity && participant.activity.length > 0 && (
            <section className="detail-section">
              <h3>Recent Activity</h3>
              <div className="activity-timeline">
                {participant.activity.map((event) => (
                  <div
                    key={`${event.timestamp}-${event.description}`}
                    className="timeline-item"
                  >
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <span className="timeline-date">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                      <span className="timeline-event">
                        {event.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => exportParticipantData(participant)}
          >
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}

function exportParticipantData(participant) {
  const dataStr = JSON.stringify(participant, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `participant-${
    participant.participant_id
  }-${new Date().toISOString()}.json`;
  a.click();
  window.URL.revokeObjectURL(url);
}
