import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useColorTest } from "../useColorTest";

// Mock dependencies
vi.mock("../useDeck", () => ({
	useDeck: vi.fn((deck) => ({
		deck,
		idx: 0,
		setIdx: vi.fn(),
		start: vi.fn(),
		reactionMs: vi.fn(() => 1500),
		next: vi.fn(),
	})),
}));

describe("useColorTest", () => {
	const mockStimuli = ["note1", "note2", "note3"];
	const mockPracticeStimuli = ["practice1"];
	let mockOnComplete;

	beforeEach(() => {
		mockOnComplete = vi.fn();
		vi.clearAllMocks();
	});

	describe("Initial State", () => {
		it("should initialize with intro phase", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			expect(result.current.phase).toBe("intro");
		});

		it("should initialize with no selection", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			expect(result.current.selected).toBeNull();
			expect(result.current.locked).toBe(false);
			expect(result.current.noExperience).toBe(false);
		});

		it("should initialize with empty responses array", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			expect(result.current.responses).toEqual([]);
		});

		it("should initialize with provided stimuli", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			expect(result.current.stimuli).toEqual(mockStimuli);
			expect(result.current.practiceStimuli).toEqual(mockPracticeStimuli);
		});
	});

	describe("Color Selection - onPick", () => {
		it("should set selected color when not locked", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			const color = {
				r: 255,
				g: 0,
				b: 0,
				hex: "#ff0000",
				x: 100,
				y: 200,
			};

			act(() => {
				result.current.onPick(color);
			});

			expect(result.current.selected).toEqual({
				r: 255,
				g: 0,
				b: 0,
				hex: "#ff0000",
				canvasX: 100,
				canvasY: 200,
			});
		});

		it("should not change selection when locked", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			const firstColor = {
				r: 255,
				g: 0,
				b: 0,
				hex: "#ff0000",
				x: 100,
				y: 200,
			};
			const secondColor = {
				r: 0,
				g: 255,
				b: 0,
				hex: "#00ff00",
				x: 150,
				y: 250,
			};

			act(() => {
				result.current.onPick(firstColor);
			});

			act(() => {
				result.current.toggleLock();
			});

			act(() => {
				result.current.onPick(secondColor);
			});

			expect(result.current.selected.hex).toBe("#ff0000");
		});
	});

	describe("Lock Toggle - toggleLock", () => {
		it("should toggle lock when color is selected", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			const color = {
				r: 255,
				g: 0,
				b: 0,
				hex: "#ff0000",
				x: 100,
				y: 200,
			};

			act(() => {
				result.current.onPick(color);
			});

			act(() => {
				result.current.toggleLock();
			});

			expect(result.current.locked).toBe(true);

			act(() => {
				result.current.toggleLock();
			});

			expect(result.current.locked).toBe(false);
		});

		it("should not lock when no color is selected", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			act(() => {
				result.current.toggleLock();
			});

			expect(result.current.locked).toBe(false);
		});
	});

	describe("No Experience Toggle - toggleNoExperience", () => {
		it("should toggle no experience state", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			act(() => {
				result.current.toggleNoExperience();
			});

			expect(result.current.noExperience).toBe(true);

			act(() => {
				result.current.toggleNoExperience();
			});

			expect(result.current.noExperience).toBe(false);
		});
	});

	describe("Start Test - startTest", () => {
		it("should transition to testing phase", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			act(() => {
				result.current.startTest();
			});

			expect(result.current.phase).toBe("testing");
		});

		it("should reset responses array", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			// Simulate having responses
			act(() => {
				result.current.setPhase("testing");
			});

			act(() => {
				result.current.startTest();
			});

			expect(result.current.responses).toEqual([]);
		});
	});

	describe("Handle Next - handleNext", () => {
		it("should not proceed if nothing is selected and no experience is unchecked", async () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			let nextResult;
			await act(async () => {
				nextResult = await result.current.handleNext();
			});

			expect(nextResult.shouldContinue).toBe(true);
			expect(result.current.phase).toBe("intro");
		});

		it("should not proceed if color is selected but not locked", async () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			const color = {
				r: 255,
				g: 0,
				b: 0,
				hex: "#ff0000",
				x: 100,
				y: 200,
			};

			act(() => {
				result.current.onPick(color);
			});

			let nextResult;
			await act(async () => {
				nextResult = await result.current.handleNext();
			});

			expect(nextResult.shouldContinue).toBe(true);
		});

		it("should clear selection and lock after valid next", async () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			const color = {
				r: 255,
				g: 0,
				b: 0,
				hex: "#ff0000",
				x: 100,
				y: 200,
			};

			act(() => {
				result.current.setPhase("testing");
				result.current.onPick(color);
				result.current.toggleLock();
			});

			await act(async () => {
				await result.current.handleNext();
			});

			// Check that selection was cleared
			expect(result.current.locked).toBe(false);
			expect(result.current.noExperience).toBe(false);
		});

		it("should clear no experience after valid next", async () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			act(() => {
				result.current.setPhase("testing");
				result.current.toggleNoExperience();
			});

			await act(async () => {
				await result.current.handleNext();
			});

			expect(result.current.noExperience).toBe(false);
		});

		it("should record null color when no experience checked", async () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			act(() => {
				result.current.setPhase("testing");
				result.current.toggleNoExperience();
			});

			await act(async () => {
				await result.current.handleNext();
			});

			expect(result.current.responses).toHaveLength(1);
			expect(result.current.responses[0].noSynestheticExperience).toBe(true);
			expect(result.current.responses[0].selectedColor).toBeNull();
		});

		it("should not record during practice phase", async () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			const color = {
				r: 255,
				g: 0,
				b: 0,
				hex: "#ff0000",
				x: 100,
				y: 200,
			};

			act(() => {
				result.current.setPhase("practice");
				result.current.onPick(color);
				result.current.toggleLock();
			});

			await act(async () => {
				await result.current.handleNext();
			});

			expect(result.current.responses).toHaveLength(0);
		});

		it("should handle completion when at last index", async () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			// Simulate being at the end
			act(() => {
				result.current.setPhase("testing");
				result.current.toggleNoExperience();
			});

			// Manually set to simulate last item
			const mockDeck = [{ stimulus: "last" }];
			result.current.deck = mockDeck;

			await act(async () => {
				await result.current.handleNext();
			});

			// Should transition to done if at end
			expect(result.current.responses).toHaveLength(1);
		});
	});

	describe("Phase Management - setPhase", () => {
		it("should allow manual phase changes", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			act(() => {
				result.current.setPhase("practice");
			});

			expect(result.current.phase).toBe("practice");

			act(() => {
				result.current.setPhase("testing");
			});

			expect(result.current.phase).toBe("testing");

			act(() => {
				result.current.setPhase("done");
			});

			expect(result.current.phase).toBe("done");
		});
	});

	describe("Edge Cases", () => {
		it("should handle onComplete callback", async () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			act(() => {
				result.current.setPhase("testing");
				result.current.toggleNoExperience();
			});

			await act(async () => {
				await result.current.handleNext();
			});

			// Test completed a step
			expect(result.current.responses).toHaveLength(1);
		});

		it("should handle empty stimuli arrays", () => {
			const { result } = renderHook(() => useColorTest([], [], mockOnComplete));

			expect(result.current.stimuli).toEqual([]);
			expect(result.current.practiceStimuli).toEqual([]);
		});

		it("should handle practice phase not recording responses", async () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			act(() => {
				result.current.setPhase("practice");
				result.current.toggleNoExperience();
			});

			const initialResponseCount = result.current.responses.length;

			await act(async () => {
				await result.current.handleNext();
			});

			// Practice phase should not add to responses
			expect(result.current.responses.length).toBe(initialResponseCount);
		});

		it("should handle intro phase not recording responses", async () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			// Stay in intro phase
			act(() => {
				result.current.toggleNoExperience();
			});

			await act(async () => {
				await result.current.handleNext();
			});

			// Intro phase should not record
			expect(result.current.responses.length).toBe(0);
		});

		it("should record response only when in testing phase", async () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			// Explicitly set to testing phase
			act(() => {
				result.current.setPhase("testing");
				result.current.toggleNoExperience();
			});

			await act(async () => {
				await result.current.handleNext();
			});

			// Should have recorded
			expect(result.current.responses.length).toBe(1);
		});

		it("should not allow lock when selected is null", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, mockOnComplete),
			);

			// Try to lock without selecting
			act(() => {
				result.current.toggleLock();
			});

			// Should remain unlocked
			expect(result.current.locked).toBe(false);
		});

		it("should handle undefined onComplete callback", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, undefined),
			);

			// Should initialize without error
			expect(result.current.phase).toBe("intro");
			expect(result.current.responses).toEqual([]);
		});

		it("should handle null onComplete callback", () => {
			const { result } = renderHook(() =>
				useColorTest(mockStimuli, mockPracticeStimuli, null),
			);

			// Should initialize without error
			expect(result.current.phase).toBe("intro");
			expect(result.current.responses).toEqual([]);
		});
	});
});
