import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import ColorPreviewLock from "../ColorPreviewLock";

describe("ColorPreviewLock", () => {
	test("renders color preview", () => {
		const { container } = render(<ColorPreviewLock />);
		const preview = container.querySelector('div[style*="200px"]');
		expect(preview).toBeTruthy();
	});

	test("displays hex code when color selected", () => {
		const selected = { r: 255, g: 0, b: 0, hex: "FF0000" };
		render(<ColorPreviewLock selected={selected} />);
		expect(screen.getByText("FF0000")).toBeTruthy();
	});

	test("displays placeholder when no color", () => {
		render(<ColorPreviewLock selected={null} />);
		expect(screen.getByText("———")).toBeTruthy();
	});

	test("applies selected color as background", () => {
		const selected = { r: 255, g: 0, b: 0, hex: "FF0000" };
		const { container } = render(<ColorPreviewLock selected={selected} />);
		const preview = container.querySelector('div[style*="200px"]');
		expect(preview.style.backgroundColor).toBe("rgb(255, 0, 0)");
	});

	test("uses dark text on light background", () => {
		const selected = { r: 255, g: 255, b: 255, hex: "FFFFFF" };
		const { container } = render(<ColorPreviewLock selected={selected} />);
		const preview = container.querySelector('div[style*="200px"]');
		expect(preview.style.color).toBe("rgb(0, 0, 0)");
	});

	test("uses light text on dark background", () => {
		const selected = { r: 0, g: 0, b: 0, hex: "000000" };
		const { container } = render(<ColorPreviewLock selected={selected} />);
		const preview = container.querySelector('div[style*="200px"]');
		expect(preview.style.color).toBe("rgb(255, 255, 255)");
	});

	test("shows unlock icon when not locked", () => {
		const selected = { r: 255, g: 0, b: 0, hex: "FF0000" };
		render(<ColorPreviewLock selected={selected} locked={false} />);
		expect(screen.getByTitle("Click to lock")).toBeTruthy();
	});

	test("shows lock icon when locked", () => {
		const selected = { r: 255, g: 0, b: 0, hex: "FF0000" };
		render(<ColorPreviewLock selected={selected} locked={true} />);
		expect(screen.getByTitle("Click to unlock")).toBeTruthy();
	});

	test("calls onToggle when clicked", () => {
		const onToggle = vi.fn();
		const selected = { r: 255, g: 0, b: 0, hex: "FF0000" };

		const { container } = render(
			<ColorPreviewLock selected={selected} onToggle={onToggle} />,
		);

		// Click the lock button directly
		const lockButton = container.querySelector(
			'button[style*="position: absolute"]',
		);
		fireEvent.click(lockButton);

		expect(onToggle).toHaveBeenCalled();
	});
});
