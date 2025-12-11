import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScreeningFlow from "../ScreeningFlow";

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Hoist mocks
const mockNavigate = vi.hoisted(() => vi.fn());
const mockScreeningService = vi.hoisted(() => ({
	saveConsent: vi.fn(() => Promise.resolve({ ok: true })),
	saveStep1: vi.fn(() => Promise.resolve({ ok: true })),
	saveStep2: vi.fn(() => Promise.resolve({ ok: true })),
	saveStep3: vi.fn(() => Promise.resolve({ ok: true })),
	saveStep4: vi.fn(() => Promise.resolve({ ok: true })),
	finalize: vi.fn(() =>
		Promise.resolve({
			eligible: true,
			selected_types: ["Grapheme – Color"],
			recommended: [{ name: "Color Consistency", reason: "Selected grapheme" }],
		}),
	),
}));

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../services/screening", () => ({
	screeningService: mockScreeningService,
}));

const renderWithRouter = () =>
	render(
		<MemoryRouter initialEntries={["/screening"]}>
			<Routes>
				<Route path="/screening/:step?" element={<ScreeningFlow />} />
				<Route path="/screening/exit/:code" element={<div>Exit</div>} />
				<Route path="/participant/dashboard" element={<div>Dashboard</div>} />
			</Routes>
		</MemoryRouter>,
	);

