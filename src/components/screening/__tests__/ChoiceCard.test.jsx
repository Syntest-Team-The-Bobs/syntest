import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChoiceCard from "../ChoiceCard";

describe("ChoiceCard", () => {
	describe("Rendering", () => {
		it("renders title and subtitle", () => {
			render(<ChoiceCard title="Test Title" subtitle="Test Subtitle" />);
			expect(screen.getByText("Test Title")).toBeInTheDocument();
			expect(screen.getByText("Test Subtitle")).toBeInTheDocument();
		});

		it("renders as a button element", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" />);
			expect(screen.getByRole("button")).toBeInTheDocument();
		});

		it("applies selected class when selected", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" selected={true} />);
			const button = screen.getByRole("button");
			expect(button.className).toContain("selected");
		});

		it("does not apply selected class when not selected", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" selected={false} />);
			const button = screen.getByRole("button");
			expect(button.className).not.toContain("selected");
		});
	});

	describe("Variants", () => {
		it("applies choice-card class for default variant", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" variant="default" />);
			const button = screen.getByRole("button");
			expect(button.className).toContain("choice-card");
		});

		it("applies choice-negative class for negative variant", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" variant="negative" />);
			const button = screen.getByRole("button");
			expect(button.className).toContain("choice-negative");
		});

		it("uses choice-negative-title class for negative variant title", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" variant="negative" />);
			const title = screen.getByText("Test");
			expect(title.className).toContain("choice-negative-title");
		});

		it("uses choice-negative-subtitle class for negative variant subtitle", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" variant="negative" />);
			const subtitle = screen.getByText("Sub");
			expect(subtitle.className).toContain("choice-negative-subtitle");
		});
	});

	describe("Compact Mode", () => {
		it("applies compact padding when compact is true", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" compact={true} />);
			const button = screen.getByRole("button");
			expect(button.style.padding).toBe("0.75rem 1rem");
		});

		it("applies normal padding when compact is false", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" compact={false} />);
			const button = screen.getByRole("button");
			expect(button.style.padding).toBe("1.5rem");
		});

		it("applies compact font size to title when compact", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" compact={true} />);
			const title = screen.getByText("Test");
			expect(title.style.fontSize).toBe("1.125rem");
		});

		it("applies normal font size to title when not compact", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" compact={false} />);
			const title = screen.getByText("Test");
			expect(title.style.fontSize).toBe("1.5rem");
		});
	});

	describe("Disabled State", () => {
		it("applies disabled opacity when disabled", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" disabled={true} />);
			const button = screen.getByRole("button");
			expect(button.style.opacity).toBe("0.6");
		});

		it("applies normal opacity when not disabled", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" disabled={false} />);
			const button = screen.getByRole("button");
			expect(button.style.opacity).toBe("1");
		});

		it("applies not-allowed cursor when disabled", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" disabled={true} />);
			const button = screen.getByRole("button");
			expect(button.style.cursor).toBe("not-allowed");
		});

		it("applies pointer cursor when not disabled", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" disabled={false} />);
			const button = screen.getByRole("button");
			expect(button.style.cursor).toBe("pointer");
		});

		it("sets disabled attribute on button when disabled", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" disabled={true} />);
			const button = screen.getByRole("button");
			expect(button).toBeDisabled();
		});
	});

	describe("Click Handling", () => {
		it("calls onClick when clicked and not disabled", () => {
			const onClick = vi.fn();
			render(
				<ChoiceCard
					title="Test"
					subtitle="Sub"
					onClick={onClick}
					disabled={false}
				/>,
			);
			fireEvent.click(screen.getByRole("button"));
			expect(onClick).toHaveBeenCalledTimes(1);
		});

		it("does not call onClick when clicked and disabled", () => {
			const onClick = vi.fn();
			render(
				<ChoiceCard
					title="Test"
					subtitle="Sub"
					onClick={onClick}
					disabled={true}
				/>,
			);
			const button = screen.getByRole("button");
			fireEvent.click(button);
			expect(onClick).not.toHaveBeenCalled();
		});

		it("handles click without onClick prop gracefully", () => {
			render(<ChoiceCard title="Test" subtitle="Sub" />);
			expect(() => {
				fireEvent.click(screen.getByRole("button"));
			}).not.toThrow();
		});

		it("passes event to onClick callback", () => {
			const onClick = vi.fn();
			render(<ChoiceCard title="Test" subtitle="Sub" onClick={onClick} />);
			fireEvent.click(screen.getByRole("button"));
			expect(onClick).toHaveBeenCalledWith(expect.any(Object));
		});
	});

	describe("Props Spreading", () => {
		it("passes additional props to button", () => {
			render(
				<ChoiceCard
					title="Test"
					subtitle="Sub"
					data-testid="custom-card"
					aria-label="Custom Label"
				/>,
			);
			const button = screen.getByTestId("custom-card");
			expect(button).toHaveAttribute("aria-label", "Custom Label");
		});
	});
});
