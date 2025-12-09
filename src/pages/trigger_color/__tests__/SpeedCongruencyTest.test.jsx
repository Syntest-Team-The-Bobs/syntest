import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";

const { submitTrialMock } = vi.hoisted(() => ({
	submitTrialMock: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../../../services/api.js", () => ({
	__esModule: true,
	default: {
		post: vi.fn(),
		get: vi.fn(),
	},
}));

vi.mock("../../../services/speedCongruency.js", () => ({
	__esModule: true,
	speedCongruencyService: {
		submitTrial: submitTrialMock,
	},
}));

import SpeedCongruencyTest from "../SpeedCongruencyTest";
import { musicPlayer } from "../../../services/audioPlayer.js";

vi.mock("../../../services/audioPlayer.js", () => ({
	__esModule: true,
	musicPlayer: {
		play: vi.fn(),
		stop: vi.fn(),
	},
}));

const advanceAllTimers = async () => {
	await act(async () => {}); // flush pending effects so countdown interval is set
	await act(async () => {
		await vi.advanceTimersByTimeAsync(15000);
	});
};

const advanceTimersByTimeAsync = async (ms) => {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
};

/**
 * Uses deterministic Math.random sequence to control:
 * - deck shuffling (4 calls)
 * - congruency decisions per trial
 */
const mockMathRandomSequence = (values) => {
	const seq = [...values];
	return vi.spyOn(Math, "random").mockImplementation(() => seq.shift() ?? 0);
};

