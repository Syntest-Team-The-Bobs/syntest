import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ColorPreview from "../ColorPreview";
import ColorPreviewLock from "../ColorPreviewLock";

describe("ColorPreview", () => {
	it("renders swatch", () => {
		const { container } = render(<ColorPreview />);
		expect(container.querySelector(".swatch")).toBeTruthy();
	});

	it("displays hex code", () => {
		render(<ColorPreview hex="FF0000" />);
		expect(screen.getByText("FF0000")).toBeTruthy();
	});

	it("displays placeholder", () => {
		render(<ColorPreview />);
		expect(screen.getByText("———")).toBeTruthy();
	});

	it("applies background color", () => {
		const { container } = render(<ColorPreview color="#FF5733" />);
		const swatch = container.querySelector(".swatch");
		expect(swatch.style.backgroundColor).toBe("rgb(255, 87, 51)");
	});
});

describe("ColorPreviewLock", () => {
	it("renders preview", () => {
		const { container } = render(<ColorPreviewLock />);
		const preview = container.querySelector('div[style*="200px"]');
		expect(preview).toBeTruthy();
	});

	it("displays hex when selected", () => {
		const selected = { r: 255, g: 0, b: 0, hex: "FF0000" };
		render(<ColorPreviewLock selected={selected} />);
		expect(screen.getByText("FF0000")).toBeTruthy();
	});

	it("displays placeholder when no color", () => {
		render(<ColorPreviewLock selected={null} />);
		expect(screen.getByText("———")).toBeTruthy();
	});

	it("applies selected color", () => {
		const selected = { r: 255, g: 0, b: 0, hex: "FF0000" };
		const { container } = render(<ColorPreviewLock selected={selected} />);
		const preview = container.querySelector('div[style*="200px"]');
		expect(preview.style.backgroundColor).toBe("rgb(255, 0, 0)");
	});

	it("shows dark text on light bg", () => {
		const selected = { r: 255, g: 255, b: 255, hex: "FFFFFF" };
		const { container } = render(<ColorPreviewLock selected={selected} />);
		const preview = container.querySelector('div[style*="200px"]');
		expect(preview.style.color).toBe("rgb(0, 0, 0)");
	});

	it("shows light text on dark bg", () => {
		const selected = { r: 0, g: 0, b: 0, hex: "000000" };
		const { container } = render(<ColorPreviewLock selected={selected} />);
		const preview = container.querySelector('div[style*="200px"]');
		expect(preview.style.color).toBe("rgb(255, 255, 255)");
	});

	it("shows unlock icon when not locked", () => {
		const selected = { r: 255, g: 0, b: 0, hex: "FF0000" };
		render(<ColorPreviewLock selected={selected} locked={false} />);
		expect(screen.getByTitle("Click to lock")).toBeTruthy();
	});

	it("shows lock icon when locked", () => {
		const selected = { r: 255, g: 0, b: 0, hex: "FF0000" };
		render(<ColorPreviewLock selected={selected} locked={true} />);
		expect(screen.getByTitle("Click to unlock")).toBeTruthy();
	});

	it("calls onToggle when clicked", () => {
		const onToggle = vi.fn();
		const selected = { r: 255, g: 0, b: 0, hex: "FF0000" };
		render(<ColorPreviewLock selected={selected} onToggle={onToggle} />);

		// Click the lock/unlock icon area
		const lockIcon = screen.getByTitle("Click to lock");
		fireEvent.click(lockIcon);
		expect(onToggle).toHaveBeenCalled();
	});
});
