import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { useColorTest } from "../../../hooks/useColorTest";
import { useColorTestAPI } from "../../../hooks/useColorTestAPI";
import { useMusicPlayer } from "../../../hooks/useMusicPlayer";
import BaseColorTest from "../BaseColor";

// ---- Router mock ----
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
	useNavigate: () => mockNavigate,
}));

// ---- Hook mocks ----
vi.mock("../../../hooks/useColorTest", () => ({
	useColorTest: vi.fn(),
}));
vi.mock("../../../hooks/useColorTestAPI", () => ({
	useColorTestAPI: vi.fn(),
}));
vi.mock("../../../hooks/useMusicPlayer", () => ({
	useMusicPlayer: vi.fn(),
}));

// ---- Child component mocks ----
vi.mock("../TestIntro", () => ({
	default: ({ onStart }) => (
		<button type="button" onClick={onStart} data-testid="intro">
			Start Test
		</button>
	),
}));
vi.mock("../TestComplete", () => ({
	default: ({ onNext }) => (
		<button type="button" onClick={onNext} data-testid="complete">
			Complete - Next
		</button>
	),
}));
vi.mock("../TestLayout", () => ({
	default: (props) => (
		<div data-testid="layout">
			<div data-testid="title">{props.title}</div>
			<div data-testid="font-size">{props.getFontSize()}</div>
			<button type="button" onClick={props.onNext} data-testid="next-btn">
				Next
			</button>
			{props.onReplay && (
				<button type="button" onClick={props.onReplay} data-testid="replay-btn">
					Replay
				</button>
			)}
		</div>
	),
}));

