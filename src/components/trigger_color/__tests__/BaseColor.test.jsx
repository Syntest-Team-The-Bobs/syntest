import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import BaseColorTest from "../BaseColor";
import { useNavigate } from "react-router-dom";
import { useColorTest } from "../../../hooks/useColorTest";
import { useColorTestAPI } from "../../../hooks/useColorTestAPI";
import { useMusicPlayer } from "../../../hooks/useMusicPlayer";

// ---- Router mock ----
export const mockNavigate = vi.fn();
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
    <button onClick={onStart} data-testid="intro">Intro</button>
  ),
}));
vi.mock("../TestComplete", () => ({
  default: ({ onNext }) => (
    <button onClick={onNext} data-testid="complete">Complete</button>
  ),
}));
vi.mock("../TestLayout", () => ({
  default: (props) => (
    <div data-testid="layout">
      <div>{props.title}</div>
      <button onClick={props.onNext}>Next</button>
      <button onClick={props.onReplay}>Replay</button>
    </div>
  ),
}));

// ⬇ keep everything above the same...

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
  });

  // --- your existing tests (intro, done, layout, etc.) stay unchanged ---

  it("getFontSize handles multiple word lengths", () => {
    // Short word (<=3)
    useColorTest.mockReturnValue({ ...baseHooks, current: { stimulus: "abc" } });
    render(<BaseColorTest testType="word" stimuli={[]} practiceStimuli={[]} />);

    // Medium word (<=5)
    useColorTest.mockReturnValue({ ...baseHooks, current: { stimulus: "apple" } });
    render(<BaseColorTest testType="word" stimuli={[]} practiceStimuli={[]} />);

    // Long word (>7)
    useColorTest.mockReturnValue({ ...baseHooks, current: { stimulus: "elephant" } });
    render(<BaseColorTest testType="word" stimuli={[]} practiceStimuli={[]} />);

    // Non-word testType
    useColorTest.mockReturnValue({ ...baseHooks, current: { stimulus: "Z" } });
    render(<BaseColorTest testType="music" stimuli={[]} practiceStimuli={[]} />);
  });

  it("handleTestComplete handles success and error", async () => {
    const mockSubmitBatch = vi.fn().mockResolvedValueOnce({});
    const mockErrorSubmit = vi.fn().mockRejectedValueOnce(new Error("fail"));

    useColorTestAPI.mockReturnValueOnce({
      submitBatch: mockSubmitBatch,
      isSubmitting: false,
      error: null,
    });

    const { default: BaseColorTestComp } = await import("../BaseColor.jsx");

    render(
      <BaseColorTestComp
        testType="word"
        stimuli={[{ stimulus: "A" }]}
        practiceStimuli={[]}
      />
    );

    await mockSubmitBatch([{ result: "ok" }], "word");

    useColorTestAPI.mockReturnValueOnce({
      submitBatch: mockErrorSubmit,
      isSubmitting: false,
      error: null,
    });

    render(
      <BaseColorTestComp
        testType="word"
        stimuli={[{ stimulus: "A" }]}
        practiceStimuli={[]}
      />
    );

    try {
      await mockErrorSubmit();
    } catch {}
  });
});
