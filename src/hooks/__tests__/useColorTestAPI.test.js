/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { colorTestService } from "../../services/colorTest";
import { useColorTestAPI } from "../useColorTestAPI";

// Mock the colorTestService
vi.mock("../../services/colorTest", () => ({
	colorTestService: {
		submitTrial: vi.fn(),
		submitBatch: vi.fn(),
	},
}));

describe("useColorTestAPI", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		console.error.mockRestore();
	});

	describe("Initial State", () => {
		it("should initialize with correct default values", () => {
			const { result } = renderHook(() => useColorTestAPI());

			expect(result.current.isSubmitting).toBe(false);
			expect(result.current.error).toBeNull();
			expect(typeof result.current.submitTrial).toBe("function");
			expect(typeof result.current.submitBatch).toBe("function");
		});
	});

	describe("submitTrial", () => {
		it("should successfully submit a trial", async () => {
			const mockResponse = { success: true, id: 123 };
			colorTestService.submitTrial.mockResolvedValue(mockResponse);

			const { result } = renderHook(() => useColorTestAPI());

			const trialData = {
				stimulus: "C4",
				selectedColor: { r: 255, g: 0, b: 0 },
				reactionTime: 1500,
			};

			let response;
			await act(async () => {
				response = await result.current.submitTrial(trialData);
			});

			expect(response).toEqual(mockResponse);
			expect(colorTestService.submitTrial).toHaveBeenCalledWith(trialData);
			expect(result.current.isSubmitting).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("should set isSubmitting to true during submission", async () => {
			colorTestService.submitTrial.mockImplementation(
				() => new Promise((resolve) => setTimeout(resolve, 100)),
			);

			const { result } = renderHook(() => useColorTestAPI());

			const trialData = { stimulus: "C4" };

			act(() => {
				result.current.submitTrial(trialData);
			});

			expect(result.current.isSubmitting).toBe(true);
		});

		it("should handle submission errors", async () => {
			const mockError = new Error("Network error");
			colorTestService.submitTrial.mockRejectedValue(mockError);

			const { result } = renderHook(() => useColorTestAPI());

			const trialData = { stimulus: "C4" };

			// Call and let error be thrown
			let caughtError;
			await act(async () => {
				try {
					await result.current.submitTrial(trialData);
				} catch (e) {
					caughtError = e;
				}
			});

			// Verify error was caught
			expect(caughtError).toBeDefined();
			expect(caughtError.message).toBe("Network error");

			// Verify state was updated
			await waitFor(() => {
				expect(result.current.error).toBe("Network error");
				expect(result.current.isSubmitting).toBe(false);
			});

			// Verify console.error was called
			expect(console.error).toHaveBeenCalledWith(
				"Error submitting trial:",
				mockError,
			);
		});

		it("should handle errors without message", async () => {
			const mockError = { status: 500 };
			colorTestService.submitTrial.mockRejectedValue(mockError);

			const { result } = renderHook(() => useColorTestAPI());

			const trialData = { stimulus: "C4" };

			let caughtError;
			await act(async () => {
				try {
					await result.current.submitTrial(trialData);
				} catch (e) {
					caughtError = e;
				}
			});

			expect(caughtError).toBeDefined();

			await waitFor(() => {
				expect(result.current.error).toBe("Failed to save trial");
				expect(result.current.isSubmitting).toBe(false);
			});
		});

		it("should clear previous errors before new submission", async () => {
			const mockError = new Error("First error");
			colorTestService.submitTrial
				.mockRejectedValueOnce(mockError)
				.mockResolvedValueOnce({ success: true });

			const { result } = renderHook(() => useColorTestAPI());

			// First submission fails
			await act(async () => {
				try {
					await result.current.submitTrial({ stimulus: "C4" });
				} catch (_e) {
					// Expected
				}
			});

			await waitFor(() => {
				expect(result.current.error).toBe("First error");
			});

			// Second submission succeeds and clears error
			await act(async () => {
				await result.current.submitTrial({ stimulus: "D4" });
			});

			expect(result.current.error).toBeNull();
		});

		it("should log errors to console", async () => {
			const mockError = new Error("Test error");
			colorTestService.submitTrial.mockRejectedValue(mockError);

			const { result } = renderHook(() => useColorTestAPI());

			await act(async () => {
				try {
					await result.current.submitTrial({ stimulus: "C4" });
				} catch (_e) {
					// Expected
				}
			});

			await waitFor(() => {
				expect(console.error).toHaveBeenCalledWith(
					"Error submitting trial:",
					mockError,
				);
			});
		});
	});

	describe("submitBatch", () => {
		it("should successfully submit a batch of trials", async () => {
			const mockResponse = { success: true, count: 3 };
			colorTestService.submitBatch.mockResolvedValue(mockResponse);

			const { result } = renderHook(() => useColorTestAPI());

			const trials = [
				{ stimulus: "C4", selectedColor: { r: 255, g: 0, b: 0 } },
				{ stimulus: "D4", selectedColor: { r: 0, g: 255, b: 0 } },
				{ stimulus: "E4", selectedColor: { r: 0, g: 0, b: 255 } },
			];
			const testType = "music";

			let response;
			await act(async () => {
				response = await result.current.submitBatch(trials, testType);
			});

			expect(response).toEqual(mockResponse);
			expect(colorTestService.submitBatch).toHaveBeenCalledWith(
				trials,
				testType,
			);
			expect(result.current.isSubmitting).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("should set isSubmitting to true during batch submission", async () => {
			colorTestService.submitBatch.mockImplementation(
				() => new Promise((resolve) => setTimeout(resolve, 100)),
			);

			const { result } = renderHook(() => useColorTestAPI());

			const trials = [{ stimulus: "C4" }];
			const testType = "music";

			act(() => {
				result.current.submitBatch(trials, testType);
			});

			expect(result.current.isSubmitting).toBe(true);
		});

		it("should handle batch submission errors", async () => {
			const mockError = new Error("Database error");
			colorTestService.submitBatch.mockRejectedValue(mockError);

			const { result } = renderHook(() => useColorTestAPI());

			const trials = [{ stimulus: "C4" }];
			const testType = "music";

			let caughtError;
			await act(async () => {
				try {
					await result.current.submitBatch(trials, testType);
				} catch (e) {
					caughtError = e;
				}
			});

			expect(caughtError).toBeDefined();

			await waitFor(() => {
				expect(result.current.error).toBe("Database error");
				expect(result.current.isSubmitting).toBe(false);
			});
		});

		it("should handle batch errors without message", async () => {
			const mockError = { status: 503 };
			colorTestService.submitBatch.mockRejectedValue(mockError);

			const { result } = renderHook(() => useColorTestAPI());

			const trials = [{ stimulus: "C4" }];
			const testType = "music";

			let caughtError;
			await act(async () => {
				try {
					await result.current.submitBatch(trials, testType);
				} catch (e) {
					caughtError = e;
				}
			});

			expect(caughtError).toBeDefined();

			await waitFor(() => {
				expect(result.current.error).toBe("Failed to save trials");
				expect(result.current.isSubmitting).toBe(false);
			});
		});

		it("should clear previous errors before new batch submission", async () => {
			const mockError = new Error("Batch error");
			colorTestService.submitBatch
				.mockRejectedValueOnce(mockError)
				.mockResolvedValueOnce({ success: true });

			const { result } = renderHook(() => useColorTestAPI());

			const trials = [{ stimulus: "C4" }];
			const testType = "music";

			// First submission fails
			await act(async () => {
				try {
					await result.current.submitBatch(trials, testType);
				} catch (_e) {
					// Expected
				}
			});

			await waitFor(() => {
				expect(result.current.error).toBe("Batch error");
			});

			// Second submission succeeds and clears error
			await act(async () => {
				await result.current.submitBatch(trials, testType);
			});

			expect(result.current.error).toBeNull();
		});

		it("should log batch errors to console", async () => {
			const mockError = new Error("Batch test error");
			colorTestService.submitBatch.mockRejectedValue(mockError);

			const { result } = renderHook(() => useColorTestAPI());

			await act(async () => {
				try {
					await result.current.submitBatch([{ stimulus: "C4" }], "music");
				} catch (_e) {
					// Expected
				}
			});

			await waitFor(() => {
				expect(console.error).toHaveBeenCalledWith(
					"Error submitting batch:",
					mockError,
				);
			});
		});
	});

	describe("Error State Management", () => {
		it("should maintain error state across hook calls", async () => {
			const mockError = new Error("Persistent error");
			colorTestService.submitTrial.mockRejectedValue(mockError);

			const { result } = renderHook(() => useColorTestAPI());

			await act(async () => {
				try {
					await result.current.submitTrial({ stimulus: "C4" });
				} catch (_e) {
					// Expected
				}
			});

			await waitFor(() => {
				expect(result.current.error).toBe("Persistent error");
			});

			// Error should still be there
			expect(result.current.error).toBe("Persistent error");
		});
	});

	describe("Concurrent Submissions", () => {
		it("should handle rapid successive submissions", async () => {
			colorTestService.submitTrial.mockResolvedValue({ success: true });

			const { result } = renderHook(() => useColorTestAPI());

			await act(async () => {
				await result.current.submitTrial({ stimulus: "C4" });
				await result.current.submitTrial({ stimulus: "D4" });
				await result.current.submitTrial({ stimulus: "E4" });
			});

			expect(colorTestService.submitTrial).toHaveBeenCalledTimes(3);
			expect(result.current.error).toBeNull();
		});
	});
});
