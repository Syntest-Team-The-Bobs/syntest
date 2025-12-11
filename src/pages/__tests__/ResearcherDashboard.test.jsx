import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { dashboardService } from "../../services/dashboard";
import ResearcherDashboard from "../ResearcherDashboard";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock dashboardService
vi.mock("../../services/dashboard", () => ({
  dashboardService: {
    getResearcherDashboard: vi.fn(),
    exportData: vi.fn(),
  },
}));

// Mock Chart components (optional - can test integration or mock)
vi.mock("../../components/dashboard/ParticipantGrowthChart", () => ({
  default: ({ data }) => (
    <div data-testid="participant-growth-chart">{JSON.stringify(data)}</div>
  ),
}));

vi.mock("../../components/dashboard/TestCompletionChart", () => ({
  default: ({ completed, inProgress, notStarted }) => (
    <div data-testid="test-completion-chart">
      {completed}-{inProgress}-{notStarted}
    </div>
  ),
}));

vi.mock("../../components/dashboard/StimulusBreakdownChart", () => ({
  default: ({ breakdown }) => (
    <div data-testid="stimulus-breakdown-chart">
      {JSON.stringify(breakdown)}
    </div>
  ),
}));

vi.mock("../../components/dashboard/PopularTestsChart", () => ({
  default: ({ tests }) => (
    <div data-testid="popular-tests-chart">{JSON.stringify(tests)}</div>
  ),
}));

vi.mock("../../components/dashboard/ConsistencyTrendsChart", () => ({
  default: ({ data }) => (
    <div data-testid="consistency-trends-chart">{JSON.stringify(data)}</div>
  ),
}));

vi.mock("../../components/dashboard/CompletionTrendsChart", () => ({
  default: ({ data }) => (
    <div data-testid="completion-trends-chart">{JSON.stringify(data)}</div>
  ),
}));

vi.mock("../../components/dashboard/ActivityHeatmap", () => ({
  default: ({ data }) => (
    <div data-testid="activity-heatmap">{JSON.stringify(data)}</div>
  ),
}));

vi.mock("../../components/dashboard/ParticipantDetailModal", () => ({
  default: ({ participantId, onClose }) => (
    <div data-testid="participant-detail-modal">
      <button onClick={onClose}>Close Modal</button>
      <span>Participant ID: {participantId}</span>
    </div>
  ),
}));

// Mock window.URL for export tests
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
const mockRevokeObjectURL = vi.fn();
global.window.URL.createObjectURL = mockCreateObjectURL;
global.window.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock document.createElement for export download
const mockClick = vi.fn();
const originalCreateElement = document.createElement.bind(document);
global.document.createElement = vi.fn((tagName) => {
  if (tagName === "a") {
    const element = originalCreateElement("a");
    element.click = mockClick;
    return element;
  }
  return originalCreateElement(tagName);
});

const renderWithRouter = (initialPath = "/researcher/dashboard") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/researcher/dashboard" element={<ResearcherDashboard />} />
      </Routes>
    </MemoryRouter>
  );

const mockDashboardData = {
  summary: {
    total_participants: 50,
    active_participants: 25,
    total_stimuli: 100,
    tests_completed: 150,
  },
  insights: {
    completion_rate: 75,
    screening_conversion: 80,
    new_participants_30d: 10,
    avg_consistency_score: 0.85,
    completion_trend_percentage: 5.2,
    consistency_trend_percentage: 2.1,
  },
  charts: {
    participant_growth: [{ date: "2024-01-01", count: 5 }],
    test_completion: {
      completed: 100,
      in_progress: 30,
      not_started: 20,
    },
    stimulus_breakdown: [
      { type: "letter", count: 30 },
      { type: "number", count: 20 },
    ],
    popular_tests: [
      { name: "Test 1", count: 50 },
      { name: "Test 2", count: 30 },
    ],
    consistency_trends: [
      { date: "2024-01-01", avg_consistency: 0.85, test_count: 10 },
    ],
    completion_trends: [
      { date: "2024-01-01", completion_rate: 75, completed: 15, total: 20 },
    ],
    activity_heatmap: [1, 2, 3, 4, 5],
  },
  recent: {
    participants: [
      {
        id: 1,
        name: "John Doe",
        email: "john@test.com",
        status: "active",
        created_at: "2024-01-01",
      },
      {
        id: 2,
        name: "Jane Smith",
        email: "jane@test.com",
        status: "active",
        created_at: "2024-01-02",
      },
    ],
    tests: [
      {
        participant_name: "John Doe",
        test_name: "Test 1",
        consistency_score: 0.9,
        completed_at: "2024-01-01",
      },
    ],
    stimuli: [
      {
        description: "Stimulus 1",
        family: "color",
        trigger_type: "letter",
        created_at: "2024-01-01",
      },
    ],
  },
  user: {
    name: "Researcher Name",
    email: "researcher@test.com",
    institution: "Test University",
  },
};

