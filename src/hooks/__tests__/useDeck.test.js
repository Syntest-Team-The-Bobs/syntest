import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeck } from "../useDeck";

describe("useDeck", () => {
	let mockDeck;

	beforeEach(() => {
		mockDeck = [
			{ stimulus: "C4", repetition: 1 },
			{ stimulus: "D4", repetition: 1 },
			{ stimulus: "E4", repetition: 1 },
			{ stimulus: "C4", repetition: 2 },
		];
		vi.clearAllMocks();
	});

	describe("Initial State", () => {
		it("should initialize with index 0", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			expect(result.current.idx).toBe(0);
		});

		it("should return the provided deck", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			expect(result.current.deck).toEqual(mockDeck);
			expect(result.current.deck).toHaveLength(4);
		});

		it("should handle empty deck", () => {
			const { result } = renderHook(() => useDeck([]));

			expect(result.current.deck).toEqual([]);
			expect(result.current.idx).toBe(0);
		});
	});

	describe("Navigation - next", () => {
		it("should increment index by 1", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			expect(result.current.idx).toBe(0);

			act(() => {
				result.current.next();
			});

			expect(result.current.idx).toBe(1);
		});

		it("should increment multiple times", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			act(() => {
				result.current.next();
				result.current.next();
				result.current.next();
			});

			expect(result.current.idx).toBe(3);
		});

		it("should allow incrementing beyond deck length", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			act(() => {
				result.current.next();
				result.current.next();
				result.current.next();
				result.current.next();
			});

			expect(result.current.idx).toBe(4);
		});
	});

	describe("Manual Index Control - setIdx", () => {
		it("should allow setting index directly", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			act(() => {
				result.current.setIdx(2);
			});

			expect(result.current.idx).toBe(2);
		});

		it("should allow setting index to 0", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			act(() => {
				result.current.setIdx(2);
				result.current.setIdx(0);
			});

			expect(result.current.idx).toBe(0);
		});

		it("should allow setting index using function updater", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			act(() => {
				result.current.setIdx((prev) => prev + 5);
			});

			expect(result.current.idx).toBe(5);
		});

		it("should handle negative indices", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			act(() => {
				result.current.setIdx(-1);
			});

			expect(result.current.idx).toBe(-1);
		});
	});

	describe("Timing - start and reactionMs", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should initialize timer when start is called", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			const _startTime = performance.now();

			act(() => {
				result.current.start();
			});

			// Timer should be started (reactionMs should return small value)
			const elapsed = result.current.reactionMs();
			expect(elapsed).toBeGreaterThanOrEqual(0);
		});

		it("should measure elapsed time accurately", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			act(() => {
				result.current.start();
			});

			// Advance time by 1500ms
			act(() => {
				vi.advanceTimersByTime(1500);
			});

			const elapsed = result.current.reactionMs();
			expect(elapsed).toBeGreaterThanOrEqual(1500);
		});

		it("should restart timer on multiple start calls", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			act(() => {
				result.current.start();
			});

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			// Restart timer
			act(() => {
				result.current.start();
			});

			act(() => {
				vi.advanceTimersByTime(500);
			});

			const elapsed = result.current.reactionMs();
			// Should be close to 500ms, not 1500ms
			expect(elapsed).toBeLessThan(1000);
		});

		it("should return 0 or near-0 if reactionMs called immediately after start", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			act(() => {
				result.current.start();
			});

			const elapsed = result.current.reactionMs();
			expect(elapsed).toBeLessThan(100);
		});

		it("should handle multiple reaction time checks", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			act(() => {
				result.current.start();
			});

			act(() => {
				vi.advanceTimersByTime(500);
			});

			const first = result.current.reactionMs();

			act(() => {
				vi.advanceTimersByTime(500);
			});

			const second = result.current.reactionMs();

			expect(second).toBeGreaterThan(first);
		});
	});

	describe("Integration", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should work with start, timing, and navigation together", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			// Start first trial
			act(() => {
				result.current.start();
			});

			act(() => {
				vi.advanceTimersByTime(1200);
			});

			const firstTime = result.current.reactionMs();
			expect(firstTime).toBeGreaterThanOrEqual(1200);

			// Move to next trial
			act(() => {
				result.current.next();
			});

			expect(result.current.idx).toBe(1);

			// Start second trial
			act(() => {
				result.current.start();
			});

			act(() => {
				vi.advanceTimersByTime(800);
			});

			const secondTime = result.current.reactionMs();
			expect(secondTime).toBeGreaterThanOrEqual(800);
			expect(secondTime).toBeLessThan(1200);
		});

		it("should handle deck reset via setIdx", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			act(() => {
				result.current.next();
				result.current.next();
			});

			expect(result.current.idx).toBe(2);

			act(() => {
				result.current.setIdx(0);
			});

			expect(result.current.idx).toBe(0);
		});
	});

	describe("Edge Cases", () => {
		it("should handle single-item deck", () => {
			const singleDeck = [{ stimulus: "C4", repetition: 1 }];
			const { result } = renderHook(() => useDeck(singleDeck));

			expect(result.current.deck).toHaveLength(1);
			expect(result.current.idx).toBe(0);

			act(() => {
				result.current.next();
			});

			expect(result.current.idx).toBe(1);
		});

		it("should handle very large deck", () => {
			const largeDeck = Array.from({ length: 1000 }, (_, i) => ({
				stimulus: `note${i}`,
				repetition: 1,
			}));
			const { result } = renderHook(() => useDeck(largeDeck));

			expect(result.current.deck).toHaveLength(1000);

			act(() => {
				result.current.setIdx(999);
			});

			expect(result.current.idx).toBe(999);
		});

		it("should maintain independent state across multiple hook instances", () => {
			const deck1 = [{ stimulus: "C4" }];
			const deck2 = [{ stimulus: "D4" }, { stimulus: "E4" }];

			const { result: result1 } = renderHook(() => useDeck(deck1));
			const { result: result2 } = renderHook(() => useDeck(deck2));

			act(() => {
				result1.current.next();
			});

			expect(result1.current.idx).toBe(1);
			expect(result2.current.idx).toBe(0);

			act(() => {
				result2.current.next();
				result2.current.next();
			});

			expect(result1.current.idx).toBe(1);
			expect(result2.current.idx).toBe(2);
		});
	});

	describe("Return Values", () => {
		it("should return all expected properties", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			expect(result.current).toHaveProperty("deck");
			expect(result.current).toHaveProperty("idx");
			expect(result.current).toHaveProperty("setIdx");
			expect(result.current).toHaveProperty("start");
			expect(result.current).toHaveProperty("reactionMs");
			expect(result.current).toHaveProperty("next");
		});

		it("should return functions with correct types", () => {
			const { result } = renderHook(() => useDeck(mockDeck));

			expect(typeof result.current.setIdx).toBe("function");
			expect(typeof result.current.start).toBe("function");
			expect(typeof result.current.reactionMs).toBe("function");
			expect(typeof result.current.next).toBe("function");
		});
	});
});