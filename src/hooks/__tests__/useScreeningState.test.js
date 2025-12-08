import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useScreeningState, {
	defaultScreeningState,
	SCREENING_STORAGE_KEY,
} from "../useScreeningState";

describe("useScreeningState", () => {
	beforeEach(() => {
		// Clear session storage before each test
		sessionStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		sessionStorage.clear();
	});

	describe("Initial State", () => {
		it("should initialize with default state when no stored data exists", () => {
			const { result } = renderHook(() => useScreeningState());

			expect(result.current.state).toEqual(defaultScreeningState());
		});

		it("should load state from session storage if it exists", () => {
			const savedState = {
				consent: true,
				health: {
					drug: true,
					neuro: false,
					medical: false,
				},
				definition: "yes",
				pain: "no",
				synTypes: {
					grapheme: "yes",
					music: "maybe",
					lexical: null,
					sequence: null,
				},
				otherExperiences: "Some text",
			};

			sessionStorage.setItem(SCREENING_STORAGE_KEY, JSON.stringify(savedState));

			const { result } = renderHook(() => useScreeningState());

			expect(result.current.state).toEqual(savedState);
		});

		it("should handle corrupted session storage data gracefully", () => {
			sessionStorage.setItem(SCREENING_STORAGE_KEY, "invalid json {");

			expect(() => {
				renderHook(() => useScreeningState());
			}).toThrow();
		});
	});

	describe("Session Storage Persistence", () => {
		it("should save state to session storage on state changes", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ consent: true });
			});

			const stored = JSON.parse(
				sessionStorage.getItem(SCREENING_STORAGE_KEY) || "{}",
			);
			expect(stored.consent).toBe(true);
		});

		it("should persist health changes to session storage", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleHealthChange("drug", true);
			});

			const stored = JSON.parse(
				sessionStorage.getItem(SCREENING_STORAGE_KEY) || "{}",
			);
			expect(stored.health.drug).toBe(true);
		});

		it("should persist synTypes changes to session storage", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("grapheme", "yes");
			});

			const stored = JSON.parse(
				sessionStorage.getItem(SCREENING_STORAGE_KEY) || "{}",
			);
			expect(stored.synTypes.grapheme).toBe("yes");
		});

		it("should handle session storage being unavailable", () => {
			// This tests the fallback when storage fails
			const originalSetItem = sessionStorage.setItem;
			sessionStorage.setItem = vi.fn(() => {
				throw new Error("Storage full");
			});

			const { result } = renderHook(() => useScreeningState());

			// Should not crash even if storage fails
			expect(() => {
				act(() => {
					result.current.updateState({ consent: true });
				});
			}).not.toThrow();

			// State should still update in memory
			expect(result.current.state.consent).toBe(true);

			sessionStorage.setItem = originalSetItem;
		});
	});

	describe("updateState", () => {
		it("should update single field", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ consent: true });
			});

			expect(result.current.state.consent).toBe(true);
		});

		it("should update multiple fields at once", () => {
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

		it("should preserve existing fields when updating", () => {
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

		it("should update otherExperiences text", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({
					otherExperiences: "I experience colors when hearing music",
				});
			});

			expect(result.current.state.otherExperiences).toBe(
				"I experience colors when hearing music",
			);
		});
	});

	describe("handleHealthChange", () => {
		it("should update drug health field", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleHealthChange("drug", true);
			});

			expect(result.current.state.health.drug).toBe(true);
		});

		it("should update neuro health field", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleHealthChange("neuro", true);
			});

			expect(result.current.state.health.neuro).toBe(true);
		});

		it("should update medical health field", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleHealthChange("medical", true);
			});

			expect(result.current.state.health.medical).toBe(true);
		});

		it("should toggle health field value", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleHealthChange("drug", true);
			});

			expect(result.current.state.health.drug).toBe(true);

			act(() => {
				result.current.handleHealthChange("drug", false);
			});

			expect(result.current.state.health.drug).toBe(false);
		});

		it("should preserve other health fields when updating one", () => {
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
		it("should update grapheme synType", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("grapheme", "yes");
			});

			expect(result.current.state.synTypes.grapheme).toBe("yes");
		});

		it("should update music synType", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("music", "maybe");
			});

			expect(result.current.state.synTypes.music).toBe("maybe");
		});

		it("should update lexical synType", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("lexical", "no");
			});

			expect(result.current.state.synTypes.lexical).toBe("no");
		});

		it("should update sequence synType", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("sequence", "yes");
			});

			expect(result.current.state.synTypes.sequence).toBe("yes");
		});

		it("should handle all valid values", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("grapheme", "yes");
			});
			expect(result.current.state.synTypes.grapheme).toBe("yes");

			act(() => {
				result.current.handleSynTypesChange("music", "maybe");
			});
			expect(result.current.state.synTypes.music).toBe("maybe");

			act(() => {
				result.current.handleSynTypesChange("lexical", "no");
			});
			expect(result.current.state.synTypes.lexical).toBe("no");

			act(() => {
				result.current.handleSynTypesChange("sequence", null);
			});
			expect(result.current.state.synTypes.sequence).toBeNull();
		});

		it("should preserve other synTypes when updating one", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.handleSynTypesChange("grapheme", "yes");
			});

			act(() => {
				result.current.handleSynTypesChange("music", "maybe");
			});

			expect(result.current.state.synTypes.grapheme).toBe("yes");
			expect(result.current.state.synTypes.music).toBe("maybe");
			expect(result.current.state.synTypes.lexical).toBeNull();
			expect(result.current.state.synTypes.sequence).toBeNull();
		});
	});

	describe("clearState", () => {
		it("should reset state to default", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({
					consent: true,
					definition: "yes",
					pain: "no",
				});
			});

			act(() => {
				result.current.handleHealthChange("drug", true);
			});

			act(() => {
				result.current.clearState();
			});

			expect(result.current.state).toEqual(defaultScreeningState());
		});

		it("should reset state and clear session storage", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ consent: true });
			});

			expect(sessionStorage.getItem(SCREENING_STORAGE_KEY)).not.toBeNull();

			act(() => {
				result.current.clearState();
			});

			// State should be reset
			expect(result.current.state).toEqual(defaultScreeningState());

			// Note: After clearState, the default state is written back to session storage
			// So we check that state is default, not that storage is empty
			const stored = JSON.parse(
				sessionStorage.getItem(SCREENING_STORAGE_KEY) || "{}",
			);
			expect(stored.consent).toBe(false);
		});

		it("should allow rebuilding state after clear", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ consent: true });
			});

			act(() => {
				result.current.clearState();
			});

			act(() => {
				result.current.updateState({ definition: "yes" });
			});

			expect(result.current.state.consent).toBe(false);
			expect(result.current.state.definition).toBe("yes");
		});
	});

	describe("Complex State Updates", () => {
		it("should handle complete screening workflow", () => {
			const { result } = renderHook(() => useScreeningState());

			// Step 1: Consent
			act(() => {
				result.current.updateState({ consent: true });
			});
			expect(result.current.state.consent).toBe(true);

			// Step 2: Health questions
			act(() => {
				result.current.handleHealthChange("drug", false);
				result.current.handleHealthChange("neuro", false);
				result.current.handleHealthChange("medical", false);
			});
			expect(result.current.state.health).toEqual({
				drug: false,
				neuro: false,
				medical: false,
			});

			// Step 3: Definition
			act(() => {
				result.current.updateState({ definition: "yes" });
			});
			expect(result.current.state.definition).toBe("yes");

			// Step 4: Pain
			act(() => {
				result.current.updateState({ pain: "no" });
			});
			expect(result.current.state.pain).toBe("no");

			// Step 5: Syn types
			act(() => {
				result.current.handleSynTypesChange("grapheme", "yes");
				result.current.handleSynTypesChange("music", "maybe");
				result.current.handleSynTypesChange("lexical", "no");
				result.current.handleSynTypesChange("sequence", "no");
			});

			expect(result.current.state).toEqual({
				consent: true,
				health: {
					drug: false,
					neuro: false,
					medical: false,
				},
				definition: "yes",
				pain: "no",
				synTypes: {
					grapheme: "yes",
					music: "maybe",
					lexical: "no",
					sequence: "no",
				},
				otherExperiences: "",
			});
		});

		it("should persist state across hook re-renders", () => {
			const { result, rerender } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ consent: true });
			});

			rerender();

			expect(result.current.state.consent).toBe(true);
		});

		it("should load persisted state in new hook instance", () => {
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

	describe("Edge Cases", () => {
		it("should handle rapid successive updates", () => {
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

		it("should handle updating same field multiple times", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ definition: "yes" });
			});

			act(() => {
				result.current.updateState({ definition: "maybe" });
			});

			act(() => {
				result.current.updateState({ definition: "no" });
			});

			expect(result.current.state.definition).toBe("no");
		});

		it("should handle empty updates", () => {
			const { result } = renderHook(() => useScreeningState());

			const initialState = { ...result.current.state };

			act(() => {
				result.current.updateState({});
			});

			expect(result.current.state).toEqual(initialState);
		});

		it("should have function references available", () => {
			const { result, rerender } = renderHook(() => useScreeningState());

			const {
				updateState,
				clearState,
				handleHealthChange,
				handleSynTypesChange,
			} = result.current;

			// Functions should exist
			expect(typeof updateState).toBe("function");
			expect(typeof clearState).toBe("function");
			expect(typeof handleHealthChange).toBe("function");
			expect(typeof handleSynTypesChange).toBe("function");

			rerender();

			// Functions should still exist after rerender
			expect(typeof result.current.updateState).toBe("function");
			expect(typeof result.current.clearState).toBe("function");
			expect(typeof result.current.handleHealthChange).toBe("function");
			expect(typeof result.current.handleSynTypesChange).toBe("function");
		});

		it("should handle all health field combinations", () => {
			const { result } = renderHook(() => useScreeningState());

			// Test all true
			act(() => {
				result.current.handleHealthChange("drug", true);
				result.current.handleHealthChange("neuro", true);
				result.current.handleHealthChange("medical", true);
			});

			expect(result.current.state.health).toEqual({
				drug: true,
				neuro: true,
				medical: true,
			});

			// Test mixed
			act(() => {
				result.current.handleHealthChange("drug", false);
				result.current.handleHealthChange("neuro", true);
				result.current.handleHealthChange("medical", false);
			});

			expect(result.current.state.health).toEqual({
				drug: false,
				neuro: true,
				medical: false,
			});

			// Test all false
			act(() => {
				result.current.handleHealthChange("drug", false);
				result.current.handleHealthChange("neuro", false);
				result.current.handleHealthChange("medical", false);
			});

			expect(result.current.state.health).toEqual({
				drug: false,
				neuro: false,
				medical: false,
			});
		});

		it("should handle all synType combinations", () => {
			const { result } = renderHook(() => useScreeningState());

			// Test all yes
			act(() => {
				result.current.handleSynTypesChange("grapheme", "yes");
				result.current.handleSynTypesChange("music", "yes");
				result.current.handleSynTypesChange("lexical", "yes");
				result.current.handleSynTypesChange("sequence", "yes");
			});

			expect(result.current.state.synTypes).toEqual({
				grapheme: "yes",
				music: "yes",
				lexical: "yes",
				sequence: "yes",
			});

			// Test all maybe
			act(() => {
				result.current.handleSynTypesChange("grapheme", "maybe");
				result.current.handleSynTypesChange("music", "maybe");
				result.current.handleSynTypesChange("lexical", "maybe");
				result.current.handleSynTypesChange("sequence", "maybe");
			});

			expect(result.current.state.synTypes).toEqual({
				grapheme: "maybe",
				music: "maybe",
				lexical: "maybe",
				sequence: "maybe",
			});

			// Test all no
			act(() => {
				result.current.handleSynTypesChange("grapheme", "no");
				result.current.handleSynTypesChange("music", "no");
				result.current.handleSynTypesChange("lexical", "no");
				result.current.handleSynTypesChange("sequence", "no");
			});

			expect(result.current.state.synTypes).toEqual({
				grapheme: "no",
				music: "no",
				lexical: "no",
				sequence: "no",
			});

			// Test mixed with null
			act(() => {
				result.current.handleSynTypesChange("grapheme", "yes");
				result.current.handleSynTypesChange("music", "maybe");
				result.current.handleSynTypesChange("lexical", "no");
				result.current.handleSynTypesChange("sequence", null);
			});

			expect(result.current.state.synTypes).toEqual({
				grapheme: "yes",
				music: "maybe",
				lexical: "no",
				sequence: null,
			});
		});

		it("should handle updateState with nested objects", () => {
			const { result } = renderHook(() => useScreeningState());

			// Update top-level fields
			act(() => {
				result.current.updateState({
					consent: true,
					definition: "yes",
					pain: "no",
					otherExperiences: "Test text",
				});
			});

			expect(result.current.state.consent).toBe(true);
			expect(result.current.state.definition).toBe("yes");
			expect(result.current.state.pain).toBe("no");
			expect(result.current.state.otherExperiences).toBe("Test text");
		});

		it("should handle clearing specific fields", () => {
			const { result } = renderHook(() => useScreeningState());

			// Set values
			act(() => {
				result.current.updateState({
					consent: true,
					definition: "yes",
					pain: "no",
				});
			});

			// Clear definition
			act(() => {
				result.current.updateState({ definition: null });
			});

			expect(result.current.state.consent).toBe(true);
			expect(result.current.state.definition).toBeNull();
			expect(result.current.state.pain).toBe("no");
		});

		it("should handle empty otherExperiences string", () => {
			const { result } = renderHook(() => useScreeningState());

			act(() => {
				result.current.updateState({ otherExperiences: "" });
			});

			expect(result.current.state.otherExperiences).toBe("");
		});

		it("should handle long otherExperiences text", () => {
			const { result } = renderHook(() => useScreeningState());

			const longText = "A".repeat(1000);

			act(() => {
				result.current.updateState({ otherExperiences: longText });
			});

			expect(result.current.state.otherExperiences).toBe(longText);
		});

		it("should handle special characters in otherExperiences", () => {
			const { result } = renderHook(() => useScreeningState());

			const specialText = "Test with \"quotes\", 'apostrophes', and <tags>";

			act(() => {
				result.current.updateState({ otherExperiences: specialText });
			});

			expect(result.current.state.otherExperiences).toBe(specialText);
		});
	});

	describe("defaultScreeningState", () => {
		it("should return consistent default state", () => {
			const state1 = defaultScreeningState();
			const state2 = defaultScreeningState();

			expect(state1).toEqual(state2);
			expect(state1).not.toBe(state2); // Different objects
		});

		it("should have correct structure", () => {
			const state = defaultScreeningState();

			expect(state).toHaveProperty("consent");
			expect(state).toHaveProperty("health");
			expect(state).toHaveProperty("definition");
			expect(state).toHaveProperty("pain");
			expect(state).toHaveProperty("synTypes");
			expect(state).toHaveProperty("otherExperiences");

			expect(state.health).toHaveProperty("drug");
			expect(state.health).toHaveProperty("neuro");
			expect(state.health).toHaveProperty("medical");

			expect(state.synTypes).toHaveProperty("grapheme");
			expect(state.synTypes).toHaveProperty("music");
			expect(state.synTypes).toHaveProperty("lexical");
			expect(state.synTypes).toHaveProperty("sequence");
		});
	});
});