describe("ResearcherDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        name: "Researcher",
        email: "researcher@test.com",
        role: "researcher",
      },
      loading: false,
    });
    vi.mocked(dashboardService.getResearcherDashboard).mockResolvedValue(
      mockDashboardData
    );
    vi.mocked(dashboardService.exportData).mockResolvedValue(
      new Blob(["test"], { type: "text/csv" })
    );
  });

  describe("Authentication & Access Control", () => {
    it("redirects to login if not authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      renderWithRouter();
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });

    it("redirects to login if user role is not researcher", () => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, role: "participant" },
        loading: false,
      });

      renderWithRouter();
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });

    it("renders dashboard when authenticated as researcher", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Researcher Dashboard")).toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("shows loading spinner when authLoading is true", () => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, role: "researcher" },
        loading: true,
      });

      renderWithRouter();
      expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
    });

    it("shows loading spinner when loading is true", () => {
      vi.mocked(dashboardService.getResearcherDashboard).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter();
      expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("displays error message when API fails", async () => {
      vi.mocked(dashboardService.getResearcherDashboard).mockRejectedValue({
        response: { data: { error: "API Error" } },
      });

      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Error Loading Dashboard")).toBeInTheDocument();
        expect(screen.getByText("API Error")).toBeInTheDocument();
      });
    });

    it("shows Try Again button on error", async () => {
      vi.mocked(dashboardService.getResearcherDashboard).mockRejectedValue({
        response: { data: { error: "API Error" } },
      });

      renderWithRouter();
      await waitFor(() => {
        const tryAgainButton = screen.getByRole("button", {
          name: /try again/i,
        });
        expect(tryAgainButton).toBeInTheDocument();
      });
    });

    it("calls loadData when Try Again button is clicked", async () => {
      vi.mocked(dashboardService.getResearcherDashboard).mockRejectedValue({
        response: { data: { error: "API Error" } },
      });

      renderWithRouter();
      await waitFor(() => {
        const tryAgainButton = screen.getByRole("button", {
          name: /try again/i,
        });
        fireEvent.click(tryAgainButton);
      });

      await waitFor(() => {
        expect(
          vi.mocked(dashboardService.getResearcherDashboard)
        ).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Data Rendering", () => {
    it("renders dashboard title", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Researcher Dashboard")).toBeInTheDocument();
      });
    });

    it("renders researcher name and email", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(
          screen.getByText(/Welcome back, Researcher Name/i)
        ).toBeInTheDocument();
        expect(screen.getByText("researcher@test.com")).toBeInTheDocument();
      });
    });

    it("renders institution if available", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Test University")).toBeInTheDocument();
      });
    });

    it("renders all stat cards with correct values", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Total Participants")).toBeInTheDocument();
        expect(screen.getByText("50")).toBeInTheDocument();
        expect(screen.getByText("Active (7 days)")).toBeInTheDocument();
        expect(screen.getByText("25")).toBeInTheDocument();
      });
    });

    it("renders recent participants table", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Recent Participants")).toBeInTheDocument();
        const johnDoeElements = screen.getAllByText("John Doe");
        expect(johnDoeElements.length).toBeGreaterThan(0);
      });
    });

    it("renders recent tests table", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Recent Tests Completed")).toBeInTheDocument();
      });
    });

    it("renders recent stimuli table", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Recent Stimuli")).toBeInTheDocument();
      });
    });
  });

  describe("Date Range Filter", () => {
    it("renders date range select dropdown", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByLabelText(/time range/i)).toBeInTheDocument();
      });
    });

    it("has default value of 30", async () => {
      renderWithRouter();
      await waitFor(() => {
        const select = screen.getByLabelText(/time range/i);
        expect(select).toHaveValue("30");
      });
    });

    it("has all date range options", async () => {
      renderWithRouter();
      await waitFor(() => {
        const select = screen.getByLabelText(/time range/i);
        expect(
          screen.getByRole("option", { name: "Last 7 days" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Last 30 days" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Last 90 days" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Last 6 months" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Last year" })
        ).toBeInTheDocument();
      });
    });

    it("triggers data reload when date range changes", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Researcher Dashboard")).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/time range/i);
      fireEvent.change(select, { target: { value: "7" } });

      await waitFor(() => {
        expect(
          vi.mocked(dashboardService.getResearcherDashboard)
        ).toHaveBeenCalledWith("7");
      });
    });
  });

  describe("Export Functionality", () => {
    it("renders both export buttons", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /export participants/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /export tests/i })
        ).toBeInTheDocument();
      });
    });

    it("calls handleExport with correct format and type for participants", async () => {
      renderWithRouter();
      await waitFor(() => {
        const exportButton = screen.getByRole("button", {
          name: /export participants/i,
        });
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(vi.mocked(dashboardService.exportData)).toHaveBeenCalledWith(
          "csv",
          "participants"
        );
      });
    });

    it("calls handleExport with correct format and type for test results", async () => {
      renderWithRouter();
      await waitFor(() => {
        const exportButton = screen.getByRole("button", {
          name: /export tests/i,
        });
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(vi.mocked(dashboardService.exportData)).toHaveBeenCalledWith(
          "csv",
          "test_results"
        );
      });
    });

    it("shows Exporting... when isExporting is true", async () => {
      // Make export take time so we can see the loading state
      let resolveExport;
      const exportPromise = new Promise((resolve) => {
        resolveExport = resolve;
      });
      vi.mocked(dashboardService.exportData).mockReturnValue(exportPromise);

      renderWithRouter();
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /export participants/i })
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /export participants/i,
      });
      fireEvent.click(exportButton);

      // Check that button shows "Exporting..." while promise is pending
      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const exportingButton = buttons.find((btn) =>
          btn.textContent?.includes("Exporting")
        );
        expect(exportingButton).toBeInTheDocument();
      });

      // Resolve the promise to clean up
      resolveExport(new Blob(["test"], { type: "text/csv" }));
    });
  });

  describe("Alert System", () => {
    it("renders low active participants alert when < 5", async () => {
      const lowActiveData = {
        ...mockDashboardData,
        summary: { ...mockDashboardData.summary, active_participants: 3 },
      };
      vi.mocked(dashboardService.getResearcherDashboard).mockResolvedValue(
        lowActiveData
      );

      renderWithRouter();
      await waitFor(() => {
        expect(
          screen.getByText(/only 3 active participants/i)
        ).toBeInTheDocument();
      });
    });

    it("renders low completion rate alert when < 50%", async () => {
      const lowCompletionData = {
        ...mockDashboardData,
        insights: { ...mockDashboardData.insights, completion_rate: 30 },
      };
      vi.mocked(dashboardService.getResearcherDashboard).mockResolvedValue(
        lowCompletionData
      );

      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText(/completion rate is 30%/i)).toBeInTheDocument();
      });
    });

    it("renders no new participants alert when 0 in 30 days", async () => {
      const noNewData = {
        ...mockDashboardData,
        insights: { ...mockDashboardData.insights, new_participants_30d: 0 },
      };
      vi.mocked(dashboardService.getResearcherDashboard).mockResolvedValue(
        noNewData
      );

      renderWithRouter();
      await waitFor(() => {
        expect(
          screen.getByText(/no new participants in the last 30 days/i)
        ).toBeInTheDocument();
      });
    });

    it("renders high screening conversion alert when > 80%", async () => {
      const highConversionData = {
        ...mockDashboardData,
        insights: { ...mockDashboardData.insights, screening_conversion: 85 },
      };
      vi.mocked(dashboardService.getResearcherDashboard).mockResolvedValue(
        highConversionData
      );

      renderWithRouter();
      await waitFor(() => {
        expect(
          screen.getByText(/excellent screening conversion rate: 85%/i)
        ).toBeInTheDocument();
      });
    });

    it("dismisses alert when dismiss button is clicked", async () => {
      const lowActiveData = {
        ...mockDashboardData,
        summary: { ...mockDashboardData.summary, active_participants: 3 },
      };
      vi.mocked(dashboardService.getResearcherDashboard).mockResolvedValue(
        lowActiveData
      );

      renderWithRouter();
      await waitFor(() => {
        const dismissButton = screen.getByRole("button", {
          name: /dismiss alert/i,
        });
        fireEvent.click(dismissButton);
      });

      await waitFor(() => {
        expect(
          screen.queryByText(/only 3 active participants/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Participant Search", () => {
    it("renders search input", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search participants...")
        ).toBeInTheDocument();
      });
    });

    it("updates search query on input change", async () => {
      renderWithRouter();
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(
          "Search participants..."
        );
        fireEvent.change(searchInput, { target: { value: "John" } });
        expect(searchInput).toHaveValue("John");
      });
    });
  });

  describe("Participant Detail Modal", () => {
    it("opens modal when participant row is clicked", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Recent Participants")).toBeInTheDocument();
      });

      // Find the first participant row in the Recent Participants table
      const participantRows = screen.getAllByText("John Doe");
      const firstParticipantRow = participantRows[0].closest("tr");
      if (firstParticipantRow) {
        fireEvent.click(firstParticipantRow);
      }

      await waitFor(() => {
        expect(
          screen.getByTestId("participant-detail-modal")
        ).toBeInTheDocument();
      });
    });

    it("closes modal when close button is clicked", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Recent Participants")).toBeInTheDocument();
      });

      // Find the first participant row in the Recent Participants table
      const participantRows = screen.getAllByText("John Doe");
      const firstParticipantRow = participantRows[0].closest("tr");
      if (firstParticipantRow) {
        fireEvent.click(firstParticipantRow);
      }

      await waitFor(() => {
        const closeButton = screen.getByText("Close Modal");
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(
          screen.queryByTestId("participant-detail-modal")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Chart Rendering", () => {
    it("renders ParticipantGrowthChart when data is available", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(
          screen.getByTestId("participant-growth-chart")
        ).toBeInTheDocument();
      });
    });

    it("renders TestCompletionChart when data is available", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByTestId("test-completion-chart")).toBeInTheDocument();
      });
    });

    it("renders StimulusBreakdownChart when data is available", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(
          screen.getByTestId("stimulus-breakdown-chart")
        ).toBeInTheDocument();
      });
    });

    it("renders PopularTestsChart when data is available", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByTestId("popular-tests-chart")).toBeInTheDocument();
      });
    });

    it("renders ConsistencyTrendsChart when data is available", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(
          screen.getByTestId("consistency-trends-chart")
        ).toBeInTheDocument();
      });
    });

    it("renders CompletionTrendsChart when data is available", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(
          screen.getByTestId("completion-trends-chart")
        ).toBeInTheDocument();
      });
    });

    it("renders ActivityHeatmap when data is available", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByTestId("activity-heatmap")).toBeInTheDocument();
      });
    });
  });

  describe("Empty States", () => {
    it("shows No data available when dashboardData is null", async () => {
      vi.mocked(dashboardService.getResearcherDashboard).mockResolvedValue(
        null
      );

      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("No data available")).toBeInTheDocument();
      });
    });
  });

  describe("Stat Cards", () => {
    it("renders all primary stat cards", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Total Participants")).toBeInTheDocument();
        expect(screen.getByText("Active (7 days)")).toBeInTheDocument();
        expect(screen.getByText("Total Stimuli")).toBeInTheDocument();
        expect(screen.getByText("Tests Completed")).toBeInTheDocument();
      });
    });

    it("renders all secondary stat cards", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("Completion Rate")).toBeInTheDocument();
        expect(screen.getByText("Screening Conversion")).toBeInTheDocument();
        expect(screen.getByText("New (30 days)")).toBeInTheDocument();
        expect(screen.getByText("Avg Consistency")).toBeInTheDocument();
      });
    });

    it("displays correct stat values", async () => {
      renderWithRouter();
      await waitFor(() => {
        expect(screen.getByText("50")).toBeInTheDocument(); // Total participants
        expect(screen.getByText("25")).toBeInTheDocument(); // Active participants
        expect(screen.getByText("100")).toBeInTheDocument(); // Total stimuli
        expect(screen.getByText("150")).toBeInTheDocument(); // Tests completed
      });
    });
  });
});
