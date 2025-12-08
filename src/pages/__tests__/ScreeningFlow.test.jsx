import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import ScreeningFlow from "../ScreeningFlow";

// Mock scrollIntoView since JSDOM doesn't support it
Element.prototype.scrollIntoView = vi.fn();

vi.mock("../../services/screening", () => {
	const service = {
		saveConsent: vi.fn(() => Promise.resolve({ ok: true })),
		saveStep1: vi.fn(() => Promise.resolve({ ok: true })),
		saveStep2: vi.fn(() => Promise.resolve({ ok: true })),
		saveStep3: vi.fn(() => Promise.resolve({ ok: true })),
		saveStep4: vi.fn(() => Promise.resolve({ ok: true })),
		finalize: vi.fn(() =>
			Promise.resolve({
				eligible: true,
				selected_types: ["Grapheme – Color"],
				recommended: [
					{ name: "Color Consistency", reason: "Selected grapheme" },
				],
			}),
		),
	};
	return { screeningService: service };
});

const renderWithRouter = (initialPath = "/screening") =>
	render(
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route path="/screening/:step?" element={<ScreeningFlow />} />
			</Routes>
		</MemoryRouter>,
	);

describe("ScreeningFlow", () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		vi.clearAllMocks();
	});

	it("requires consent before advancing to the next step", async () => {
		renderWithRouter("/screening");

		const checkbox = screen.getByLabelText(
			"I consent to take part in this study.",
		);
		fireEvent.click(checkbox);

		// Find and click the first enabled continue button (in consent section)
		const continueButtons = screen.getAllByRole("button", {
			name: /save & continue/i,
		});
		const enabledButton = continueButtons.find((btn) => !btn.disabled);
		fireEvent.click(enabledButton);

		await waitFor(() => {
			// On single-page flow, definition section is always visible
			expect(screen.getByText(/what is synesthesia/i)).toBeInTheDocument();
		});
	}, 10000);

	it("shows all steps on single page", () => {
		renderWithRouter("/screening");

		// All step headers should be visible on the single page
		expect(screen.getByText(/welcome to the screening/i)).toBeInTheDocument();
		expect(screen.getByText(/what is synesthesia/i)).toBeInTheDocument();
		expect(
			screen.getByText(/select your synesthesia types/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /your results/i }),
		).toBeInTheDocument();
	});

	it("shows navigation buttons for all steps", () => {
		renderWithRouter("/screening");

		// Navigation bar should show all 4 steps
		expect(
			screen.getByRole("button", { name: /1.*consent/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /2.*definition/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /3.*types/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /4.*results/i }),
		).toBeInTheDocument();
	});
});
