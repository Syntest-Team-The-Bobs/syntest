import { fireEvent, render, screen } from "@testing-library/react";
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

	it("renders consent checkbox and continue button", () => {
		renderWithRouter("/screening");

		expect(
			screen.getByLabelText("I consent to take part in this study."),
		).toBeInTheDocument();

		const continueButtons = screen.getAllByRole("button", {
			name: /save & continue/i,
		});
		expect(continueButtons.length).toBeGreaterThan(0);
	}, 10000);

	it("shows all steps on single page", () => {
		renderWithRouter("/screening");

		// All step headers should be visible on the single page
		expect(screen.getByText(/welcome to the screening/i)).toBeInTheDocument();
		expect(screen.getByText(/what is synesthesia/i)).toBeInTheDocument();
		expect(
			screen.getByText(/select your synesthesia types/i),
		).toBeInTheDocument();
		expect(screen.getByText(/Step 4: Your Results/i)).toBeInTheDocument();
	});

	it("shows navigation with step numbers", () => {
		renderWithRouter("/screening");

		// Check step numbers are visible
		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
		expect(screen.getByText("4")).toBeInTheDocument();
	});

	it("can check consent checkbox", () => {
		renderWithRouter("/screening");

		const checkbox = screen.getByLabelText(
			"I consent to take part in this study.",
		);
		expect(checkbox).not.toBeChecked();

		fireEvent.click(checkbox);
		expect(checkbox).toBeChecked();
	});

	it("enables continue button after consent", () => {
		renderWithRouter("/screening");

		const checkbox = screen.getByLabelText(
			"I consent to take part in this study.",
		);
		fireEvent.click(checkbox);

		const continueButtons = screen.getAllByRole("button", {
			name: /save & continue/i,
		});
		expect(continueButtons[0]).not.toBeDisabled();
	});
});
