import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useScreeningState, {
	defaultScreeningState,
	SCREENING_STORAGE_KEY,
} from "../useScreeningState";

describe("useScreeningState", () => {
	beforeEach(() => {
		window.sessionStorage.clear();
<<<<<<< HEAD
		vi.clearAllMocks();
	});

	afterEach(() => {
		window.sessionStorage.clear();
	});

	describe("Initial State", () => {
		it("initializes with default state when storage is empty", () => {
			const { result } = renderHook(() => useScreeningState());
			expect(result.current.state).toEqual(defaultScreeningState());
		});

		it("loads state from sessionStorage if it exists", () => {
			const savedState = {
				...defaultScreeningState(),
				consent: true,
				definition: "yes",
			};
			window.sessionStorage.setItem(
				SCREENING_STORAGE_KEY,
				JSON.stringify(savedState),
			);

			const { result } = renderHook(() => useScreeningState());
			expect(result.current.state.consent).toBe(true);
			expect(result.current.state.definition).toBe("yes");
		});
	});

	describe("Session Storage Persistence", () => {
		it("persists updates to sessionStorage", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleHealthChange("drug", true);
			});

			expect(result.current.state.health.drug).toBe(true);

			const stored = JSON.parse(
				window.sessionStorage.getItem(SCREENING_STORAGE_KEY),
			);
			expect(stored.health.drug).toBe(true);
		});

		it("persists synTypes changes to sessionStorage", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("grapheme", "yes");
			});

			const stored = JSON.parse(
				window.sessionStorage.getItem(SCREENING_STORAGE_KEY),
			);
			expect(stored.synTypes.grapheme).toBe("yes");
		});
	});

	describe("updateState", () => {
		it("updates single field", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ consent: true });
			});

			expect(result.current.state.consent).toBe(true);
		});

		it("updates multiple fields at once", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({
					consent: true,
					definition: "yes",
					pain: "no",
				});
			});

			expect(result.current.state.consent).toBe(true);
			expect(result.current.state.definition).toBe("yes");
			expect(result.current.state.pain).toBe("no");
		});

		it("preserves existing fields when updating", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ consent: true });
			});

			act(() => {
				result.current.updateState({ definition: "yes" });
			});

			expect(result.current.state.consent).toBe(true);
			expect(result.current.state.definition).toBe("yes");
		});
	});

	describe("handleHealthChange", () => {
		it("updates drug health field", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleHealthChange("drug", true);
			});

			expect(result.current.state.health.drug).toBe(true);
		});

		it("updates neuro health field", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleHealthChange("neuro", true);
			});

			expect(result.current.state.health.neuro).toBe(true);
		});

		it("updates medical health field", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleHealthChange("medical", true);
			});

			expect(result.current.state.health.medical).toBe(true);
		});

		it("preserves other health fields when updating one", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleHealthChange("drug", true);
			});

			act(() => {
				result.current.handleHealthChange("neuro", true);
			});

			expect(result.current.state.health.drug).toBe(true);
			expect(result.current.state.health.neuro).toBe(true);
			expect(result.current.state.health.medical).toBe(false);
		});
	});

	describe("handleSynTypesChange", () => {
		it("updates grapheme synType", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("grapheme", "yes");
			});

			expect(result.current.state.synTypes.grapheme).toBe("yes");
		});

		it("updates music synType", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("music", "sometimes");
			});

			expect(result.current.state.synTypes.music).toBe("sometimes");
		});

		it("updates lexical synType", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("lexical", "no");
			});

			expect(result.current.state.synTypes.lexical).toBe("no");
		});

		it("updates sequence synType", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("sequence", "yes");
			});

			expect(result.current.state.synTypes.sequence).toBe("yes");
		});

		it("preserves other synTypes when updating one", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("grapheme", "yes");
			});

			act(() => {
				result.current.handleSynTypesChange("music", "sometimes");
			});

			expect(result.current.state.synTypes.grapheme).toBe("yes");
			expect(result.current.state.synTypes.music).toBe("sometimes");
			expect(result.current.state.synTypes.lexical).toBeNull();
		});
	});

	describe("clearState", () => {
		it("resets state to default", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ consent: true, definition: "yes" });
			});

			act(() => {
				result.current.clearState();
			});

			expect(result.current.state).toEqual(defaultScreeningState());
		});

		it("removes item from sessionStorage then repopulates with defaults", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ consent: true });
			});

			expect(
				window.sessionStorage.getItem(SCREENING_STORAGE_KEY),
			).not.toBeNull();

			act(() => {
				result.current.clearState();
			});

			// After clearState, the default state is written back via useEffect
			const stored = JSON.parse(
				window.sessionStorage.getItem(SCREENING_STORAGE_KEY),
			);
			expect(stored).toEqual(defaultScreeningState());
		});
	});

	describe("defaultScreeningState", () => {
		it("returns correct default structure", () => {
			const state = defaultScreeningState();

			expect(state.consent).toBe(false);
			expect(state.health).toEqual({
				drug: false,
				neuro: false,
				medical: false,
			});
			expect(state.definition).toBeNull();
			expect(state.pain).toBeNull();
			expect(state.synTypes).toEqual({
				grapheme: null,
				music: null,
				lexical: null,
				sequence: null,
			});
			expect(state.otherExperiences).toBe("");
		});

		it("returns a new object each time", () => {
			const state1 = defaultScreeningState();
			const state2 = defaultScreeningState();

			expect(state1).toEqual(state2);
			expect(state1).not.toBe(state2);
		});
	});

	describe("Edge Cases", () => {
		it("handles rapid successive updates", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ consent: true });
				result.current.updateState({ definition: "yes" });
				result.current.updateState({ pain: "no" });
			});

			expect(result.current.state.consent).toBe(true);
			expect(result.current.state.definition).toBe("yes");
			expect(result.current.state.pain).toBe("no");
		});

		it("handles empty updates", () => {
			const { result } = renderHook(() => useScreeningState());
			const initialState = { ...result.current.state };

			act(() => {
				result.current.updateState({});
			});

			expect(result.current.state).toEqual(initialState);
		});

		it("persists state across re-renders", () => {
			const { result, rerender } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ consent: true });
			});

			rerender();

			expect(result.current.state.consent).toBe(true);
		});

		it("loads persisted state in new hook instance", () => {
			const { result: result1 } = renderHook(() => useScreeningState());

			act(() => {
				result1.current.updateState({ consent: true, definition: "yes" });
			});

			// Create new hook instance (simulating page refresh)
			const { result: result2 } = renderHook(() => useScreeningState());

			expect(result2.current.state.consent).toBe(true);
			expect(result2.current.state.definition).toBe("yes");
		});
	});
});
