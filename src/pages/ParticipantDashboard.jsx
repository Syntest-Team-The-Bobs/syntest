import { useEffect, useState } from "react";
import TestCard from "../components/dashboard/TestCard";
import { dashboardService } from "../services/dashboard";
import "../styles/dashboard.css";

/**
 * ParticipantDashboard Component
 * Main dashboard view for participants showing:
 * - Stats overview (tests completed, pending, completion %)
 * - Screening test (only visible if not completed)
 * - Recommended tests (only visible after screening is completed)
 */

// Map backend test names to user-friendly display names
const mapTestDisplayName = (testName) => {
	if (!testName) return testName;

	const lowerName = testName.toLowerCase();

	// Check for grapheme/letter tests - display as "Letter Color"
	if (lowerName.includes("grapheme") || lowerName.includes("letter")) {
		return "Letter Color";
	}
	// Check for music/sound tests - display as "Music Color"
	if (lowerName.includes("music") || lowerName.includes("sound")) {
		return "Music Color";
	}
	// Check for number/digit tests - display as "Number Color"
	if (lowerName.includes("number") || lowerName.includes("digit")) {
		return "Number Color";
	}
	// Check for word/lexical tests - display as "Word Color"
	if (lowerName.includes("word") || lowerName.includes("lexical")) {
		return "Word Color";
	}
	// Check for speed congruency
	if (lowerName.includes("speed") || lowerName.includes("congruency")) {
		return "Speed Congruency";
	}

	// Return original name if no match
	return testName;
};

// Map backend test names to frontend routes
const mapTestNameToRoute = (testName) => {
	if (!testName) return null;

	const lowerName = testName.toLowerCase();

	// Check for music/sound tests
	if (lowerName.includes("music") || lowerName.includes("sound")) {
		return "/tests/color/music";
	}
	// Check for letter/grapheme tests
	if (lowerName.includes("letter") || lowerName.includes("grapheme")) {
		return "/tests/color/letter";
	}
	// Check for number/digit tests
	if (lowerName.includes("number") || lowerName.includes("digit")) {
		return "/tests/color/number";
	}
	// Check for word/lexical tests
	if (lowerName.includes("word") || lowerName.includes("lexical")) {
		return "/tests/color/word";
	}
	// Check for speed congruency
	if (lowerName.includes("speed") || lowerName.includes("congruency")) {
		return "/tests/color/speed-congruency";
	}

	// Default fallback
	return null;
};

export default function ParticipantDashboard() {
	// State management
	const [data, setData] = useState(null); // Dashboard data from API
	const [loading, setLoading] = useState(true); // Loading state
	const [screeningCompleted, setScreeningCompleted] = useState(false); // Screening completion status

	// Fetch dashboard data on component mount
	useEffect(() => {
		const fetchData = async () => {
			try {
				const dashboardData = await dashboardService.getParticipantDashboard();
				setData(dashboardData);
				// Check if screening is completed from backend data
				setScreeningCompleted(dashboardData.screening_completed || false);
			} catch (error) {
				console.error("Error fetching dashboard:", error);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	// Screening test object (only shown if not completed)
	const screeningTest = {
		id: "screening",
		name: "Screening Test",
		description: "Complete this test first to unlock other tests",
		path: "/screening/0",
		isLocked: false, // Screening is never locked
		isCompleted: screeningCompleted,
	};

	// Convert backend recommended tests to frontend format
	const recommendedTests = (data?.recommended_tests || []).map(
		(test, index) => {
			const backendName = test.name || test.suggested_name;
			const route = mapTestNameToRoute(backendName);
			const displayName = mapTestDisplayName(backendName);
			return {
				id: test.test_id ? `test-${test.test_id}` : `recommended-${index}`,
				name: displayName,
				description: test.description || test.reason || "Complete this test",
				path: route || "#",
				isLocked: false, // Tests are only shown if screening is completed, so they're unlocked
				isCompleted: false, // TODO: Check test completion status from backend if needed
			};
		},
	);

	// Loading state - show while fetching data
	if (loading) {
		return <div className="container">Loading...</div>;
	}

	// Error state - show if data fetch failed
	if (!data) {
		return <div className="container">Error loading dashboard</div>;
	}

	return (
		<div className="dashboard-grid">
			{/* Main content area */}
			<main style={{ width: "70%", margin: "auto" }}>
				{/* Dashboard header */}
				<div className="section">
					<h2 className="section-title">Dashboard</h2>

					{/* Stats cards - shows completion metrics */}
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
				</div>

				{/* Screening Test Section - only show if screening not completed */}
				{!screeningCompleted && (
					<>
						<div className="section">
							<h2 className="section-title">Screening Test</h2>
							<div className="tests-grid">
								<TestCard test={screeningTest} />
							</div>
						</div>

						{/* Screening Notice */}
						<div className="screening-notice">
							<h3>Complete the Screening Test First</h3>
							<p>
								You need to complete the screening test to unlock all other
								tests.
							</p>
						</div>
					</>
				)}

				{/* Recommended Tests Section - only show if screening is completed */}
				{screeningCompleted && recommendedTests.length > 0 && (
					<div className="section">
						<h2 className="section-title">Recommended Tests</h2>
						<div className="tests-grid">
							{recommendedTests.map((test) => (
								<TestCard key={test.id} test={test} />
							))}
						</div>
					</div>
				)}

				{/* Show message if screening completed but no tests recommended */}
				{screeningCompleted && recommendedTests.length === 0 && (
					<div className="section">
						<p>No tests have been recommended for you at this time.</p>
					</div>
				)}
			</main>
		</div>
	);
}
