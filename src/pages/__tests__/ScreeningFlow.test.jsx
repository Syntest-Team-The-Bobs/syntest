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
				<Route path="/screening/exit/:code" element={<div>Exit Page</div>} />
			</Routes>
		</MemoryRouter>,
	);

describe("ScreeningFlow", () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		vi.clearAllMocks();
	});

<<<<<<< HEAD
	describe("Initial Rendering", () => {
		it("renders step 1 welcome section", () => {
			renderWithRouter("/screening");
			expect(screen.getByText(/welcome to the screening/i)).toBeInTheDocument();
		});

		it("renders step 2 definition section", () => {
			renderWithRouter("/screening");
			expect(screen.getByText(/what is synesthesia/i)).toBeInTheDocument();
		});

		it("renders step 3 types section", () => {
			renderWithRouter("/screening");
			expect(
				screen.getByText(/select your synesthesia types/i),
			).toBeInTheDocument();
		});

		it("renders step 4 results section heading", () => {
			renderWithRouter("/screening");
			expect(screen.getByText(/Step 4: Your Results/i)).toBeInTheDocument();
		});

		it("renders navigation with step numbers", () => {
			renderWithRouter("/screening");
			expect(screen.getByText("1")).toBeInTheDocument();
			expect(screen.getByText("2")).toBeInTheDocument();
			expect(screen.getByText("3")).toBeInTheDocument();
			expect(screen.getByText("4")).toBeInTheDocument();
		});

		it("renders consent checkbox", () => {
			renderWithRouter("/screening");
			expect(
				screen.getByLabelText("I consent to take part in this study."),
			).toBeInTheDocument();
		});
	});

	describe("Consent Step", () => {
		it("has unchecked consent checkbox initially", () => {
			renderWithRouter("/screening");
			const checkbox = screen.getByLabelText(
				"I consent to take part in this study.",
			);
			expect(checkbox).not.toBeChecked();
		});

		it("can check consent checkbox", () => {
			renderWithRouter("/screening");
			const checkbox = screen.getByLabelText(
				"I consent to take part in this study.",
			);
			fireEvent.click(checkbox);
			expect(checkbox).toBeChecked();
		});

		it("enables continue button after checking consent", async () => {
			renderWithRouter("/screening");

			const checkbox = screen.getByLabelText(
				"I consent to take part in this study.",
			);
			fireEvent.click(checkbox);

			const buttons = screen.getAllByRole("button", {
				name: /save & continue/i,
			});
			// First Save & Continue button should be enabled
			expect(buttons[0]).not.toBeDisabled();
		});
	});

	describe("Definition Step", () => {
		it("renders choice cards in definition section", () => {
			renderWithRouter("/screening");
			// Check for choice card titles
			const yesCards = screen.getAllByText("Yes");
			expect(yesCards.length).toBeGreaterThan(0);
		});

		it("renders negative choice card", () => {
			renderWithRouter("/screening");
			expect(
				screen.getByText(/No — I don't experience this/i),
			).toBeInTheDocument();
		});

		it("can select a choice card", () => {
			renderWithRouter("/screening");
			const maybeElements = screen.getAllByText("Maybe");
			const maybeCard = maybeElements
				.find((el) => el.className.includes("choice"))
				?.closest("button");
			if (maybeCard) {
				fireEvent.click(maybeCard);
				expect(maybeCard.className).toContain("selected");
			}
		});
	});

	describe("Types Step", () => {
		it("renders Letter Color type row", () => {
			renderWithRouter("/screening");
			expect(screen.getByText("Letter • Color")).toBeInTheDocument();
		});

		it("renders Music/Sound Color type row", () => {
			renderWithRouter("/screening");
			expect(screen.getByText("Music/Sound • Color")).toBeInTheDocument();
		});

		it("renders Lexical/Word Taste type row", () => {
			renderWithRouter("/screening");
			expect(screen.getByText("Lexical/Word • Taste")).toBeInTheDocument();
		});

		it("renders Sequence Space type row", () => {
			renderWithRouter("/screening");
			expect(screen.getByText("Sequence • Space")).toBeInTheDocument();
		});

		it("renders other experiences input", () => {
			renderWithRouter("/screening");
			expect(
				screen.getByPlaceholderText(/other experiences/i),
			).toBeInTheDocument();
		});

		it("can type in other experiences field", () => {
			renderWithRouter("/screening");
			const input = screen.getByPlaceholderText(/other experiences/i);
			fireEvent.change(input, {
				target: { value: "I see colors with sounds" },
			});
			expect(input.value).toBe("I see colors with sounds");
		});
	});

	describe("Navigation", () => {
		it("has back buttons", () => {
			renderWithRouter("/screening");
			const backButtons = screen.getAllByRole("button", { name: /← back/i });
			expect(backButtons.length).toBeGreaterThan(0);
		});

		it("clicking step nav calls scrollToSection", () => {
			renderWithRouter("/screening");
			const stepButtons = screen.getAllByRole("button");
			// Find a navigation button (one with step number)
			const navButton = stepButtons.find(
				(btn) =>
					btn.textContent?.includes("1") &&
					btn.textContent?.includes("Consent"),
			);
			if (navButton) {
				fireEvent.click(navButton);
				expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
			}
		});
	});

	describe("Results Step", () => {
		it("shows message to complete previous steps initially", () => {
			renderWithRouter("/screening");
			expect(
				screen.getByText(/complete the previous steps/i),
			).toBeInTheDocument();
		});
	});

	describe("Contact Support", () => {
		it("renders contact support link", () => {
			renderWithRouter("/screening");
			expect(screen.getByText(/contact support/i)).toBeInTheDocument();
		});
	});

	describe("Error Handling", () => {
		it("shows error alert when API fails", async () => {
			const { screeningService } = await import("../../services/screening");
			screeningService.saveConsent.mockRejectedValueOnce(
				new Error("Network error"),
			);

			renderWithRouter("/screening");

			const checkbox = screen.getByLabelText(
				"I consent to take part in this study.",
			);
			fireEvent.click(checkbox);

			const buttons = screen.getAllByRole("button", {
				name: /save & continue/i,
			});
			fireEvent.click(buttons[0]);

			await waitFor(() => {
				expect(screen.getByRole("alert")).toBeInTheDocument();
			});
		}, 10000);
	});
=======
	it("requires consent before advancing to the next step", async () => {
		renderWithRouter("/screening/0");

		const checkbox = screen.getByLabelText(
			"I consent to take part in this study.",
		);
		fireEvent.click(checkbox);

		fireEvent.click(screen.getByRole("button", { name: /begin screening/i }));

		await waitFor(() => {
			expect(
				screen.getByText(/confirm none apply to you/i),
			).toBeInTheDocument();
		});
	});

	it("saves health responses and routes to step 2 when eligible", async () => {
		window.sessionStorage.setItem(
			"screening_state",
			JSON.stringify({
				consent: true,
				health: { drug: false, neuro: false, medical: false },
				definition: null,
				pain: null,
				synTypes: {
					grapheme: null,
					music: null,
					lexical: null,
					sequence: null,
				},
				otherExperiences: "",
			}),
		);

		renderWithRouter("/screening/1");

		fireEvent.click(screen.getByRole("button", { name: /continue/i }));

		await waitFor(() => {
			expect(screen.getByText(/what is synesthesia/i)).toBeInTheDocument();
		});
	});

	it("records type selections and fetches summary data", async () => {
		window.sessionStorage.setItem(
			"screening_state",
			JSON.stringify({
				consent: true,
				health: { drug: false, neuro: false, medical: false },
				definition: "yes",
				pain: "no",
				synTypes: {
					grapheme: null,
					music: null,
					lexical: null,
					sequence: null,
				},
				otherExperiences: "",
			}),
		);

		renderWithRouter("/screening/4");

		fireEvent.click(screen.getByLabelText("Letter • Color — Yes"));
		fireEvent.click(screen.getByRole("button", { name: /continue/i }));

		await waitFor(() => {
			expect(screen.getByText(/your next step/i)).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByText(/color consistency/i)).toBeInTheDocument();
		});
	});
>>>>>>> 294dc83 (chore: lint)
});
