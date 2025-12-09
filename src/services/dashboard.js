import api from "./api";

export const dashboardService = {
  async getParticipantDashboard() {
    const response = await api.get("/participant/dashboard");
    return response.data;
  },

  async getResearcherDashboard(days = 30) {
    const response = await api.get(`/researcher/dashboard/?days=${days}`);
    return response.data;
  },
};
