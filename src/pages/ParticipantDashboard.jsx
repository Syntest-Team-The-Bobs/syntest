import { useEffect, useState } from "react";
import TestCard from "../components/dashboard/TestCard";
import Sidebar from "../components/layout/Sidebar";
import { dashboardService } from "../services/dashboard";
import "../styles/dashboard.css";

/**
 * ParticipantDashboard Component
 * Main dashboard view for participants showing:
 * - Stats overview (tests completed, pending, completion %)
 * - Screening test (only visible if not completed)
 * - Recommended tests (only visible after screening is completed)
 */

// Map backend test names to frontend routes
const mapTestNameToRoute = (testName) => {
	const nameMap = {
		"Letter to Color": "/tests/color/letter",
		"Number to Color": "/tests/color/number",
		"Word Color Test": "/tests/color/word",
		"Sound Color Test": "/tests/color/music",
		"Speed Congruency": "/tests/color/speed-congruency",
		// Fallback mappings for variations
		"Letter-Color": "/tests/color/letter",
		"Number-Color": "/tests/color/number",
		"Word-Color": "/tests/color/word",
		"Sound-Color": "/tests/color/music",
	};

	// Try exact match first
	if (nameMap[testName]) {
		return nameMap[testName];
	}

	// Try case-insensitive partial match
	const lowerName = testName.toLowerCase();
	for (const [key, route] of Object.entries(nameMap)) {
		if (lowerName.includes(key.toLowerCase().split(" ")[0])) {
			return route;
		}
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

	// Sidebar navigation links
	const sidebarLinks = [{ path: "/settings", label: "Settings" }];

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
			const route = mapTestNameToRoute(test.name || test.suggested_name);
			return {
				id: test.test_id ? `test-${test.test_id}` : `recommended-${index}`,
				name: test.name || test.suggested_name,
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
			{/* Sidebar navigation */}
			<Sidebar links={sidebarLinks} />

			{/* Main content area */}
			<main style={{ padding: "var(--spacing-3xl)" }}>
				{/* Dashboard header */}
				<div className="dashboard-header">
					<h1>Dashboard</h1>
				</div>

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
