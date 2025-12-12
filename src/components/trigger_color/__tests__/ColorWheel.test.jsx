import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ColorWheel from "../ColorWheel";

// Mock canvas inline
beforeEach(() => {
	HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
		fillRect: vi.fn(),
		createLinearGradient: vi.fn(() => ({
			addColorStop: vi.fn(),
		})),
		getImageData: vi.fn(() => ({
			data: [255, 128, 64, 255],
		})),
	}));

	HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
		left: 10,
		top: 20,
		width: 500,
		height: 400,
	}));
});

describe("ColorWheel", () => {
	describe("Rendering", () => {
		it("renders canvas element", () => {
			const { container } = render(<ColorWheel />);
			expect(container.querySelector("canvas")).toBeTruthy();
		});

		it("applies default dimensions", () => {
			const { container } = render(<ColorWheel />);
			const canvas = container.querySelector("canvas");
			expect(canvas.getAttribute("width")).toBe("500");
			expect(canvas.getAttribute("height")).toBe("400");
		});

		it("applies custom dimensions", () => {
			const { container } = render(<ColorWheel width={600} height={500} />);
			const canvas = container.querySelector("canvas");
			expect(canvas.getAttribute("width")).toBe("600");
			expect(canvas.getAttribute("height")).toBe("500");
		});

		it("shows crosshair cursor when not locked", () => {
			const { container } = render(<ColorWheel lock={false} />);
			const canvas = container.querySelector("canvas");
			expect(canvas.style.cursor).toBe("crosshair");
		});

		it("shows default cursor when locked", () => {
			const { container } = render(<ColorWheel lock={true} />);
			const canvas = container.querySelector("canvas");
			expect(canvas.style.cursor).toBe("default");
		});

		it("has black border", () => {
			const { container } = render(<ColorWheel />);
			const canvas = container.querySelector("canvas");
			expect(canvas.style.border).toBe("3px solid rgb(0, 0, 0)");
		});
	});

	describe("Canvas Drawing", () => {
		it("gets 2d context on mount", () => {
			const getContext = vi.fn(() => ({
				fillRect: vi.fn(),
				createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
			}));
			HTMLCanvasElement.prototype.getContext = getContext;

			render(<ColorWheel />);
			expect(getContext).toHaveBeenCalledWith("2d");
		});

		it("creates horizontal gradient", () => {
			const createLinearGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
			HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
				fillRect: vi.fn(),
				createLinearGradient,
			}));

			render(<ColorWheel />);
			expect(createLinearGradient).toHaveBeenCalledWith(0, 0, 500, 0);
		});

		it("redraws when dimensions change", () => {
			const fillRect = vi.fn();
			HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
				fillRect,
				createLinearGradient: () => ({ addColorStop: vi.fn() }),
			}));

			const { rerender } = render(<ColorWheel width={500} height={400} />);
			const callCount1 = fillRect.mock.calls.length;

			rerender(<ColorWheel width={600} height={500} />);
			expect(fillRect.mock.calls.length).toBeGreaterThanOrEqual(callCount1);
		});
	});

	describe("Color Picking", () => {
		it("calls onPick with color data on mouse down", () => {
			const onPick = vi.fn();
			const { container } = render(<ColorWheel onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });

			expect(onPick).toHaveBeenCalled();
			const color = onPick.mock.calls[0][0];
			expect(color).toHaveProperty("r");
			expect(color).toHaveProperty("g");
			expect(color).toHaveProperty("b");
			expect(color).toHaveProperty("hex");
		});

		it("does not pick when locked", () => {
			const onPick = vi.fn();
			const { container } = render(<ColorWheel lock={true} onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
			expect(onPick).not.toHaveBeenCalled();
		});

		it("picks continuously while dragging", () => {
			const onPick = vi.fn();
			const { container } = render(<ColorWheel onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
			fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
			fireEvent.mouseMove(canvas, { clientX: 200, clientY: 200 });

			expect(onPick.mock.calls.length).toBeGreaterThanOrEqual(3);
		});

		it("stops picking on mouse up", () => {
			const onPick = vi.fn();
			const { container } = render(<ColorWheel onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
			fireEvent.mouseUp(canvas);
			onPick.mockClear();

			fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
			expect(onPick).not.toHaveBeenCalled();
		});

		it("stops picking on mouse leave", () => {
			const onPick = vi.fn();
			const { container } = render(<ColorWheel onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
			fireEvent.mouseLeave(canvas);
			onPick.mockClear();

			fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
			expect(onPick).not.toHaveBeenCalled();
		});

		it("does not pick during move when not dragging", () => {
			const onPick = vi.fn();
			const { container } = render(<ColorWheel onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 });
			expect(onPick).not.toHaveBeenCalled();
		});

		it("handles missing onPick callback", () => {
			const { container } = render(<ColorWheel />);
			const canvas = container.querySelector("canvas");

			expect(() => {
				fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
			}).not.toThrow();
		});
	});

	describe("Coordinate Clamping", () => {
		it("clamps x coordinate to canvas bounds (left)", () => {
			const onPick = vi.fn();
			const { container } = render(<ColorWheel onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			// Click before canvas left edge
			fireEvent.mouseDown(canvas, { clientX: 0, clientY: 50 });

			expect(onPick).toHaveBeenCalled();
			const color = onPick.mock.calls[0][0];
			expect(color.x).toBeGreaterThanOrEqual(0);
		});

		it("clamps x coordinate to canvas bounds (right)", () => {
			const onPick = vi.fn();
			const { container } = render(<ColorWheel onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			// Click beyond canvas right edge
			fireEvent.mouseDown(canvas, { clientX: 1000, clientY: 50 });

			expect(onPick).toHaveBeenCalled();
			const color = onPick.mock.calls[0][0];
			expect(color.x).toBeLessThan(500);
		});

		it("clamps y coordinate to canvas bounds (top)", () => {
			const onPick = vi.fn();
			const { container } = render(<ColorWheel onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			// Click before canvas top edge
			fireEvent.mouseDown(canvas, { clientX: 50, clientY: 0 });

			expect(onPick).toHaveBeenCalled();
			const color = onPick.mock.calls[0][0];
			expect(color.y).toBeGreaterThanOrEqual(0);
		});

		it("clamps y coordinate to canvas bounds (bottom)", () => {
			const onPick = vi.fn();
			const { container } = render(<ColorWheel onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			// Click beyond canvas bottom edge
			fireEvent.mouseDown(canvas, { clientX: 50, clientY: 1000 });

			expect(onPick).toHaveBeenCalled();
			const color = onPick.mock.calls[0][0];
			expect(color.y).toBeLessThan(400);
		});
	});

	describe("Lock Toggle", () => {
		it("calls onToggleLock on click", () => {
			const onToggleLock = vi.fn();
			const { container } = render(<ColorWheel onToggleLock={onToggleLock} />);
			const canvas = container.querySelector("canvas");

			fireEvent.click(canvas);
			expect(onToggleLock).toHaveBeenCalled();
		});

		it("does not toggle lock during drag", () => {
			const onToggleLock = vi.fn();
			const { container } = render(<ColorWheel onToggleLock={onToggleLock} />);
			const canvas = container.querySelector("canvas");

			fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
			fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
			fireEvent.click(canvas);

			expect(onToggleLock).not.toHaveBeenCalled();
		});

		it("allows toggle after drag ends", () => {
			const onToggleLock = vi.fn();
			const { container } = render(<ColorWheel onToggleLock={onToggleLock} />);
			const canvas = container.querySelector("canvas");

			fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
			fireEvent.mouseUp(canvas);
			fireEvent.click(canvas);

			expect(onToggleLock).toHaveBeenCalled();
		});

		it("handles missing onToggleLock callback", () => {
			const { container } = render(<ColorWheel />);
			const canvas = container.querySelector("canvas");

			expect(() => {
				fireEvent.click(canvas);
			}).not.toThrow();
		});
	});

	describe("Global Mouse Up Handler", () => {
		it("stops dragging on window mouse up", () => {
			const onPick = vi.fn();
			const { container } = render(<ColorWheel onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
			fireEvent.mouseUp(window);
			onPick.mockClear();

			fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
			expect(onPick).not.toHaveBeenCalled();
		});

		it("cleans up event listener on unmount", () => {
			const removeEventListener = vi.spyOn(window, "removeEventListener");
			const { unmount } = render(<ColorWheel />);

			unmount();
			expect(removeEventListener).toHaveBeenCalledWith(
				"mouseup",
				expect.any(Function),
			);
		});
	});

	describe("Hex Conversion", () => {
		it("returns uppercase hex values", () => {
			const onPick = vi.fn();
			HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
				fillRect: vi.fn(),
				createLinearGradient: () => ({ addColorStop: vi.fn() }),
				getImageData: () => ({ data: [171, 205, 239, 255] }), // ABCDEF
			}));

			const { container } = render(<ColorWheel onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });

			const color = onPick.mock.calls[0][0];
			expect(color.hex).toBe("ABCDEF");
		});

		it("pads single digit hex values", () => {
			const onPick = vi.fn();
			HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
				fillRect: vi.fn(),
				createLinearGradient: () => ({ addColorStop: vi.fn() }),
				getImageData: () => ({ data: [1, 2, 3, 255] }), // Should be 010203
			}));

			const { container } = render(<ColorWheel onPick={onPick} />);
			const canvas = container.querySelector("canvas");

			fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });

			const color = onPick.mock.calls[0][0];
			expect(color.hex).toBe("010203");
			expect(color.hex.length).toBe(6);
		});
	});

	describe("Edge Cases", () => {
		it("handles missing onPick callback gracefully", () => {
			const { container } = render(<ColorWheel />);
			const canvas = container.querySelector("canvas");

			expect(() => {
				fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
			}).not.toThrow();
		});
	});
});
