import { beforeEach, describe, expect, it, vi } from "vitest";
import { colorTestService } from "../colorTest";
import api from "../api";

vi.mock("../api");

describe("colorTestService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(window, "navigator", {
			value: { userAgent: "UnitTestBrowser/1.0" },
			writable: true,
		});
	});

	it("should submit a single trial with full color data", async () => {
		const mockResponse = { data: { success: true } };
		api.post.mockResolvedValue(mockResponse);

		const trial = {
			trial_index: 0,
			selected_color: { r: 255, g: 100, b: 50 },
			response_ms: 1200,
			test_type: "color-letter",
			stimulus: "A",
			no_synesthetic_experience: false,
			meta: { custom: "meta" },
		};

		const result = await colorTestService.submitTrial(trial);
		expect(api.post).toHaveBeenCalledWith(
			"/color-test/trial",
			expect.objectContaining({
				selected_r: 255,
				meta_json: expect.objectContaining({
					stimulus: "A",
					custom: "meta",
					browser: "UnitTestBrowser/1.0",
				}),
			}),
			expect.any(Object),
		);
		expect(result).toEqual(mockResponse.data);
	});

	it("should submit trial with null color fields when not provided", async () => {
		api.post.mockResolvedValue({ data: { ok: true } });
		const trial = {
			trial_index: 1,
			selected_color: null,
			response_ms: 200,
			test_type: "music",
			stimulus: "C4-piano",
		};
		await colorTestService.submitTrial(trial);
		const [_, payload] = api.post.mock.calls[0];
		expect(payload.selected_r).toBeNull();
		expect(payload.meta_json.no_synesthetic_experience).toBe(false);
	});

	it("should submit a batch of trials with correct formatting", async () => {
		const mockResponse = { data: { uploaded: true } };
		api.post.mockResolvedValue(mockResponse);
		const trials = [
			{
				selectedColor: { r: 10, g: 20, b: 30 },
				reactionTime: 123,
				stimulus: "C4-piano",
				noSynestheticExperience: true,
			},
			{
				selectedColor: null,
				reactionTime: 200,
				stimulus: "D4-violin",
				noSynestheticExperience: false,
			},
		];
		const result = await colorTestService.submitBatch(trials, "music");
		expect(api.post).toHaveBeenCalledWith(
			"/color-test/batch",
			expect.objectContaining({
				trials: expect.any(Array),
			}),
			expect.any(Object),
		);
		expect(result).toEqual(mockResponse.data);
	});

	it("should propagate API errors", async () => {
		api.post.mockRejectedValue(new Error("Network error"));
		await expect(
			colorTestService.submitTrial({
				trial_index: 2,
				selected_color: { r: 1, g: 2, b: 3 },
				response_ms: 500,
				test_type: "fail-test",
			}),
		).rejects.toThrow("Network error");
	});
});
