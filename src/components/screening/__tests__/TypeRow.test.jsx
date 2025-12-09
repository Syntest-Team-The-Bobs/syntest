import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TypeRow from "../TypeRow";

describe("TypeRow", () => {
	const defaultProps = {
		title: "Test Type",
		description: "Test Description",
		name: "testType",
		value: null,
		onChange: vi.fn(),
	};

	describe("Rendering", () => {
		it("renders title", () => {
			render(<TypeRow {...defaultProps} />);
			expect(screen.getByText("Test Type")).toBeInTheDocument();
		});

		it("renders description", () => {
			render(<TypeRow {...defaultProps} />);
			expect(screen.getByText("Test Description")).toBeInTheDocument();
		});

		it("renders all three radio options", () => {
			render(<TypeRow {...defaultProps} />);
			expect(screen.getByText("Yes")).toBeInTheDocument();
			expect(screen.getByText("Sometimes")).toBeInTheDocument();
			expect(screen.getByText("No")).toBeInTheDocument();
		});

		it("renders as a list item", () => {
			render(<TypeRow {...defaultProps} />);
			expect(screen.getByRole("listitem")).toBeInTheDocument();
		});

		it("renders radio inputs with correct name attribute", () => {
			render(<TypeRow {...defaultProps} />);
			const radios = screen.getAllByRole("radio");
			for (const radio of radios) {
				expect(radio).toHaveAttribute("name", "testType");
			}
		});
	});

	describe("Selection", () => {
		it("selects 'yes' option when value is 'yes'", () => {
			render(<TypeRow {...defaultProps} value="yes" />);
			const yesRadio = screen.getByLabelText(/Test Type — Yes/);
			expect(yesRadio).toBeChecked();
		});

		it("selects 'sometimes' option when value is 'sometimes'", () => {
			render(<TypeRow {...defaultProps} value="sometimes" />);
			const sometimesRadio = screen.getByLabelText(/Test Type — Sometimes/);
			expect(sometimesRadio).toBeChecked();
		});

		it("selects 'no' option when value is 'no'", () => {
			render(<TypeRow {...defaultProps} value="no" />);
			const noRadio = screen.getByLabelText(/Test Type — No/);
			expect(noRadio).toBeChecked();
		});

		it("has no selection when value is null", () => {
			render(<TypeRow {...defaultProps} value={null} />);
			const radios = screen.getAllByRole("radio");
			for (const radio of radios) {
				expect(radio).not.toBeChecked();
			}
		});
	});

	describe("onChange Handler", () => {
		it("calls onChange with 'yes' when Yes is selected", () => {
			const onChange = vi.fn();
			render(<TypeRow {...defaultProps} onChange={onChange} />);
			fireEvent.click(screen.getByLabelText(/Test Type — Yes/));
			expect(onChange).toHaveBeenCalledWith("yes");
		});

		it("calls onChange with 'sometimes' when Sometimes is selected", () => {
			const onChange = vi.fn();
			render(<TypeRow {...defaultProps} onChange={onChange} />);
			fireEvent.click(screen.getByLabelText(/Test Type — Sometimes/));
			expect(onChange).toHaveBeenCalledWith("sometimes");
		});

		it("calls onChange with 'no' when No is selected", () => {
			const onChange = vi.fn();
			render(<TypeRow {...defaultProps} onChange={onChange} />);
			fireEvent.click(screen.getByLabelText(/Test Type — No/));
			expect(onChange).toHaveBeenCalledWith("no");
		});

		it("does not call onChange when disabled", () => {
			const onChange = vi.fn();
			render(<TypeRow {...defaultProps} onChange={onChange} disabled={true} />);
			fireEvent.click(screen.getByLabelText(/Test Type — Yes/));
			expect(onChange).not.toHaveBeenCalled();
		});

		it("handles missing onChange gracefully", () => {
			render(<TypeRow {...defaultProps} onChange={undefined} />);
			expect(() => {
				fireEvent.click(screen.getByLabelText(/Test Type — Yes/));
			}).not.toThrow();
		});
	});

	describe("Disabled State", () => {
		it("applies disabled opacity when disabled", () => {
			render(<TypeRow {...defaultProps} disabled={true} />);
			const listItem = screen.getByRole("listitem");
			expect(listItem.style.opacity).toBe("0.6");
		});

		it("applies normal opacity when not disabled", () => {
			render(<TypeRow {...defaultProps} disabled={false} />);
			const listItem = screen.getByRole("listitem");
			expect(listItem.style.opacity).toBe("1");
		});

		it("disables all radio inputs when disabled", () => {
			render(<TypeRow {...defaultProps} disabled={true} />);
			const radios = screen.getAllByRole("radio");
			for (const radio of radios) {
				expect(radio).toBeDisabled();
			}
		});

		it("enables all radio inputs when not disabled", () => {
			render(<TypeRow {...defaultProps} disabled={false} />);
			const radios = screen.getAllByRole("radio");
			for (const radio of radios) {
				expect(radio).not.toBeDisabled();
			}
		});
	});

	describe("Compact Mode", () => {
		it("applies compact padding when compact is true", () => {
			render(<TypeRow {...defaultProps} compact={true} />);
			const listItem = screen.getByRole("listitem");
			expect(listItem.style.padding).toBe("0.5rem 0px");
		});

		it("applies normal padding when compact is false", () => {
			render(<TypeRow {...defaultProps} compact={false} />);
			const listItem = screen.getByRole("listitem");
			expect(listItem.style.padding).toBe("1.5rem 0px");
		});

		it("applies compact font size to title when compact", () => {
			render(<TypeRow {...defaultProps} compact={true} />);
			const title = screen.getByText("Test Type");
			expect(title.style.fontSize).toBe("1.125rem");
		});

		it("applies normal font size to title when not compact", () => {
			render(<TypeRow {...defaultProps} compact={false} />);
			const title = screen.getByText("Test Type");
			expect(title.style.fontSize).toBe("1.5rem");
		});

		it("applies compact border when compact", () => {
			render(<TypeRow {...defaultProps} compact={true} />);
			const listItem = screen.getByRole("listitem");
			// Browser converts hex to rgb
			expect(listItem.style.borderBottom).toBe("1px solid rgb(229, 231, 235)");
		});

		it("applies compact gap to options when compact", () => {
			render(<TypeRow {...defaultProps} compact={true} />);
			const optionsDiv = screen.getByText("Yes").closest(".type-opts");
			expect(optionsDiv.style.gap).toBe("1rem");
		});
	});

	describe("Accessibility", () => {
		it("has accessible aria-labels for each option", () => {
			render(<TypeRow {...defaultProps} title="Letter Color" />);
			expect(screen.getByLabelText("Letter Color — Yes")).toBeInTheDocument();
			expect(
				screen.getByLabelText("Letter Color — Sometimes"),
			).toBeInTheDocument();
			expect(screen.getByLabelText("Letter Color — No")).toBeInTheDocument();
		});

		it("associates labels with radio inputs", () => {
			render(<TypeRow {...defaultProps} />);
			const radios = screen.getAllByRole("radio");
			expect(radios).toHaveLength(3);
		});
	});
});