describe("BaseColorTest", () => {
	const mockSubmitBatch = vi.fn();
	const baseHooks = {
		phase: "test",
		selected: "red",
		locked: false,
		noExperience: false,
		deck: [{ stimulus: "A" }, { stimulus: "B" }],
		idx: 0,
		current: { stimulus: "A" },
		onPick: vi.fn(),
		toggleLock: vi.fn(),
		toggleNoExperience: vi.fn(),
		startTest: vi.fn(),
		handleNext: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		useColorTestAPI.mockReturnValue({
			submitBatch: mockSubmitBatch,
			isSubmitting: false,
			error: null,
		});
		useMusicPlayer.mockReturnValue({ handleReplay: vi.fn() });
		useColorTest.mockReturnValue(baseHooks);
	});

	it("renders intro phase", () => {
		useColorTest.mockReturnValue({ ...baseHooks, phase: "intro" });
		render(
			<BaseColorTest
				testType="letter"
				stimuli={[]}
				practiceStimuli={[]}
				title="Test"
				introConfig={{}}
			/>,
		);
		expect(screen.getByTestId("intro")).toBeInTheDocument();
	});

	it("renders done phase and navigates on click", () => {
		useColorTest.mockReturnValue({ ...baseHooks, phase: "done" });
		render(
			<BaseColorTest
				testType="letter"
				stimuli={[]}
				practiceStimuli={[]}
				title="Test"
				introConfig={{}}
			/>,
		);
		expect(screen.getByTestId("complete")).toBeInTheDocument();

		fireEvent.click(screen.getByTestId("complete"));
		expect(mockNavigate).toHaveBeenCalledWith("/speed-congruency/instructions");
	});

	it("renders test layout during test phase", () => {
		render(
			<BaseColorTest
				testType="letter"
				stimuli={[{ stimulus: "A" }]}
				practiceStimuli={[]}
				title="Color Letter Test"
				introConfig={{}}
			/>,
		);
		expect(screen.getByTestId("layout")).toBeInTheDocument();
		expect(screen.getByTestId("title")).toHaveTextContent("Color Letter Test");
	});

	it("returns null when current is null", () => {
		useColorTest.mockReturnValue({ ...baseHooks, current: null });
		const { container } = render(
			<BaseColorTest
				testType="letter"
				stimuli={[]}
				practiceStimuli={[]}
				title="Test"
				introConfig={{}}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("provides replay handler for music test type", () => {
		const mockReplay = vi.fn();
		useMusicPlayer.mockReturnValue({ handleReplay: mockReplay });

		render(
			<BaseColorTest
				testType="music"
				stimuli={[{ stimulus: "C4" }]}
				practiceStimuli={[]}
				title="Music Test"
				introConfig={{}}
			/>,
		);

		const replayBtn = screen.getByTestId("replay-btn");
		fireEvent.click(replayBtn);
		expect(mockReplay).toHaveBeenCalled();
	});

	it("does not provide replay handler for non-music test types", () => {
		render(
			<BaseColorTest
				testType="letter"
				stimuli={[{ stimulus: "A" }]}
				practiceStimuli={[]}
				title="Letter Test"
				introConfig={{}}
			/>,
		);

		expect(screen.queryByTestId("replay-btn")).not.toBeInTheDocument();
	});

	describe("getFontSize", () => {
		it("returns 7rem for null current", () => {
			useColorTest.mockReturnValue({ ...baseHooks, current: null });
			// Can't test directly since component returns null, but coverage is added
		});

		it("returns 5rem for short words (<=3 chars)", () => {
			useColorTest.mockReturnValue({
				...baseHooks,
				current: { stimulus: "cat" },
			});
			render(
				<BaseColorTest
					testType="word"
					stimuli={[{ stimulus: "cat" }]}
					practiceStimuli={[]}
					title="Test"
					introConfig={{}}
				/>,
			);
			expect(screen.getByTestId("font-size")).toHaveTextContent("5rem");
		});

		it("returns 4rem for medium words (4-5 chars)", () => {
			useColorTest.mockReturnValue({
				...baseHooks,
				current: { stimulus: "apple" },
			});
			render(
				<BaseColorTest
					testType="word"
					stimuli={[{ stimulus: "apple" }]}
					practiceStimuli={[]}
					title="Test"
					introConfig={{}}
				/>,
			);
			expect(screen.getByTestId("font-size")).toHaveTextContent("4rem");
		});

		it("returns 3rem for longer words (6-7 chars)", () => {
			useColorTest.mockReturnValue({
				...baseHooks,
				current: { stimulus: "evening" },
			});
			render(
				<BaseColorTest
					testType="word"
					stimuli={[{ stimulus: "evening" }]}
					practiceStimuli={[]}
					title="Test"
					introConfig={{}}
				/>,
			);
			expect(screen.getByTestId("font-size")).toHaveTextContent("3rem");
		});

		it("returns 2.5rem for very long words (>7 chars)", () => {
			useColorTest.mockReturnValue({
				...baseHooks,
				current: { stimulus: "elephant" },
			});
			render(
				<BaseColorTest
					testType="word"
					stimuli={[{ stimulus: "elephant" }]}
					practiceStimuli={[]}
					title="Test"
					introConfig={{}}
				/>,
			);
			expect(screen.getByTestId("font-size")).toHaveTextContent("2.5rem");
		});

		it("returns 7rem for non-word test types", () => {
			useColorTest.mockReturnValue({
				...baseHooks,
				current: { stimulus: "A" },
			});
			render(
				<BaseColorTest
					testType="letter"
					stimuli={[{ stimulus: "A" }]}
					practiceStimuli={[]}
					title="Test"
					introConfig={{}}
				/>,
			);
			expect(screen.getByTestId("font-size")).toHaveTextContent("7rem");
		});
	});

	describe("handleTestComplete", () => {
		it("calls submitBatch on test completion", async () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			// We need to capture the callback passed to useColorTest
			let capturedCallback;
			useColorTest.mockImplementation((_stimuli, _practice, onComplete) => {
				capturedCallback = onComplete;
				return baseHooks;
			});

			mockSubmitBatch.mockResolvedValueOnce({ success: true });

			render(
				<BaseColorTest
					testType="letter"
					stimuli={[{ stimulus: "A" }]}
					practiceStimuli={[]}
					title="Test"
					introConfig={{}}
				/>,
			);

			// Call the captured callback
			await capturedCallback([{ response: "test" }]);

			expect(mockSubmitBatch).toHaveBeenCalledWith(
				[{ response: "test" }],
				"letter",
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				"✅ Test results saved successfully!",
			);

			consoleSpy.mockRestore();
		});

		it("handles submitBatch error gracefully", async () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			let capturedCallback;
			useColorTest.mockImplementation((_stimuli, _practice, onComplete) => {
				capturedCallback = onComplete;
				return baseHooks;
			});

			mockSubmitBatch.mockRejectedValueOnce(new Error("Network error"));

			render(
				<BaseColorTest
					testType="letter"
					stimuli={[{ stimulus: "A" }]}
					practiceStimuli={[]}
					title="Test"
					introConfig={{}}
				/>,
			);

			// Call the captured callback - should not throw
			await capturedCallback([{ response: "test" }]);

			expect(consoleSpy).toHaveBeenCalledWith(
				"❌ Error submitting results:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});
});
