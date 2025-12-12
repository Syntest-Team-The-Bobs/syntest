import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { musicPlayer } from "../../services/audioPlayer";
import { useMusicPlayer } from "../useMusicPlayer";

// Mock the musicPlayer service
vi.mock("../../services/audioPlayer", () => ({
	musicPlayer: {
		play: vi.fn(),
		stop: vi.fn(),
	},
}));

describe("useMusicPlayer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		console.error.mockRestore();
	});

	describe("Auto-play Behavior", () => {
		it("should play music when testType is music and phase is not intro", async () => {
			musicPlayer.play.mockResolvedValue();

			const current = { stimulus: "C4" };

			renderHook(() => useMusicPlayer("music", current, "testing"));

			await vi.waitFor(() => {
				expect(musicPlayer.play).toHaveBeenCalledWith("C4");
			});
		});

		it("should not play when testType is not music", async () => {
			const current = { stimulus: "A" };

			renderHook(() => useMusicPlayer("letter", current, "testing"));

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(musicPlayer.play).not.toHaveBeenCalled();
		});

		it("should not play when phase is intro", async () => {
			const current = { stimulus: "C4" };

			renderHook(() => useMusicPlayer("music", current, "intro"));

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(musicPlayer.play).not.toHaveBeenCalled();
		});

		it("should not play when phase is done", async () => {
			const current = { stimulus: "C4" };

			renderHook(() => useMusicPlayer("music", current, "done"));

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(musicPlayer.play).not.toHaveBeenCalled();
		});

		it("should play when phase is practice", async () => {
			musicPlayer.play.mockResolvedValue();

			const current = { stimulus: "D4" };

			renderHook(() => useMusicPlayer("music", current, "practice"));

			await vi.waitFor(() => {
				expect(musicPlayer.play).toHaveBeenCalledWith("D4");
			});
		});

		it("should play when phase is testing", async () => {
			musicPlayer.play.mockResolvedValue();

			const current = { stimulus: "E4" };

			renderHook(() => useMusicPlayer("music", current, "testing"));

			await vi.waitFor(() => {
				expect(musicPlayer.play).toHaveBeenCalledWith("E4");
			});
		});

		it("should not play when current is null", async () => {
			renderHook(() => useMusicPlayer("music", null, "testing"));

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(musicPlayer.play).not.toHaveBeenCalled();
		});

		it("should not play when current is undefined", async () => {
			renderHook(() => useMusicPlayer("music", undefined, "testing"));

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(musicPlayer.play).not.toHaveBeenCalled();
		});
	});

	describe("Stimulus Changes", () => {
		it("should play new stimulus when current changes", async () => {
			musicPlayer.play.mockResolvedValue();

			const { rerender } = renderHook(
				({ testType, current, phase }) =>
					useMusicPlayer(testType, current, phase),
				{
					initialProps: {
						testType: "music",
						current: { stimulus: "C4" },
						phase: "testing",
					},
				},
			);

			await vi.waitFor(() => {
				expect(musicPlayer.play).toHaveBeenCalledWith("C4");
			});

			musicPlayer.play.mockClear();

			rerender({
				testType: "music",
				current: { stimulus: "D4" },
				phase: "testing",
			});

			await vi.waitFor(() => {
				expect(musicPlayer.play).toHaveBeenCalledWith("D4");
			});
		});

		it("should not replay same stimulus if current does not change", async () => {
			musicPlayer.play.mockResolvedValue();

			const current = { stimulus: "C4" };

			const { rerender } = renderHook(
				({ testType, current, phase }) =>
					useMusicPlayer(testType, current, phase),
				{
					initialProps: {
						testType: "music",
						current,
						phase: "testing",
					},
				},
			);

			await vi.waitFor(() => {
				expect(musicPlayer.play).toHaveBeenCalledTimes(1);
			});

			musicPlayer.play.mockClear();

			rerender({
				testType: "music",
				current,
				phase: "testing",
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(musicPlayer.play).not.toHaveBeenCalled();
		});

		it("should handle testType changes", async () => {
			musicPlayer.play.mockResolvedValue();

			const current = { stimulus: "C4" };

			const { rerender, unmount } = renderHook(
				({ testType, current, phase }) =>
					useMusicPlayer(testType, current, phase),
				{
					initialProps: {
						testType: "music",
						current,
						phase: "testing",
					},
				},
			);

			await vi.waitFor(() => {
				expect(musicPlayer.play).toHaveBeenCalledWith("C4");
			});

			rerender({
				testType: "letter",
				current,
				phase: "testing",
			});

			// When unmounting, stop should be called due to cleanup effect
			unmount();

			expect(musicPlayer.stop).toHaveBeenCalled();
		});
	});

	describe("Phase Transitions", () => {
		it("should stop playing when transitioning to intro phase", async () => {
			musicPlayer.play.mockResolvedValue();

			const current = { stimulus: "C4" };

			const { rerender } = renderHook(
				({ testType, current, phase }) =>
					useMusicPlayer(testType, current, phase),
				{
					initialProps: {
						testType: "music",
						current,
						phase: "testing",
					},
				},
			);

			await vi.waitFor(() => {
				expect(musicPlayer.play).toHaveBeenCalled();
			});

			musicPlayer.play.mockClear();

			rerender({
				testType: "music",
				current,
				phase: "intro",
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(musicPlayer.play).not.toHaveBeenCalled();
		});

		it("should stop playing when transitioning to done phase", async () => {
			musicPlayer.play.mockResolvedValue();

			const current = { stimulus: "C4" };

			const { rerender } = renderHook(
				({ testType, current, phase }) =>
					useMusicPlayer(testType, current, phase),
				{
					initialProps: {
						testType: "music",
						current,
						phase: "testing",
					},
				},
			);

			await vi.waitFor(() => {
				expect(musicPlayer.play).toHaveBeenCalled();
			});

			musicPlayer.play.mockClear();

			rerender({
				testType: "music",
				current,
				phase: "done",
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(musicPlayer.play).not.toHaveBeenCalled();
		});
	});

	describe("Error Handling", () => {
		it("should handle play errors gracefully", async () => {
			const playError = new Error("Failed to load audio");
			musicPlayer.play.mockRejectedValue(playError);

			const current = { stimulus: "C4" };

			renderHook(() => useMusicPlayer("music", current, "testing"));

			await vi.waitFor(() => {
				expect(console.error).toHaveBeenCalledWith(
					"Failed to play audio:",
					playError,
				);
			});
		});

		it("should handle replay errors gracefully", async () => {
			const replayError = new Error("Replay failed");
			musicPlayer.play.mockRejectedValue(replayError);

			const current = { stimulus: "C4" };

			const { result } = renderHook(() =>
				useMusicPlayer("music", current, "testing"),
			);

			await act(async () => {
				await result.current.handleReplay();
			});

			expect(console.error).toHaveBeenCalledWith(
				"Failed to play audio:",
				replayError,
			);
		});
	});

	describe("Cleanup", () => {
		it("should call stop on unmount when testType is music", () => {
			const current = { stimulus: "C4" };

			const { unmount } = renderHook(() =>
				useMusicPlayer("music", current, "testing"),
			);

			unmount();

			expect(musicPlayer.stop).toHaveBeenCalled();
		});

		it("should not call stop on unmount when testType is not music", () => {
			const current = { stimulus: "A" };

			const { unmount } = renderHook(() =>
				useMusicPlayer("letter", current, "testing"),
			);

			unmount();

			expect(musicPlayer.stop).not.toHaveBeenCalled();
		});

		it("should call stop on testType change from music to non-music", () => {
			const current = { stimulus: "C4" };

			const { rerender, unmount } = renderHook(
				({ testType, current, phase }) =>
					useMusicPlayer(testType, current, phase),
				{
					initialProps: {
						testType: "music",
						current,
						phase: "testing",
					},
				},
			);

			rerender({
				testType: "letter",
				current,
				phase: "testing",
			});

			unmount();

			expect(musicPlayer.stop).toHaveBeenCalled();
		});
	});

	describe("handleReplay Function", () => {
		it("should return handleReplay function", () => {
			const current = { stimulus: "C4" };

			const { result } = renderHook(() =>
				useMusicPlayer("music", current, "testing"),
			);

			expect(typeof result.current.handleReplay).toBe("function");
		});

		it("should replay current stimulus when called", async () => {
			musicPlayer.play.mockResolvedValue();

			const current = { stimulus: "C4" };

			const { result } = renderHook(() =>
				useMusicPlayer("music", current, "testing"),
			);

			await vi.waitFor(() => {
				expect(musicPlayer.play).toHaveBeenCalledWith("C4");
			});

			musicPlayer.play.mockClear();

			await act(async () => {
				await result.current.handleReplay();
			});

			expect(musicPlayer.play).toHaveBeenCalledWith("C4");
		});

		it("should not replay when testType is not music", async () => {
			const current = { stimulus: "A" };

			const { result } = renderHook(() =>
				useMusicPlayer("letter", current, "testing"),
			);

			await act(async () => {
				await result.current.handleReplay();
			});

			expect(musicPlayer.play).not.toHaveBeenCalled();
		});

		it("should not replay when current is null", async () => {
			const { result } = renderHook(() =>
				useMusicPlayer("music", null, "testing"),
			);

			await act(async () => {
				await result.current.handleReplay();
			});

			expect(musicPlayer.play).not.toHaveBeenCalled();
		});

		it("should maintain stable reference across renders", () => {
			const current = { stimulus: "C4" };

			const { result, rerender } = renderHook(
				({ testType, current, phase }) =>
					useMusicPlayer(testType, current, phase),
				{
					initialProps: {
						testType: "music",
						current,
						phase: "testing",
					},
				},
			);

			const firstCallback = result.current.handleReplay;

			rerender({
				testType: "music",
				current,
				phase: "testing",
			});

			const secondCallback = result.current.handleReplay;

			expect(firstCallback).toBe(secondCallback);
		});

		it("should update when dependencies change", () => {
			const firstCurrent = { stimulus: "C4" };
			const secondCurrent = { stimulus: "D4" };

			const { result, rerender } = renderHook(
				({ testType, current, phase }) =>
					useMusicPlayer(testType, current, phase),
				{
					initialProps: {
						testType: "music",
						current: firstCurrent,
						phase: "testing",
					},
				},
			);

			const firstCallback = result.current.handleReplay;

			rerender({
				testType: "music",
				current: secondCurrent,
				phase: "testing",
			});

			const secondCallback = result.current.handleReplay;

			expect(firstCallback).not.toBe(secondCallback);
		});
	});

	describe("Multiple Test Types", () => {
		it("should handle letter test type", () => {
			const current = { stimulus: "A" };

			const { result } = renderHook(() =>
				useMusicPlayer("letter", current, "testing"),
			);

			expect(result.current.handleReplay).toBeDefined();
			expect(musicPlayer.play).not.toHaveBeenCalled();
		});

		it("should handle number test type", () => {
			const current = { stimulus: "5" };

			const { result } = renderHook(() =>
				useMusicPlayer("number", current, "testing"),
			);

			expect(result.current.handleReplay).toBeDefined();
			expect(musicPlayer.play).not.toHaveBeenCalled();
		});

		it("should handle word test type", () => {
			const current = { stimulus: "hello" };

			const { result } = renderHook(() =>
				useMusicPlayer("word", current, "testing"),
			);

			expect(result.current.handleReplay).toBeDefined();
			expect(musicPlayer.play).not.toHaveBeenCalled();
		});
	});
});