describe("SpeedCongruencyTest", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.clearAllMocks();
		localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it(
		"runs through practice + main trials and reaches completion",
		async () => {
		// Sequence covers: 4 shuffles + 1 practice + 4 main congruency decisions
		mockMathRandomSequence([0, 0, 0, 0, 0.2, 0.8, 0.2, 0.8, 0.2]);

		render(<SpeedCongruencyTest />);

		// practice + 4 main trials
		for (let trial = 0; trial < 5; trial++) {
			const beginButton = screen.queryByRole("button", { name: /begin/i });
			if (beginButton) fireEvent.click(beginButton);
			await advanceAllTimers(); // move stimulus countdown/music to choices

			const yesButton = await screen.findByRole("button", { name: /^yes$/i });
			fireEvent.click(yesButton);

			await waitFor(() => expect(submitTrialMock).toHaveBeenCalledTimes(trial + 1));
		}

		await waitFor(() =>
			expect(screen.getByText(/thank you for completing/i)).toBeInTheDocument(),
		);
		},
		15000,
	);

	it("stores pending response locally when submission fails", async () => {
		submitTrialMock.mockRejectedValueOnce(new Error("network"));
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		// Deterministic order; only need first trial
		mockMathRandomSequence([0, 0, 0, 0, 0.2]);

		render(<SpeedCongruencyTest />);

		const beginButton = await screen.findByRole("button", { name: /begin/i });
		fireEvent.click(beginButton);
		await advanceAllTimers();

		const yesButton = await screen.findByRole("button", { name: /^yes$/i });
		fireEvent.click(yesButton);

		await waitFor(() =>
			expect(JSON.parse(localStorage.getItem("speedCongruency_results"))).toHaveLength(
				1,
			),
		);

		const saved = JSON.parse(localStorage.getItem("speedCongruency_results"))[0];
		expect(saved.status).toBe("pending");
		expect(saved.isCorrect).toBeDefined();
		consoleSpy.mockRestore();
	}, 15000);

	it("covers single-option fallbacks and invalid colour values", async () => {
		mockMathRandomSequence(Array(10).fill(0.2));

		const deckOverride = {
			practiceStimuli: [
				{
					id: "p1",
					expectedOptionId: "o1",
					options: [{ id: "o1", label: "P1", color: "#000000" }],
				},
		],
		stimuli: [
			{
				id: "soloPlayFail",
				expectedOptionId: "o1",
				stimulus: "C4-piano",
				trigger: "PLAY_FAIL",
				options: [{ id: "o1", label: "SOLO1", color: "#123456" }],
			},
			{
				id: "soloLoopErr",
				expectedOptionId: "o1",
				stimulus: "C4-piano",
				trigger: "__FORCE_MUSIC_LOOP_ERROR__",
				options: [{ id: "o1", label: "SOLO_LOOP", color: "#abcdef" }],
			},
			{
				id: "solo2",
				expectedOptionId: "o1",
				options: [{ id: "o1", label: "SOLO2", color: undefined }],
			},
			{
				id: "missingExpected",
				expectedOptionId: "o99",
				options: [{ id: "o1", label: "MISS", color: "#ffffff" }],
			},
		],
		};

		musicPlayer.play.mockImplementationOnce(() => {
			throw new Error("playfail");
		});

		render(<SpeedCongruencyTest deckOverride={deckOverride} />);

		// Practice trial begin
		const beginButton = screen.getByRole("button", { name: /begin/i });
		fireEvent.click(beginButton);
		await advanceAllTimers();
		fireEvent.click(await screen.findByRole("button", { name: /^yes$/i }));
		await waitFor(() =>
			expect(screen.getByRole("button", { name: /begin/i })).toBeInTheDocument(),
		);

		// Main trial 1 begin (music play throws -> inner catch)
		fireEvent.click(screen.getByRole("button", { name: /begin/i }));
		await advanceAllTimers();
		fireEvent.click(await screen.findByRole("button", { name: /^yes$/i }));

		// Main trial 2 auto-advances to stimulus (outer music catch)
		await advanceAllTimers();
		fireEvent.click(await screen.findByRole("button", { name: /^yes$/i }));

		// Main trial 3 auto-advances to stimulus (no intro) and falls back in effect
		await advanceAllTimers();
		fireEvent.click(await screen.findByRole("button", { name: /^yes$/i }));

		// Main trial 4 covers missing expected option fallback colour
		await advanceAllTimers();
		fireEvent.click(await screen.findByRole("button", { name: /^yes$/i }));

		await waitFor(() => expect(submitTrialMock).toHaveBeenCalledTimes(5));
	}, 15000);

	it("falls back to expected colour when no alternatives exist across trials", async () => {
		// Random sequence: practice begin (0.8 -> incongruent path), main trial 1 begin (0.8),
		// main trial 2 auto-advance useEffect (0.8) -> both fallback branches hit.
		mockMathRandomSequence([0.8, 0.8, 0.8]);

		const deckOverride = {
			practiceStimuli: [
				{
					id: "p1",
					expectedOptionId: "o1",
					options: [{ id: "o1", label: "P1", color: "#101010" }],
				},
			],
			stimuli: [
				{
					id: "m1",
					expectedOptionId: "o1",
					options: [{ id: "o1", label: "M1", color: "#202020" }],
				},
				{
					id: "m2",
					expectedOptionId: "o1",
					options: [{ id: "o1", label: "M2", color: "#303030" }],
				},
			],
		};

		render(<SpeedCongruencyTest deckOverride={deckOverride} />);

		// Practice: begin -> fallback in begin() due to no other options
		fireEvent.click(screen.getByRole("button", { name: /begin/i }));
		await advanceAllTimers();
		fireEvent.click(await screen.findByRole("button", { name: /^yes$/i }));
		await waitFor(() => expect(submitTrialMock).toHaveBeenCalledTimes(1));

		// Main trial 1: begin -> congruency set in begin(), still single option
		fireEvent.click(screen.getByRole("button", { name: /begin/i }));
		await advanceAllTimers();
		fireEvent.click(await screen.findByRole("button", { name: /^yes$/i }));
		await waitFor(() => expect(submitTrialMock).toHaveBeenCalledTimes(2));

		// Main trial 2: auto-advanced; useEffect sets congruency (fallback path)
		await advanceAllTimers();
		fireEvent.click(await screen.findByRole("button", { name: /^yes$/i }));
		await waitFor(() => expect(submitTrialMock).toHaveBeenCalledTimes(3));
	}, 20000);

	it("cancels music loop when unmounted mid-stimulus", async () => {
		mockMathRandomSequence([0]);
		const deckOverride = {
			practiceStimuli: [
				{
					id: "music-cancel",
					stimulus: "C4-piano",
					trigger: "MC",
					expectedOptionId: "o1",
					options: [{ id: "o1", label: "MC", color: "#111111" }],
				},
			],
			stimuli: [],
		};

		const { unmount } = render(<SpeedCongruencyTest deckOverride={deckOverride} />);
		fireEvent.click(screen.getByRole("button", { name: /begin/i }));
		await advanceTimersByTimeAsync(10);
		unmount();
		await advanceTimersByTimeAsync(6000);

		expect(musicPlayer.play).toHaveBeenCalledTimes(1);
		expect(musicPlayer.stop).toHaveBeenCalled();
	}, 15000);

	it("ignores extra clicks while submitting", async () => {
		let resolveSubmit;
		submitTrialMock.mockImplementation(
			() =>
				new Promise((res) => {
					resolveSubmit = res;
				}),
		);

		mockMathRandomSequence([0, 0, 0, 0]);
		render(<SpeedCongruencyTest />);

		fireEvent.click(screen.getByRole("button", { name: /begin/i }));
		await advanceAllTimers();

		const yesButton = await screen.findByRole("button", { name: /^yes$/i });
		await act(async () => {
			fireEvent.click(yesButton);
			fireEvent.click(yesButton); // second click should be ignored while submitting
		});

		expect(submitTrialMock).toHaveBeenCalledTimes(1);
		await act(async () => {
			resolveSubmit();
		});
		await advanceAllTimers();
	}, 15000);

	it("stops music loop on unmount", async () => {
		mockMathRandomSequence([0]);

		const deckOverride = {
			practiceStimuli: [
				{
					id: "music-cancel",
					expectedOptionId: "o1",
					stimulus: "C4-piano",
					trigger: "MUSIC_CANCEL",
					options: [{ id: "o1", label: "MC", color: "#111111" }],
				},
			],
			stimuli: [],
		};

		const { unmount } = render(<SpeedCongruencyTest deckOverride={deckOverride} />);

		fireEvent.click(screen.getByRole("button", { name: /begin/i }));
		await advanceTimersByTimeAsync(10);
		unmount();
		await advanceTimersByTimeAsync(5000);

		expect(musicPlayer.stop).toHaveBeenCalled();
	}, 15000);

	it("reaches done state and renders thank you", async () => {
		let resolveSubmit;
		submitTrialMock.mockImplementation(
			() =>
				new Promise((res) => {
					resolveSubmit = res;
				}),
		);
		mockMathRandomSequence([0, 0]);

		const deckOverride = {
			practiceStimuli: [
				{
					id: "final",
					trigger: "Z",
					expectedOptionId: "o1",
					options: [{ id: "o1", label: "Z", color: "#000000" }],
				},
			],
			stimuli: [],
		};

		render(<SpeedCongruencyTest deckOverride={deckOverride} />);

		fireEvent.click(screen.getByRole("button", { name: /begin/i }));
		await advanceAllTimers();
		fireEvent.click(await screen.findByRole("button", { name: /^yes$/i }));

		await waitFor(() => expect(submitTrialMock).toHaveBeenCalledTimes(1));
		await act(async () => {
			resolveSubmit();
		});

		expect(
			await screen.findByText(/thank you for completing the speed congruency test/i),
		).toBeInTheDocument();
	}, 15000);

	it("shows no-trials message when deck is empty", async () => {
		render(<SpeedCongruencyTest deckOverride={{ practiceStimuli: [], stimuli: [] }} />);
		expect(await screen.findByText(/No trials are available/i)).toBeInTheDocument();
	});

	it("records correct response when user selects 'no' on incongruent trial", async () => {
		mockMathRandomSequence([0, 0, 0, 0, 0.8, 0]);

		render(<SpeedCongruencyTest />);

		const beginButton = screen.queryByRole("button", { name: /begin/i });
		if (beginButton) fireEvent.click(beginButton);
		await advanceAllTimers();

		const noButton = await screen.findByRole("button", { name: /^no$/i });
		fireEvent.click(noButton);

		await waitFor(() => expect(submitTrialMock).toHaveBeenCalledTimes(1));
		const payload = submitTrialMock.mock.calls[0][0];
		expect(payload.isCongruent).toBe(false);
		expect(payload.isCorrect).toBe(true);
	}, 10000);

	it("logs when local persistence fails", async () => {
		submitTrialMock.mockRejectedValueOnce(new Error("network"));
		const setItemMock = vi.fn(() => {
			throw new Error("setItem-fail");
		});
		const getItemMock = vi.fn(() => "[]");
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const originalLocalStorage = global.localStorage;
		Object.defineProperty(global, "localStorage", {
			configurable: true,
			value: { getItem: getItemMock, setItem: setItemMock },
		});

		mockMathRandomSequence([0, 0, 0, 0, 0.2]);

		render(<SpeedCongruencyTest />);

		const beginButton = screen.getByRole("button", { name: /begin/i });
		fireEvent.click(beginButton);
		await advanceAllTimers();
		fireEvent.click(await screen.findByRole("button", { name: /^yes$/i }));

		await waitFor(() => expect(setItemMock).toHaveBeenCalled());
		const loggedLocalStorageError = consoleSpy.mock.calls.some(
			(call) => call[0] === "Failed to save to localStorage:" && call[1] instanceof Error,
		);
		expect(loggedLocalStorageError).toBe(true);

		Object.defineProperty(global, "localStorage", {
			configurable: true,
			value: originalLocalStorage,
		});
		consoleSpy.mockRestore();
	}, 15000);
});
