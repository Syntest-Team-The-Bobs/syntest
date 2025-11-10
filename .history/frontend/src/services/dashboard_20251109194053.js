import api from './api'

export const dashboardService = {
  async getParticipantDashboard() {
    const response = await api.get('/participant/dashboard')
    return response.data
  },

  async getResearcherDashboard() {
    const response = await api.get('/researcher/dashboard')
    return response.data
  },
}


