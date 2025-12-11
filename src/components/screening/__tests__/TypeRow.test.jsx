import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TypeRow from "../TypeRow";

describe("TypeRow", () => {
	const defaultProps = {
		title: "Test Type",
		description: "Test description",
		name: "test-type",
		value: null,
		onChange: vi.fn(),
	};

	it("renders title and description", () => {
		render(<TypeRow {...defaultProps} />);
		expect(screen.getByText("Test Type")).toBeInTheDocument();
		expect(screen.getByText("Test description")).toBeInTheDocument();
	});

	it("renders three radio options", () => {
		render(<TypeRow {...defaultProps} />);
		expect(screen.getByText("Yes")).toBeInTheDocument();
		expect(screen.getByText("Sometimes")).toBeInTheDocument();
		expect(screen.getByText("No")).toBeInTheDocument();
	});

	it("has correct radio inputs with name attribute", () => {
		render(<TypeRow {...defaultProps} />);
		const radios = screen.getAllByRole("radio");
		expect(radios).toHaveLength(3);
		for (const radio of radios) {
			expect(radio.name).toBe("test-type");
		}
	});

	it("checks correct radio when value is set", () => {
		render(<TypeRow {...defaultProps} value="yes" />);
		const yesRadio = screen.getByRole("radio", { name: /Test Type — Yes/i });
		expect(yesRadio).toBeChecked();
	});

	it("checks sometimes radio when value is sometimes", () => {
		render(<TypeRow {...defaultProps} value="sometimes" />);
		const sometimesRadio = screen.getByRole("radio", {
			name: /Test Type — Sometimes/i,
		});
		expect(sometimesRadio).toBeChecked();
	});

	it("checks no radio when value is no", () => {
		render(<TypeRow {...defaultProps} value="no" />);
		const noRadio = screen.getByRole("radio", { name: /Test Type — No/i });
		expect(noRadio).toBeChecked();
	});

	it("calls onChange when radio is clicked", () => {
		const onChange = vi.fn();
		render(<TypeRow {...defaultProps} onChange={onChange} />);
		fireEvent.click(screen.getByRole("radio", { name: /Test Type — Yes/i }));
		expect(onChange).toHaveBeenCalledWith("yes");
	});

	it("calls onChange with sometimes value", () => {
		const onChange = vi.fn();
		render(<TypeRow {...defaultProps} onChange={onChange} />);
		fireEvent.click(
			screen.getByRole("radio", { name: /Test Type — Sometimes/i }),
		);
		expect(onChange).toHaveBeenCalledWith("sometimes");
	});

	it("calls onChange with no value", () => {
		const onChange = vi.fn();
		render(<TypeRow {...defaultProps} onChange={onChange} />);
		fireEvent.click(screen.getByRole("radio", { name: /Test Type — No/i }));
		expect(onChange).toHaveBeenCalledWith("no");
	});

	it("does not call onChange when disabled", () => {
		const onChange = vi.fn();
		render(<TypeRow {...defaultProps} onChange={onChange} disabled />);
		fireEvent.click(screen.getByRole("radio", { name: /Test Type — Yes/i }));
		expect(onChange).not.toHaveBeenCalled();
	});

	it("applies disabled opacity", () => {
		const { container } = render(<TypeRow {...defaultProps} disabled />);
		const li = container.querySelector("li");
		expect(li.style.opacity).toBe("0.6");
	});

	it("applies compact styles when compact", () => {
		const { container } = render(<TypeRow {...defaultProps} compact />);
		const li = container.querySelector("li");
		expect(li.style.padding).toBe("0.5rem 0px");
	});

	it("applies normal styles when not compact", () => {
		const { container } = render(<TypeRow {...defaultProps} />);
		const li = container.querySelector("li");
		expect(li.style.padding).toBe("1.5rem 0px");
	});

	it("handles missing onChange prop", () => {
		render(<TypeRow {...defaultProps} onChange={undefined} />);
		expect(() =>
			fireEvent.click(screen.getByRole("radio", { name: /Test Type — Yes/i })),
		).not.toThrow();
	});

	it("has correct aria-labels for accessibility", () => {
		render(<TypeRow {...defaultProps} />);
		expect(
			screen.getByRole("radio", { name: /Test Type — Yes/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("radio", { name: /Test Type — Sometimes/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("radio", { name: /Test Type — No/i }),
		).toBeInTheDocument();
	});
});
