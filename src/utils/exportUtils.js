export function exportToCSV(data, filename) {
	if (!data || data.length === 0) {
		alert("No data to export");
		return;
	}

	const headers = Object.keys(data[0]);
	const csvContent = [
		headers.join(","),
		...data.map((row) =>
			headers
				.map((header) => {
					const value = row[header];
					// Escape commas and quotes
					if (
						typeof value === "string" &&
						(value.includes(",") || value.includes('"'))
					) {
						return `"${value.replace(/"/g, '""')}"`;
					}
					return value;
				})
				.join(","),
		),
	].join("\n");

	downloadFile(
		csvContent,
		`${filename}-${new Date().toISOString()}.csv`,
		"text/csv",
	);
}

export function exportToJSON(data, filename) {
	const jsonStr = JSON.stringify(data, null, 2);
	downloadFile(
		jsonStr,
		`${filename}-${new Date().toISOString()}.json`,
		"application/json",
	);
}

export function exportToExcel(data, filename) {
	// Simple tab-separated format that Excel can open
	if (!data || data.length === 0) {
		alert("No data to export");
		return;
	}

	const headers = Object.keys(data[0]);
	const tsvContent = [
		headers.join("\t"),
		...data.map((row) => headers.map((header) => row[header]).join("\t")),
	].join("\n");

	downloadFile(
		tsvContent,
		`${filename}-${new Date().toISOString()}.xls`,
		"application/vnd.ms-excel",
	);
}

export function exportDashboardReport(dashboardData) {
	const report = {
		generated_at: new Date().toISOString(),
		summary: dashboardData.summary,
		insights: dashboardData.insights,
		participants: dashboardData.recent.participants,
		tests: dashboardData.recent.tests,
		stimuli: dashboardData.recent.stimuli,
	};

	const jsonStr = JSON.stringify(report, null, 2);
	downloadFile(
		jsonStr,
		`dashboard-report-${new Date().toISOString()}.json`,
		"application/json",
	);
}

function downloadFile(content, filename, mimeType) {
	const blob = new Blob([content], { type: mimeType });
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	window.URL.revokeObjectURL(url);
}
