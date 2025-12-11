import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useStepTimer from "../useStepTimer";

describe("useStepTimer", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2024-01-15T10:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("startStep", () => {
		it("records start time for a step", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			const timingData = result.current.getTimingData();
			expect(timingData.steps.consent).toBeDefined();
			expect(timingData.steps.consent.started_at).toBe(
				"2024-01-15T10:00:00.000Z",
			);
		});

		it("sets screening start time on first step", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			const timingData = result.current.getTimingData();
			expect(timingData.screening_started_at).toBe("2024-01-15T10:00:00.000Z");
		});

		it("does not reset start time if step is revisited", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			// Advance time and revisit step
			act(() => {
				vi.advanceTimersByTime(5000);
				result.current.startStep(0);
			});

			const timingData = result.current.getTimingData();
			// Should still be original start time
			expect(timingData.steps.consent.started_at).toBe(
				"2024-01-15T10:00:00.000Z",
			);
		});

		it("sets active step", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(1);
			});

			expect(result.current.activeStep).toBe(1);
		});

		it("can start multiple steps", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			act(() => {
				vi.advanceTimersByTime(1000);
				result.current.startStep(1);
			});

			const timingData = result.current.getTimingData();
			expect(timingData.steps.consent).toBeDefined();
			expect(timingData.steps.definition).toBeDefined();
			expect(timingData.steps.definition.started_at).toBe(
				"2024-01-15T10:00:01.000Z",
			);
		});
	});

	describe("completeStep", () => {
		it("records end time for a step", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			act(() => {
				vi.advanceTimersByTime(3000);
				result.current.completeStep(0);
			});

			const timingData = result.current.getTimingData();
			expect(timingData.steps.consent.completed_at).toBe(
				"2024-01-15T10:00:03.000Z",
			);
		});

		it("calculates duration for completed step", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			act(() => {
				vi.advanceTimersByTime(5000);
				result.current.completeStep(0);
			});

			const timingData = result.current.getTimingData();
			expect(timingData.steps.consent.duration_ms).toBe(5000);
		});

		it("clears active step when completed", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			expect(result.current.activeStep).toBe(0);

			act(() => {
				result.current.completeStep(0);
			});

			expect(result.current.activeStep).toBeNull();
		});

		it("does not clear active step if different step is completed", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(1);
			});

			act(() => {
				result.current.completeStep(0);
			});

			expect(result.current.activeStep).toBe(1);
		});
	});

	describe("getStepDuration", () => {
		it("returns null for step that was never started", () => {
			const { result } = renderHook(() => useStepTimer());

			expect(result.current.getStepDuration(0)).toBeNull();
		});

		it("returns current duration for in-progress step", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			act(() => {
				vi.advanceTimersByTime(2000);
			});

			expect(result.current.getStepDuration(0)).toBe(2000);
		});

		it("returns final duration for completed step", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			act(() => {
				vi.advanceTimersByTime(4000);
				result.current.completeStep(0);
			});

			// Advance time more - duration should not change
			act(() => {
				vi.advanceTimersByTime(10000);
			});

			expect(result.current.getStepDuration(0)).toBe(4000);
		});
	});

	describe("getTotalDuration", () => {
		it("returns null if screening not started", () => {
			const { result } = renderHook(() => useStepTimer());

			expect(result.current.getTotalDuration()).toBeNull();
		});

		it("returns total duration from first step", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			act(() => {
				vi.advanceTimersByTime(10000);
			});

			expect(result.current.getTotalDuration()).toBe(10000);
		});

		it("continues counting after steps are completed", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			act(() => {
				vi.advanceTimersByTime(5000);
				result.current.completeStep(0);
			});

			act(() => {
				vi.advanceTimersByTime(5000);
			});

			expect(result.current.getTotalDuration()).toBe(10000);
		});
	});

	describe("getTimingData", () => {
		it("returns complete timing data structure", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			act(() => {
				vi.advanceTimersByTime(2000);
				result.current.completeStep(0);
				result.current.startStep(1);
			});

			act(() => {
				vi.advanceTimersByTime(3000);
				result.current.completeStep(1);
			});

			const timingData = result.current.getTimingData();

			expect(timingData).toEqual({
				screening_started_at: "2024-01-15T10:00:00.000Z",
				total_duration_ms: 5000,
				steps: {
					consent: {
						step_num: 0,
						started_at: "2024-01-15T10:00:00.000Z",
						completed_at: "2024-01-15T10:00:02.000Z",
						duration_ms: 2000,
					},
					definition: {
						step_num: 1,
						started_at: "2024-01-15T10:00:02.000Z",
						completed_at: "2024-01-15T10:00:05.000Z",
						duration_ms: 3000,
					},
				},
			});
		});

		it("returns null values for incomplete steps", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			const timingData = result.current.getTimingData();

			expect(timingData.steps.consent.completed_at).toBeNull();
			expect(timingData.steps.consent.duration_ms).toBeNull();
		});

		it("uses correct step names mapping", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
				result.current.startStep(1);
				result.current.startStep(2);
				result.current.startStep(3);
			});

			const timingData = result.current.getTimingData();

			expect(timingData.steps.consent).toBeDefined();
			expect(timingData.steps.definition).toBeDefined();
			expect(timingData.steps.types).toBeDefined();
			expect(timingData.steps.results).toBeDefined();
		});

		it("returns empty steps object if no steps started", () => {
			const { result } = renderHook(() => useStepTimer());

			const timingData = result.current.getTimingData();

			expect(timingData.steps).toEqual({});
			expect(timingData.screening_started_at).toBeNull();
			expect(timingData.total_duration_ms).toBeNull();
		});
	});

	describe("formatDuration", () => {
		it("returns -- for null input", () => {
			const { result } = renderHook(() => useStepTimer());

			expect(result.current.formatDuration(null)).toBe("--");
		});

		it("returns -- for undefined input", () => {
			const { result } = renderHook(() => useStepTimer());

			expect(result.current.formatDuration(undefined)).toBe("--");
		});

		it("formats seconds only for durations under a minute", () => {
			const { result } = renderHook(() => useStepTimer());

			expect(result.current.formatDuration(5000)).toBe("5s");
			expect(result.current.formatDuration(45000)).toBe("45s");
			expect(result.current.formatDuration(59000)).toBe("59s");
		});

		it("formats minutes and seconds for durations over a minute", () => {
			const { result } = renderHook(() => useStepTimer());

			expect(result.current.formatDuration(60000)).toBe("1m 0s");
			expect(result.current.formatDuration(90000)).toBe("1m 30s");
			expect(result.current.formatDuration(150000)).toBe("2m 30s");
		});

		it("handles zero duration", () => {
			const { result } = renderHook(() => useStepTimer());

			expect(result.current.formatDuration(0)).toBe("0s");
		});

		it("floors partial seconds", () => {
			const { result } = renderHook(() => useStepTimer());

			expect(result.current.formatDuration(5500)).toBe("5s");
			expect(result.current.formatDuration(5999)).toBe("5s");
		});
	});

	describe("resetTimer", () => {
		it("clears all timing data", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
				result.current.completeStep(0);
				result.current.startStep(1);
			});

			act(() => {
				result.current.resetTimer();
			});

			const timingData = result.current.getTimingData();

			expect(timingData.screening_started_at).toBeNull();
			expect(timingData.total_duration_ms).toBeNull();
			expect(timingData.steps).toEqual({});
		});

		it("clears active step", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			expect(result.current.activeStep).toBe(0);

			act(() => {
				result.current.resetTimer();
			});

			expect(result.current.activeStep).toBeNull();
		});

		it("allows starting fresh after reset", () => {
			const { result } = renderHook(() => useStepTimer());

			act(() => {
				result.current.startStep(0);
			});

			act(() => {
				vi.advanceTimersByTime(5000);
				result.current.resetTimer();
			});

			// Set new time for fresh start
			act(() => {
				vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
				result.current.startStep(0);
			});

			const timingData = result.current.getTimingData();
			expect(timingData.screening_started_at).toBe("2024-01-15T12:00:00.000Z");
		});
	});

	describe("full screening flow simulation", () => {
		it("tracks complete 4-step screening flow", () => {
			const { result } = renderHook(() => useStepTimer());

			// Step 0: Consent (30 seconds)
			act(() => {
				result.current.startStep(0);
			});
			act(() => {
				vi.advanceTimersByTime(30000);
				result.current.completeStep(0);
			});

			// Step 1: Definition (45 seconds)
			act(() => {
				result.current.startStep(1);
			});
			act(() => {
				vi.advanceTimersByTime(45000);
				result.current.completeStep(1);
			});

			// Step 2: Types (60 seconds)
			act(() => {
				result.current.startStep(2);
			});
			act(() => {
				vi.advanceTimersByTime(60000);
				result.current.completeStep(2);
			});

			// Step 3: Results (15 seconds)
			act(() => {
				result.current.startStep(3);
			});
			act(() => {
				vi.advanceTimersByTime(15000);
				result.current.completeStep(3);
			});

			const timingData = result.current.getTimingData();

			expect(timingData.steps.consent.duration_ms).toBe(30000);
			expect(timingData.steps.definition.duration_ms).toBe(45000);
			expect(timingData.steps.types.duration_ms).toBe(60000);
			expect(timingData.steps.results.duration_ms).toBe(15000);
			expect(timingData.total_duration_ms).toBe(150000); // 2m 30s total
		});
	});
});