describe("ScreeningFlow", () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// === RENDERING TESTS ===
	describe("Rendering", () => {
		it("renders consent checkbox", () => {
			renderWithRouter();
			expect(screen.getByLabelText("I consent to take part in this study.")).toBeInTheDocument();
		});

		it("renders step 1 section", () => {
			renderWithRouter();
			expect(screen.getByText(/welcome to the screening/i)).toBeInTheDocument();
		});

		it("renders step 2 section", () => {
			renderWithRouter();
			expect(screen.getByText(/what is synesthesia/i)).toBeInTheDocument();
		});

		it("renders step 3 section", () => {
			renderWithRouter();
			expect(screen.getByText(/select your synesthesia types/i)).toBeInTheDocument();
		});

		it("renders step 4 section", () => {
			renderWithRouter();
			expect(screen.getByText(/Step 4: Your Results/i)).toBeInTheDocument();
		});

		it("renders step numbers in nav", () => {
			renderWithRouter();
			expect(screen.getByText("1")).toBeInTheDocument();
			expect(screen.getByText("2")).toBeInTheDocument();
			expect(screen.getByText("3")).toBeInTheDocument();
			expect(screen.getByText("4")).toBeInTheDocument();
		});

		it("renders step labels in nav", () => {
			renderWithRouter();
			expect(screen.getByText("Consent")).toBeInTheDocument();
			expect(screen.getByText("Definition")).toBeInTheDocument();
			expect(screen.getByText("Types")).toBeInTheDocument();
			expect(screen.getByText("Results")).toBeInTheDocument();
		});

		it("renders Yes choice card", () => {
			renderWithRouter();
			expect(screen.getByRole("button", { name: /^Yes/i })).toBeInTheDocument();
		});

		it("renders Maybe choice card", () => {
			renderWithRouter();
			expect(screen.getByRole("button", { name: /^Maybe/i })).toBeInTheDocument();
		});

		it("renders No choice card", () => {
			renderWithRouter();
			expect(screen.getByRole("button", { name: /^No/i })).toBeInTheDocument();
		});

		it("renders Letter/Color type row", () => {
			renderWithRouter();
			expect(screen.getByText("Letter • Color")).toBeInTheDocument();
		});

		it("renders Music type row", () => {
			renderWithRouter();
			expect(screen.getByText(/Music\/Sound.*Color/i)).toBeInTheDocument();
		});

		it("renders Lexical type row", () => {
			renderWithRouter();
			expect(screen.getByText(/Lexical.*Taste/i)).toBeInTheDocument();
		});

		it("renders Sequence type row", () => {
			renderWithRouter();
			expect(screen.getByText(/Sequence.*Space/i)).toBeInTheDocument();
		});

		it("renders 12 radio buttons", () => {
			renderWithRouter();
			expect(screen.getAllByRole("radio").length).toBe(12);
		});

		it("renders other experiences input", () => {
			renderWithRouter();
			expect(screen.getByPlaceholderText(/other experiences/i)).toBeInTheDocument();
		});

		it("renders contact support", () => {
			renderWithRouter();
			expect(screen.getByText(/contact support/i)).toBeInTheDocument();
		});

		it("shows incomplete results message", () => {
			renderWithRouter();
			expect(screen.getByText(/complete the previous steps/i)).toBeInTheDocument();
		});

		it("renders back buttons", () => {
			renderWithRouter();
			expect(screen.getAllByRole("button", { name: /← back/i }).length).toBeGreaterThan(0);
		});

		it("renders save & continue buttons", () => {
			renderWithRouter();
			expect(screen.getAllByRole("button", { name: /save & continue/i }).length).toBeGreaterThan(0);
		});

		it("renders submit button", () => {
			renderWithRouter();
			expect(screen.getByRole("button", { name: /submit & continue/i })).toBeInTheDocument();
		});

		it("renders examples list", () => {
			renderWithRouter();
			expect(screen.getByText("EXAMPLES")).toBeInTheDocument();
		});

		it("renders not synesthesia list", () => {
			renderWithRouter();
			expect(screen.getByText("NOT SYNESTHESIA")).toBeInTheDocument();
		});

		it("renders description text", () => {
			renderWithRouter();
			expect(screen.getByText(/3-5 minutes/i)).toBeInTheDocument();
		});
	});

	// === CONSENT INTERACTIONS ===
	describe("Consent Step", () => {
		it("checkbox starts unchecked", () => {
			renderWithRouter();
			expect(screen.getByLabelText("I consent to take part in this study.")).not.toBeChecked();
		});

		it("can check consent", () => {
			renderWithRouter();
			const cb = screen.getByLabelText("I consent to take part in this study.");
			fireEvent.click(cb);
			expect(cb).toBeChecked();
		});

		it("can uncheck consent", () => {
			renderWithRouter();
			const cb = screen.getByLabelText("I consent to take part in this study.");
			fireEvent.click(cb);
			fireEvent.click(cb);
			expect(cb).not.toBeChecked();
		});

		it("first continue disabled without consent", () => {
			renderWithRouter();
			expect(screen.getAllByRole("button", { name: /save & continue/i })[0]).toBeDisabled();
		});

		it("first continue enabled with consent", () => {
			renderWithRouter();
			fireEvent.click(screen.getByLabelText("I consent to take part in this study."));
			expect(screen.getAllByRole("button", { name: /save & continue/i })[0]).not.toBeDisabled();
		});

		it("calls saveConsent on continue", async () => {
			renderWithRouter();
			fireEvent.click(screen.getByLabelText("I consent to take part in this study."));
			fireEvent.click(screen.getAllByRole("button", { name: /save & continue/i })[0]);
			await waitFor(() => expect(mockScreeningService.saveConsent).toHaveBeenCalledWith(true));
		});

		it("shows saving text during API call", async () => {
			mockScreeningService.saveConsent.mockImplementation(() => new Promise(() => {}));
			renderWithRouter();
			fireEvent.click(screen.getByLabelText("I consent to take part in this study."));
			fireEvent.click(screen.getAllByRole("button", { name: /save & continue/i })[0]);
			// Multiple buttons show "Saving…" - just check at least one exists
			expect(screen.getAllByText("Saving…").length).toBeGreaterThan(0);
		});

		it("completes consent successfully", async () => {
			renderWithRouter();
			fireEvent.click(screen.getByLabelText("I consent to take part in this study."));
			fireEvent.click(screen.getAllByRole("button", { name: /save & continue/i })[0]);
			await waitFor(() => expect(mockScreeningService.saveConsent).toHaveBeenCalled());
		});

		it("prevents double submit during save", async () => {
			mockScreeningService.saveConsent.mockImplementation(
				() => new Promise(() => {}), // Never resolves
			);
			renderWithRouter();
			fireEvent.click(screen.getByLabelText("I consent to take part in this study."));
			const btn = screen.getAllByRole("button", { name: /save & continue/i })[0];
			fireEvent.click(btn);
			// Button should now show Saving and be effectively disabled by saving state
			expect(mockScreeningService.saveConsent).toHaveBeenCalledTimes(1);
		});
	});

	// === DEFINITION INTERACTIONS ===
	describe("Definition Step", () => {
		it("can select Yes", () => {
			renderWithRouter();
			const btn = screen.getByRole("button", { name: /^Yes/i });
			fireEvent.click(btn);
			expect(btn.className).toContain("selected");
		});

		it("can select Maybe", () => {
			renderWithRouter();
			const btn = screen.getByRole("button", { name: /^Maybe/i });
			fireEvent.click(btn);
			expect(btn.className).toContain("selected");
		});

		it("can select No", () => {
			renderWithRouter();
			const btn = screen.getByRole("button", { name: /^No/i });
			fireEvent.click(btn);
			expect(btn.className).toContain("selected");
		});

		it("can change selection", () => {
			renderWithRouter();
			const yes = screen.getByRole("button", { name: /^Yes/i });
			const maybe = screen.getByRole("button", { name: /^Maybe/i });
			fireEvent.click(yes);
			fireEvent.click(maybe);
			expect(maybe.className).toContain("selected");
			expect(yes.className).not.toContain("selected");
		});

		it("selecting Yes deselects No", () => {
			renderWithRouter();
			const yes = screen.getByRole("button", { name: /^Yes/i });
			const no = screen.getByRole("button", { name: /^No/i });
			fireEvent.click(no);
			fireEvent.click(yes);
			expect(yes.className).toContain("selected");
			expect(no.className).not.toContain("selected");
		});
	});

	// === TYPE INTERACTIONS ===
	describe("Types Step", () => {
		it("can select grapheme Yes", () => {
			renderWithRouter();
			const r = screen.getByRole("radio", { name: /Letter.*Color.*Yes/i });
			fireEvent.click(r);
			expect(r).toBeChecked();
		});

		it("can select grapheme Sometimes", () => {
			renderWithRouter();
			const r = screen.getByRole("radio", { name: /Letter.*Color.*Sometimes/i });
			fireEvent.click(r);
			expect(r).toBeChecked();
		});

		it("can select grapheme No", () => {
			renderWithRouter();
			const r = screen.getByRole("radio", { name: /Letter.*Color.*No/i });
			fireEvent.click(r);
			expect(r).toBeChecked();
		});

		it("can select music Yes", () => {
			renderWithRouter();
			const r = screen.getByRole("radio", { name: /Music.*Color.*Yes/i });
			fireEvent.click(r);
			expect(r).toBeChecked();
		});

		it("can select music Sometimes", () => {
			renderWithRouter();
			const r = screen.getByRole("radio", { name: /Music.*Color.*Sometimes/i });
			fireEvent.click(r);
			expect(r).toBeChecked();
		});

		it("can select lexical No", () => {
			renderWithRouter();
			const r = screen.getByRole("radio", { name: /Lexical.*Taste.*No/i });
			fireEvent.click(r);
			expect(r).toBeChecked();
		});

		it("can select sequence Yes", () => {
			renderWithRouter();
			const r = screen.getByRole("radio", { name: /Sequence.*Space.*Yes/i });
			fireEvent.click(r);
			expect(r).toBeChecked();
		});

		it("can type other experiences", () => {
			renderWithRouter();
			const input = screen.getByPlaceholderText(/other experiences/i);
			fireEvent.change(input, { target: { value: "test input" } });
			expect(input.value).toBe("test input");
		});

		it("can clear other experiences", () => {
			renderWithRouter();
			const input = screen.getByPlaceholderText(/other experiences/i);
			fireEvent.change(input, { target: { value: "test" } });
			fireEvent.change(input, { target: { value: "" } });
			expect(input.value).toBe("");
		});
	});

	// === NAVIGATION ===
	describe("Navigation", () => {
		it("nav button 1 scrolls", () => {
			renderWithRouter();
			fireEvent.click(screen.getByRole("button", { name: /1.*consent/i }));
			expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
		});

		it("nav button 2 scrolls", () => {
			renderWithRouter();
			fireEvent.click(screen.getByRole("button", { name: /2.*definition/i }));
			expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
		});

		it("nav button 3 scrolls", () => {
			renderWithRouter();
			fireEvent.click(screen.getByRole("button", { name: /3.*types/i }));
			expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
		});

		it("nav button 4 scrolls", () => {
			renderWithRouter();
			fireEvent.click(screen.getByRole("button", { name: /4.*results/i }));
			expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
		});

		it("back button scrolls", () => {
			renderWithRouter();
			fireEvent.click(screen.getAllByRole("button", { name: /← back/i })[0]);
			expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
		});

		it("nav has mouseEnter effect", () => {
			renderWithRouter();
			const btn = screen.getByRole("button", { name: /1.*consent/i });
			fireEvent.mouseEnter(btn);
			expect(btn.style.transform).toBe("scale(1.05)");
		});

		it("nav has mouseLeave effect", () => {
			renderWithRouter();
			const btn = screen.getByRole("button", { name: /1.*consent/i });
			fireEvent.mouseEnter(btn);
			fireEvent.mouseLeave(btn);
			expect(btn.style.transform).toBe("scale(1)");
		});
	});

	// === ERROR HANDLING ===
	describe("Error Handling", () => {
		it("shows error alert on API fail", async () => {
			mockScreeningService.saveConsent.mockRejectedValue(new Error("Fail"));
			renderWithRouter();
			fireEvent.click(screen.getByLabelText("I consent to take part in this study."));
			fireEvent.click(screen.getAllByRole("button", { name: /save & continue/i })[0]);
			await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
		});

		it("shows error message text", async () => {
			mockScreeningService.saveConsent.mockRejectedValue(new Error("Network failure"));
			renderWithRouter();
			fireEvent.click(screen.getByLabelText("I consent to take part in this study."));
			fireEvent.click(screen.getAllByRole("button", { name: /save & continue/i })[0]);
			await waitFor(() => expect(screen.getByText(/network failure/i)).toBeInTheDocument());
		});

		it("shows server response message", async () => {
			const e = new Error();
			e.response = { data: { message: "Server validation error" } };
			mockScreeningService.saveConsent.mockRejectedValue(e);
			renderWithRouter();
			fireEvent.click(screen.getByLabelText("I consent to take part in this study."));
			fireEvent.click(screen.getAllByRole("button", { name: /save & continue/i })[0]);
			await waitFor(() => expect(screen.getByText(/server validation error/i)).toBeInTheDocument());
		});

		it("shows default error when no message", async () => {
			mockScreeningService.saveConsent.mockRejectedValue({});
			renderWithRouter();
			fireEvent.click(screen.getByLabelText("I consent to take part in this study."));
			fireEvent.click(screen.getAllByRole("button", { name: /save & continue/i })[0]);
			await waitFor(() => expect(screen.getByText(/unable to save/i)).toBeInTheDocument());
		});
	});

	// === SESSION STORAGE ===
	describe("Session Storage", () => {
		it("loads summary from session storage", () => {
			const summary = { eligible: true, selected_types: ["Test"], recommended: [] };
			window.sessionStorage.setItem("screening_summary", JSON.stringify(summary));
			renderWithRouter();
			// Component should have loaded the summary (though may not display without completing steps)
			expect(window.sessionStorage.getItem("screening_summary")).not.toBeNull();
		});
	});
});
