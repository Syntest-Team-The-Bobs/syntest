import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock axios
vi.mock("axios", () => {
	const mockInterceptors = {
		request: { use: vi.fn() },
		response: { use: vi.fn() },
	};

	const mockAxiosInstance = {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		interceptors: mockInterceptors,
	};

	return {
		default: {
			create: vi.fn(() => mockAxiosInstance),
		},
	};
});

describe("api service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it("creates axios instance with correct config", async () => {
		await import("../api");

		expect(axios.create).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: { "Content-Type": "application/json" },
				withCredentials: true,
			}),
		);
	});

	it("registers response interceptor", async () => {
		await import("../api");

		const mockInstance = axios.create();
		expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
	});

	it("response interceptor passes through successful responses", async () => {
		await import("../api");

		const mockInstance = axios.create();
		const [successHandler] =
			mockInstance.interceptors.response.use.mock.calls[0];

		const response = { data: { success: true } };
		expect(successHandler(response)).toBe(response);
	});

	it("response interceptor handles error with response data", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await import("../api");

		const mockInstance = axios.create();
		const [, errorHandler] =
			mockInstance.interceptors.response.use.mock.calls[0];

		const error = {
			response: {
				status: 404,
				data: { message: "Not found" },
			},
		};

		await expect(errorHandler(error)).rejects.toBe(error);
		expect(consoleSpy).toHaveBeenCalledWith(
			"API Error Response:",
			expect.objectContaining({ status: 404 }),
		);

		consoleSpy.mockRestore();
	});

	it("response interceptor handles error with no response (network error)", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await import("../api");

		const mockInstance = axios.create();
		const [, errorHandler] =
			mockInstance.interceptors.response.use.mock.calls[0];

		const error = {
			request: { url: "/test" },
		};

		await expect(errorHandler(error)).rejects.toBe(error);
		expect(consoleSpy).toHaveBeenCalledWith(
			"API Error: No response received",
			expect.anything(),
		);

		consoleSpy.mockRestore();
	});

	it("response interceptor handles generic error", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await import("../api");

		const mockInstance = axios.create();
		const [, errorHandler] =
			mockInstance.interceptors.response.use.mock.calls[0];

		const error = {
			message: "Something went wrong",
		};

		await expect(errorHandler(error)).rejects.toBe(error);
		expect(consoleSpy).toHaveBeenCalledWith(
			"API Error:",
			"Something went wrong",
		);

		consoleSpy.mockRestore();
	});
});
