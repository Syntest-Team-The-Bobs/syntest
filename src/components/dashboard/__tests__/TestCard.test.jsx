import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import TestCard from "../TestCard";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const renderWithRouter = (component) => {
	return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe("TestCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const defaultTest = {
		id: "test-1",
		name: "Color Letter Test",
		description: "Test your color-letter associations",
		path: "/tests/color/letter",
		isLocked: false,
		isCompleted: false,
	};

	describe("Rendering", () => {
		it("renders test name", () => {
			renderWithRouter(<TestCard test={defaultTest} />);
			expect(screen.getByText("Color Letter Test")).toBeInTheDocument();
		});

		it("renders test description", () => {
			renderWithRouter(<TestCard test={defaultTest} />);
			expect(
				screen.getByText("Test your color-letter associations"),
			).toBeInTheDocument();
		});

		it("renders Available status for unlocked incomplete test", () => {
			renderWithRouter(<TestCard test={defaultTest} />);
			expect(screen.getByText("Available")).toBeInTheDocument();
		});

		it("renders Locked status for locked test", () => {
			renderWithRouter(<TestCard test={{ ...defaultTest, isLocked: true }} />);
			expect(screen.getByText("Locked")).toBeInTheDocument();
		});

		it("renders Completed status for completed test", () => {
			renderWithRouter(
				<TestCard test={{ ...defaultTest, isCompleted: true }} />,
			);
			expect(screen.getByText("Completed")).toBeInTheDocument();
		});
	});

	describe("Navigation", () => {
		it("navigates to test path on click when not locked", () => {
			renderWithRouter(<TestCard test={defaultTest} />);
			const card = screen.getByRole("button");
			fireEvent.click(card);
			expect(mockNavigate).toHaveBeenCalledWith("/tests/color/letter");
		});

		it("does not navigate when test is locked", () => {
			renderWithRouter(<TestCard test={{ ...defaultTest, isLocked: true }} />);
			const card = screen.getByRole("button");
			fireEvent.click(card);
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("does not navigate when path is #", () => {
			renderWithRouter(<TestCard test={{ ...defaultTest, path: "#" }} />);
			const card = screen.getByRole("button");
			fireEvent.click(card);
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("does not navigate when path is empty", () => {
			renderWithRouter(<TestCard test={{ ...defaultTest, path: "" }} />);
			const card = screen.getByRole("button");
			fireEvent.click(card);
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("navigates on Enter key press", () => {
			renderWithRouter(<TestCard test={defaultTest} />);
			const card = screen.getByRole("button");
			fireEvent.keyUp(card, { key: "Enter" });
			expect(mockNavigate).toHaveBeenCalledWith("/tests/color/letter");
		});

		it("navigates on Space key press", () => {
			renderWithRouter(<TestCard test={defaultTest} />);
			const card = screen.getByRole("button");
			fireEvent.keyUp(card, { key: " " });
			expect(mockNavigate).toHaveBeenCalledWith("/tests/color/letter");
		});
	});

	describe("Styling", () => {
		it("has pointer cursor when clickable", () => {
			renderWithRouter(<TestCard test={defaultTest} />);
			const card = screen.getByRole("button");
			expect(card.style.cursor).toBe("pointer");
		});

		it("has not-allowed cursor when locked", () => {
			renderWithRouter(<TestCard test={{ ...defaultTest, isLocked: true }} />);
			const card = screen.getByRole("button");
			expect(card.style.cursor).toBe("not-allowed");
		});

		it("applies locked class when test is locked", () => {
			renderWithRouter(<TestCard test={{ ...defaultTest, isLocked: true }} />);
			const card = screen.getByRole("button");
			expect(card.className).toContain("locked");
		});

		it("applies completed class when test is completed", () => {
			renderWithRouter(
				<TestCard test={{ ...defaultTest, isCompleted: true }} />,
			);
			const card = screen.getByRole("button");
			expect(card.className).toContain("completed");
		});
	});

	describe("Accessibility", () => {
		it("has proper aria-label", () => {
			renderWithRouter(<TestCard test={defaultTest} />);
			const card = screen.getByRole("button");
			expect(card).toHaveAttribute(
				"aria-label",
				"Color Letter Test - Available",
			);
		});

		it("has aria-label indicating locked state", () => {
			renderWithRouter(<TestCard test={{ ...defaultTest, isLocked: true }} />);
			const card = screen.getByRole("button");
			expect(card).toHaveAttribute("aria-label", "Color Letter Test - Locked");
		});

		it("has aria-label indicating completed state", () => {
			renderWithRouter(
				<TestCard test={{ ...defaultTest, isCompleted: true }} />,
			);
			const card = screen.getByRole("button");
			expect(card).toHaveAttribute(
				"aria-label",
				"Color Letter Test - Completed",
			);
		});

		it("is disabled when test is locked", () => {
			renderWithRouter(<TestCard test={{ ...defaultTest, isLocked: true }} />);
			const card = screen.getByRole("button");
			expect(card).toBeDisabled();
		});
	});
});
