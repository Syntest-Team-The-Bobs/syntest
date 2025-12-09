import api from "./api";

export const colorTestService = {
  async submitTrial(trialData) {
    const payload = {
      trial_index: trialData.trial_index,
      selected_r: trialData.selected_color?.r ?? null,
      selected_g: trialData.selected_color?.g ?? null,
      selected_b: trialData.selected_color?.b ?? null,
      response_ms: trialData.response_ms,
      meta_json: {
        test_type: trialData.test_type,
        stimulus: trialData.stimulus,
        no_synesthetic_experience: trialData.no_synesthetic_experience || false,
        browser: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ...trialData.meta,
      },
    };

    const response = await api.post("/color-test/trial", payload, { withCredentials: true });
    return response.data;
  },

  async submitBatch(trials, testType) {
    const formattedTrials = trials.map((trial, index) => ({
      trial_index: index,
      selected_r: trial.selectedColor?.r ?? null,
      selected_g: trial.selectedColor?.g ?? null,
      selected_b: trial.selectedColor?.b ?? null,
      response_ms: trial.reactionTime,
      meta_json: {
        test_type: testType,
        stimulus: trial.stimulus,
        no_synesthetic_experience: trial.noSynestheticExperience || false,
        browser: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    }));

    const response = await api.post(
      "/color-test/batch",
      { trials: formattedTrials },
      { withCredentials: true }
    );
    return response.data;
  },
};
