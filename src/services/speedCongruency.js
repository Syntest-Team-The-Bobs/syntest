import api from './api';

export const speedCongruencyService = {
  async getNextTrial(trialIndex) {
    const response = await api.get('/speed-congruency/next', {
      params: { trialIndex },
    });
    return response.data;
  },

  async submitTrial(trialData) {
    const response = await api.post('/speed-congruency/submit', trialData);
    return response.data;
  },
};