import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ActivityHeatmap from "../components/dashboard/ActivityHeatmap";
import CompletionTrendsChart from "../components/dashboard/CompletionTrendsChart";
import ConsistencyTrendsChart from "../components/dashboard/ConsistencyTrendsChart";
import DashboardStatCard from "../components/dashboard/DashboardStatCard";
import ParticipantDetailModal from "../components/dashboard/ParticipantDetailModal";
import ParticipantGrowthChart from "../components/dashboard/ParticipantGrowthChart";
import PopularTestsChart from "../components/dashboard/PopularTestsChart";
import RecentTable from "../components/dashboard/RecentTable";
import StimulusBreakdownChart from "../components/dashboard/StimulusBreakdownChart";
import TestCompletionChart from "../components/dashboard/TestCompletionChart";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../services/dashboard";
import "../styles/researcherdashboard.css";

export default function ResearcherDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("30"); // Default 30 days
  const [alerts, setAlerts] = useState([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await dashboardService.getResearcherDashboard(dateRange);
      setDashboardData(data);
    } catch (e) {
      console.error("Failed to load dashboard", e);
      setError(e.response?.data?.error || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const checkAlerts = useCallback((data) => {
    const newAlerts = [];

    // Alert 1: Low active participants
    if (data.summary?.active_participants < 5) {
      newAlerts.push({
        id: "low-active-participants",
        type: "warning",
        message: `Only ${data.summary.active_participants} active participants in the last 7 days`,
        icon: "⚠️",
      });
    }

    // Alert 2: Low completion rate
    if (data.insights?.completion_rate < 50) {
      newAlerts.push({
        id: "low-completion-rate",
        type: "error",
        message: `Test completion rate is ${data.insights.completion_rate}% - below target`,
        icon: "🚨",
      });
    }

    // Alert 3: No recent activity
    if (data.insights?.new_participants_30d === 0) {
      newAlerts.push({
        id: "no-new-participants",
        type: "info",
        message: "No new participants in the last 30 days",
        icon: "ℹ️",
      });
    }

    // Alert 4: High screening conversion (positive alert)
    if (data.insights?.screening_conversion > 80) {
      newAlerts.push({
        id: "high-screening-conversion",
        type: "success",
        message: `Excellent screening conversion rate: ${data.insights.screening_conversion}%`,
        icon: "🎉",
      });
    }

    // Alert 5: No test data
    if (data.summary?.tests_completed === 0) {
      newAlerts.push({
        type: "warning",
        message:
          "No tests completed yet - encourage participants to start testing",
        icon: "📊",
      });
    }

    setAlerts(newAlerts);
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "researcher")) {
      navigate("/login");
      return;
    }

    if (user && user.role === "researcher") {
      loadData();
    }
  }, [user, authLoading, navigate, loadData]);

  // Check for alerts when data changes
  useEffect(() => {
    if (dashboardData) {
      checkAlerts(dashboardData);
    }
  }, [dashboardData, checkAlerts]);

  function handleDateRangeChange(range) {
    setDateRange(range);
  }

  function dismissAlert(index) {
    setAlerts(alerts.filter((_, i) => i !== index));
  }

  function handleParticipantClick(participantId) {
    setSelectedParticipantId(participantId);
  }

  function handleCloseModal() {
    setSelectedParticipantId(null);
  }

  async function handleExport(format, type) {
    try {
      setIsExporting(true);
      const blob = await dashboardService.exportData(format, type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      a.download = `${type}_${timestamp}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner"></div>
        <p className="dashboard-loading-text">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2 className="dashboard-error-title">Error Loading Dashboard</h2>
        <p className="dashboard-error-text">{error}</p>
        <button
          type="button"
          onClick={loadData}
          className="dashboard-error-button"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-loading">
        <p>No data available</p>
      </div>
    );
  }

  const {
    summary,
    recent,
    insights,
    charts,
    user: researcherInfo,
  } = dashboardData;

  return (
    <div className="dashboard-container">
      {/* Header with Date Filter */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Researcher Dashboard</h1>
          {researcherInfo?.institution && (
            <p className="text-sm text-gray-600 mt-1">
              {researcherInfo.institution}
            </p>
          )}
        </div>
        <div className="dashboard-controls">
          <div className="dashboard-welcome">
            <p className="text-lg font-medium">
              Welcome back, {researcherInfo?.name || user?.name}
            </p>
            <p className="text-sm text-gray-500">{researcherInfo?.email}</p>
          </div>
          <div className="dashboard-actions">
            <div className="date-range-filter">
              <label htmlFor="dateRange">Time Range:</label>
              <select
                id="dateRange"
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="date-range-select"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
                <option value="365">Last year</option>
              </select>
            </div>
            <div className="export-buttons">
              <button
                type="button"
                className="btn-export"
                onClick={() => handleExport("csv", "participants")}
                disabled={isExporting}
                title="Export participants as CSV"
              >
                {isExporting ? "Exporting..." : "📥 Export Participants (CSV)"}
              </button>
              <button
                type="button"
                className="btn-export"
                onClick={() => handleExport("csv", "test_results")}
                disabled={isExporting}
                title="Export test results as CSV"
              >
                {isExporting ? "Exporting..." : "📥 Export Tests (CSV)"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alert System */}
      {alerts.length > 0 && (
        <div className="dashboard-alerts">
          {alerts.map((alert) => (
            <div
              key={alert.id || `${alert.type}-${alert.message}`}
              className={`alert alert-${alert.type}`}
            >
              <span className="alert-icon">{alert.icon}</span>
              <span className="alert-message">{alert.message}</span>
              <button
                type="button"
                className="alert-dismiss"
                onClick={() => dismissAlert(index)}
                aria-label="Dismiss alert"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Primary Stats with Progress Bars */}
      <div className="dashboard-stats-grid">
        <DashboardStatCard
          label="Total Participants"
          value={summary?.total_participants || 0}
          progressBar={null}
        />
        <DashboardStatCard
          label="Active (7 days)"
          value={summary?.active_participants || 0}
          progressBar={
            summary?.total_participants
              ? (summary.active_participants / summary.total_participants) * 100
              : 0
          }
          progressLabel={`${Math.round(
            ((summary?.active_participants || 0) /
              (summary?.total_participants || 1)) *
              100
          )}% of total`}
        />
        <DashboardStatCard
          label="Total Stimuli"
          value={summary?.total_stimuli || 0}
          progressBar={null}
        />
        <DashboardStatCard
          label="Tests Completed"
          value={summary?.tests_completed || 0}
          progressBar={insights?.completion_rate || 0}
          progressLabel={`${insights?.completion_rate || 0}% completion rate`}
        />
      </div>

      {/* Secondary Stats with Progress */}
      {insights && (
        <div className="dashboard-stats-grid">
          <DashboardStatCard
            label="Completion Rate"
            value={`${insights.completion_rate}%`}
            progressBar={insights.completion_rate}
            progressColor={
              insights.completion_rate > 70
                ? "green"
                : insights.completion_rate > 40
                ? "orange"
                : "red"
            }
            trendPercentage={insights.completion_trend_percentage}
          />
          <DashboardStatCard
            label="Screening Conversion"
            value={`${insights.screening_conversion}%`}
            progressBar={insights.screening_conversion}
            progressColor={
              insights.screening_conversion > 70
                ? "green"
                : insights.screening_conversion > 40
                ? "orange"
                : "red"
            }
          />
          <DashboardStatCard
            label="New (30 days)"
            value={insights.new_participants_30d}
            progressBar={null}
          />
          <DashboardStatCard
            label="Avg Consistency"
            value={
              insights.avg_consistency_score
                ? insights.avg_consistency_score.toFixed(2)
                : "N/A"
            }
            progressBar={
              insights.avg_consistency_score
                ? insights.avg_consistency_score * 100
                : 0
            }
            progressLabel={
              insights.avg_consistency_score ? "Score out of 1.0" : null
            }
            trendPercentage={insights.consistency_trend_percentage}
          />
        </div>
      )}

      {/* Charts Section */}
      {charts && (
        <>
          {charts.participant_growth && (
            <div className="dashboard-table-container">
              <h3 className="dashboard-table-title">
                Participant Growth (Last {dateRange} Days)
              </h3>
              <ParticipantGrowthChart data={charts.participant_growth} />
            </div>
          )}

          <div className="dashboard-charts-grid">
            {charts.test_completion && (
              <div className="dashboard-table-container">
                <h3 className="dashboard-table-title">Test Status</h3>
                <TestCompletionChart
                  completed={charts.test_completion.completed}
                  inProgress={charts.test_completion.in_progress}
                  notStarted={charts.test_completion.not_started}
                />
              </div>
            )}

            {charts.stimulus_breakdown &&
              charts.stimulus_breakdown.length > 0 && (
                <div className="dashboard-table-container">
                  <h3 className="dashboard-table-title">
                    Stimulus Distribution
                  </h3>
                  <StimulusBreakdownChart
                    breakdown={charts.stimulus_breakdown}
                  />
                </div>
              )}
          </div>

          {charts.popular_tests && charts.popular_tests.length > 0 && (
            <div className="dashboard-table-container">
              <h3 className="dashboard-table-title">Most Popular Tests</h3>
              <PopularTestsChart tests={charts.popular_tests} />
            </div>
          )}

          {/* Trends Section */}
          <div className="dashboard-charts-grid">
            {charts.consistency_trends &&
              charts.consistency_trends.length > 0 && (
                <div className="dashboard-table-container">
                  <h3 className="dashboard-table-title">
                    Consistency Score Trends (Last {dateRange} Days)
                  </h3>
                  <ConsistencyTrendsChart data={charts.consistency_trends} />
                </div>
              )}

            {charts.completion_trends &&
              charts.completion_trends.length > 0 && (
                <div className="dashboard-table-container">
                  <h3 className="dashboard-table-title">
                    Completion Rate Trends (Last {dateRange} Days)
                  </h3>
                  <CompletionTrendsChart data={charts.completion_trends} />
                </div>
              )}
          </div>

          {/* Activity Heatmap */}
          {charts.activity_heatmap && charts.activity_heatmap.length > 0 && (
            <div className="dashboard-table-container">
              <h3 className="dashboard-table-title">
                Test Activity Heatmap (Last 7 Weeks)
              </h3>
              <ActivityHeatmap data={charts.activity_heatmap} />
            </div>
          )}
        </>
      )}

      {/* Recent Activity Tables */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3 className="dashboard-table-title">Recent Participants</h3>
          <input
            type="text"
            placeholder="Search participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <RecentTable
          title=""
          columns={["name", "email", "status", "created_at"]}
          rows={recent?.participants || []}
          clickable={true}
          onRowClick={(row) => {
            if (row.id) {
              handleParticipantClick(row.id);
            }
          }}
        />
      </div>

      <RecentTable
        title="Recent Tests Completed"
        columns={[
          "participant_name",
          "test_name",
          "consistency_score",
          "completed_at",
        ]}
        rows={recent?.tests || []}
      />

      <RecentTable
        title="Recent Stimuli"
        columns={["description", "family", "trigger_type", "created_at"]}
        rows={recent?.stimuli || []}
      />

      {/* Participant Detail Modal */}
      {selectedParticipantId && (
        <ParticipantDetailModal
          participantId={selectedParticipantId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
