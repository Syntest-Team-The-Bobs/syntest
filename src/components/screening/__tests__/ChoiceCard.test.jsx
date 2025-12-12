import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChoiceCard from "../ChoiceCard";

describe("ChoiceCard", () => {
	it("renders title and subtitle", () => {
		render(<ChoiceCard title="Test Title" subtitle="Test Subtitle" />);
		expect(screen.getByText("Test Title")).toBeInTheDocument();
		expect(screen.getByText("Test Subtitle")).toBeInTheDocument();
	});

	it("applies selected class when selected", () => {
		const { container } = render(
			<ChoiceCard title="Test" subtitle="Sub" selected={true} />,
		);
		expect(container.firstChild.className).toContain("selected");
	});

	it("does not apply selected class when not selected", () => {
		const { container } = render(
			<ChoiceCard title="Test" subtitle="Sub" selected={false} />,
		);
		expect(container.firstChild.className).not.toContain("selected");
	});

	it("applies negative variant classes", () => {
		const { container } = render(
			<ChoiceCard title="Test" subtitle="Sub" variant="negative" />,
		);
		expect(container.firstChild.className).toContain("choice-negative");
	});

	it("applies default variant classes", () => {
		const { container } = render(
			<ChoiceCard title="Test" subtitle="Sub" variant="default" />,
		);
		expect(container.firstChild.className).toContain("choice-card");
	});

	it("calls onClick when clicked and not disabled", () => {
		const onClick = vi.fn();
		render(<ChoiceCard title="Test" subtitle="Sub" onClick={onClick} />);
		fireEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalled();
	});

	it("does not call onClick when disabled", () => {
		const onClick = vi.fn();
		render(
			<ChoiceCard title="Test" subtitle="Sub" onClick={onClick} disabled />,
		);
		fireEvent.click(screen.getByRole("button"));
		expect(onClick).not.toHaveBeenCalled();
	});

	it("applies disabled styles when disabled", () => {
		render(<ChoiceCard title="Test" subtitle="Sub" disabled />);
		const button = screen.getByRole("button");
		expect(button.style.opacity).toBe("0.6");
		expect(button.style.cursor).toBe("not-allowed");
	});

	it("applies normal styles when not disabled", () => {
		render(<ChoiceCard title="Test" subtitle="Sub" />);
		const button = screen.getByRole("button");
		expect(button.style.opacity).toBe("1");
		expect(button.style.cursor).toBe("pointer");
	});

	it("applies compact styles when compact", () => {
		render(<ChoiceCard title="Test" subtitle="Sub" compact />);
		const button = screen.getByRole("button");
		expect(button.style.padding).toBe("0.75rem 1rem");
	});

	it("applies normal padding when not compact", () => {
		render(<ChoiceCard title="Test" subtitle="Sub" />);
		const button = screen.getByRole("button");
		expect(button.style.padding).toBe("1.5rem");
	});

	it("handles click without onClick prop", () => {
		render(<ChoiceCard title="Test" subtitle="Sub" />);
		expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
	});

	it("passes additional props to button", () => {
		render(
			<ChoiceCard title="Test" subtitle="Sub" data-testid="custom-card" />,
		);
		expect(screen.getByTestId("custom-card")).toBeInTheDocument();
	});
});
