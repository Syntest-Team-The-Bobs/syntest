import React, { useEffect, useState, useCallback } from 'react';

/**
 * TestComplete - Completion screen displayed after test finishes
 *
 * Displays synesthete diagnosis and trigger→color associations.
 * Analysis is automatically triggered during batch submission and returned in response.
 * If not available in props, falls back to fetching via GET /api/analysis/run.
 */
export default function TestComplete({ onNext, isDone = false, analysisResult: initialResult = null }) {
  const [loading, setLoading] = useState(!initialResult);
  const [analysisResult, setAnalysisResult] = useState(initialResult);
  const [error, setError] = useState(null);

  const fetchAnalysis = useCallback(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch('/api/v1/analysis/run', {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!mounted) return;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const j = await res.json().catch((e) => ({ __json_error: String(e) }));
          if (!res.ok) {
            setError(j.error || `Analysis failed (status ${res.status})`);
          } else if (j && j.__json_error) {
            setError(`Invalid JSON from server: ${j.__json_error}`);
          } else if (!j || !j.participant) {
            setError('Analysis did not return participant data. Please try again.');
          } else {
            setAnalysisResult(j);
          }
        } else {
          const txt = await res.text().catch(() => '');
          if (!res.ok) {
            setError(`Analysis failed (status ${res.status}): ${txt}`);
          } else {
            setError(`Unexpected non-JSON response from analysis endpoint: ${txt}`);
          }
        }
      })
      .catch((e) => {
        if (!mounted) return;
        setError(String(e));
      })
      .finally(() => mounted && setLoading(false));

    return () => (mounted = false);
  }, []);

  useEffect(() => {
    // If analysis result already provided (from batch endpoint), don't fetch again
    if (analysisResult) {
      setLoading(false);
      return;
    }

    // Fallback: fetch analysis from endpoint (for manual/re-run cases)
    const cleanup = fetchAnalysis();
    return cleanup;
  }, [analysisResult, fetchAnalysis]);

  // Render diagnosis and associations
  const renderResults = () => {
    if (!analysisResult || !analysisResult.participant) {
      return (
        <p style={{ fontSize: '1.125rem', color: '#4b5563' }}>
          Good job, you completed your test. Please proceed to the next step.
        </p>
      );
    }

    const { participant, per_trigger } = analysisResult;
    const isSynesthete = participant.diagnosis === 'synesthete';

    return (
      <div style={{ color: '#374151' }}>
        {/* Diagnosis */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 8, backgroundColor: isSynesthete ? '#f0fdf4' : '#fefce8' }}>
          <p style={{ fontSize: '1.25rem', margin: 0 }}>
            <strong>{isSynesthete ? '✓ Synesthete' : '○ Non-Synesthete'}</strong>
          </p>
          <p style={{ marginTop: 6, color: '#6b7280', margin: '6px 0 0 0' }}>
            Consistency score: <strong>{participant.participant_score?.toFixed?.(3) ?? '—'}</strong>
          </p>
          <p style={{ marginTop: 6, color: '#6b7280', margin: '6px 0 0 0' }}>
            Mean RT: <strong>{participant.rt_mean ?? '—'} ms</strong>
          </p>
        </div>

        {/* Trigger-Color Associations */}
        {per_trigger && Object.keys(per_trigger).length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
              Your Associations
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {Object.entries(per_trigger).map(([trigger, data]) => {
                const status = data.status || 'incomplete';
                const isValid = status === 'ok';
                
                return (
                  <div
                    key={trigger}
                    style={{
                      background: 'white',
                      padding: 16,
                      borderRadius: 8,
                      border: isValid ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    {/* Trigger Name */}
                    <div style={{ fontWeight: '700', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                      {trigger}
                    </div>

                    {/* Status & Color Swatch */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {isValid ? 'Associated color' : 'Incomplete'}
                        </div>
                        {isValid && (
                          <div style={{ marginTop: 4, fontSize: 12, color: '#4b5563' }}>
                            Consistency: {data.mean_d?.toFixed?.(3) ?? '—'}
                          </div>
                        )}
                      </div>
                      {isValid && data.representative_hex && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 6,
                              background: data.representative_hex,
                              border: '2px solid #e5e7eb'
                            }}
                          />
                          <div style={{ fontSize: 12, fontWeight: '500', color: '#374151' }}>
                            {data.representative_hex}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '4rem 2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: '700',
          marginBottom: '1rem',
          color: isDone ? '#16a34a' : '#111827'
        }}>
          Test Complete!
        </h1>

        {loading ? (
          <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>Analyzing your responses…</p>
        ) : error ? (
          <div>
            <p style={{ fontSize: '1.125rem', color: '#b91c1c' }}>Could not run analysis: {error}</p>
            <p style={{ fontSize: '1rem', color: '#4b5563', marginTop: '1rem' }}>You can proceed to the next step.</p>
          </div>
        ) : (
          renderResults()
        )}

        <div style={{ marginTop: '2.5rem', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onNext}
            style={{
              background: '#2563eb',
              color: 'white',
              padding: '0.875rem 2.5rem',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: 4
            }}
          >
            Proceed to Speed Congruency Test
          </button>

          {!loading && (
            <button
              onClick={fetchAnalysis}
              style={{
                background: '#374151',
                color: 'white',
                padding: '0.875rem 1.75rem',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderRadius: 4
              }}
            >
              Retry Analysis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}