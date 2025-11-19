import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import DashboardStatCard from "../components/dashboard/DashboardStatCard";
import RecentTable from "../components/dashboard/RecentTable";
import ParticipantGrowthChart from "../components/dashboard/ParticipantGrowthChart";
import TestCompletionChart from "../components/dashboard/TestCompletionChart";
import PopularTestsChart from "../components/dashboard/PopularTestsChart";
import StimulusBreakdownChart from "../components/dashboard/StimulusBreakdownChart";
import { dashboardService } from "../services/dashboard";
import "../styles/researcherdashboard.css";

export default function ResearcherDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "researcher")) {
      navigate("/login");
      return;
    }

    if (user && user.role === "researcher") {
      loadData();
    }
  }, [user, authLoading, navigate]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const data = await dashboardService.getResearcherDashboard();
      setDashboardData(data);
    } catch (e) {
      console.error("Failed to load dashboard", e);
      setError(e.response?.data?.error || "Failed to load dashboard data");
    } finally {
      setLoading(false);
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
        <button onClick={loadData} className="dashboard-error-button">
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
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Researcher Dashboard</h1>
          {researcherInfo?.institution && (
            <p className="text-sm text-gray-600 mt-1">
              {researcherInfo.institution}
            </p>
          )}
        </div>
        <div className="dashboard-welcome">
          <p className="text-lg font-medium">
            Welcome back, {researcherInfo?.name || user?.name}
          </p>
          <p className="text-sm text-gray-500">{researcherInfo?.email}</p>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="dashboard-stats-grid">
        <DashboardStatCard
          label="Total Participants"
          value={summary?.total_participants || 0}
        />
        <DashboardStatCard
          label="Active (7 days)"
          value={summary?.active_participants || 0}
        />
        <DashboardStatCard
          label="Total Stimuli"
          value={summary?.total_stimuli || 0}
        />
        <DashboardStatCard
          label="Tests Completed"
          value={summary?.tests_completed || 0}
        />
      </div>

      {/* Secondary Stats */}
      {insights && (
        <div className="dashboard-stats-grid">
          <DashboardStatCard
            label="Completion Rate"
            value={`${insights.completion_rate}%`}
          />
          <DashboardStatCard
            label="Screening Conversion"
            value={`${insights.screening_conversion}%`}
          />
          <DashboardStatCard
            label="New (30 days)"
            value={insights.new_participants_30d}
          />
          <DashboardStatCard
            label="Avg Consistency"
            value={
              insights.avg_consistency_score
                ? insights.avg_consistency_score.toFixed(2)
                : "N/A"
            }
          />
        </div>
      )}

      {/* Charts Section */}
      {charts && (
        <>
          {/* Participant Growth Chart */}
          {charts.participant_growth && (
            <div className="dashboard-table-container">
              <h3 className="dashboard-table-title">
                Participant Growth (Last 30 Days)
              </h3>
              <ParticipantGrowthChart data={charts.participant_growth} />
            </div>
          )}

          {/* Charts Grid */}
          <div className="dashboard-charts-grid">
            {/* Test Completion Breakdown */}
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

            {/* Stimulus Family Breakdown */}
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

          {/* Popular Tests Chart */}
          {charts.popular_tests && charts.popular_tests.length > 0 && (
            <div className="dashboard-table-container">
              <h3 className="dashboard-table-title">Most Popular Tests</h3>
              <PopularTestsChart tests={charts.popular_tests} />
            </div>
          )}
        </>
      )}

      {/* Recent Activity Tables */}
      <RecentTable
        title="Recent Participants"
        columns={["name", "email", "status", "last_login"]}
        rows={recent?.participants || []}
      />

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
    </div>
  );
}
