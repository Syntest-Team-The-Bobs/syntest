import Soundfont from "soundfont-player";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { musicPlayer } from "../audioPlayer";

vi.mock("soundfont-player", () => ({
	default: {
		instrument: vi.fn(() =>
			Promise.resolve({
				play: vi.fn(() => ({ stop: vi.fn() })),
			}),
		),
	},
}));

describe("MusicPlayer", () => {
	let _ctxStart, _ctxStop;
	beforeEach(() => {
		vi.clearAllMocks();
		musicPlayer.audioContext = {
			createOscillator: vi.fn(() => ({
				frequency: { value: 0 },
				connect: vi.fn().mockReturnThis(),
				start: vi.fn(),
				stop: vi.fn(),
			})),
			createGain: vi.fn(() => ({
				gain: { setValueAtTime: vi.fn() },
				connect: vi.fn().mockReturnThis(),
			})),
			destination: {},
			currentTime: 0,
			close: vi.fn(),
			state: "running",
		};
	});

	it("initializes AudioContext once", async () => {
		const ctx = await musicPlayer.init();
		expect(ctx).toBe(musicPlayer.audioContext);
	});

	it("caches loaded instruments", async () => {
		await musicPlayer.loadInstrument("piano");
		expect(Soundfont.instrument).toHaveBeenCalled();
		await musicPlayer.loadInstrument("piano"); // cached
		expect(Soundfont.instrument).toHaveBeenCalledTimes(1);
	});

	it("returns correct mapped instrument names", () => {
		expect(musicPlayer.getSoundfontInstrument("violin")).toBe("violin");
		expect(musicPlayer.getSoundfontInstrument("unknown")).toBe(
			"acoustic_grand_piano",
		);
	});

	it("converts note to frequency correctly", () => {
		const freq = musicPlayer.noteToFreq("A4");
		expect(freq).toBeCloseTo(440, 1);
	});

	it("parses single and dyad stimuli", () => {
		expect(musicPlayer.parseStimulus("C4-piano")).toEqual({
			notes: ["C4"],
			instrument: "piano",
		});
		expect(musicPlayer.parseStimulus("C4+E4-piano").notes).toHaveLength(2);
	});

	it("plays sine notes correctly", async () => {
		await musicPlayer.play("C4-sine", 1);
		expect(musicPlayer.activeOscillators.length).toBeGreaterThan(0);
	});

	it("plays instrument-based notes correctly", async () => {
		const result = await musicPlayer.play("C4-piano", 1);
		expect(result).toBe(true);
	});

	it("handles Soundfont load failure gracefully", async () => {
		Soundfont.instrument.mockRejectedValueOnce(new Error("load fail"));
		await expect(musicPlayer.loadInstrument("broken")).rejects.toThrow(
			"load fail",
		);
	});

	it("stops active notes and oscillators", () => {
		const stopFn = vi.fn();
		musicPlayer.currentNotes = [{ stop: stopFn }];
		musicPlayer.activeOscillators = [{ stop: stopFn }];
		musicPlayer.stop();
		expect(stopFn).toHaveBeenCalled();
	});

	it("dispose closes audio context", () => {
		const close = vi.fn();
		musicPlayer.audioContext.close = close;
		musicPlayer.dispose();
		expect(close).toHaveBeenCalled();
	});
});
