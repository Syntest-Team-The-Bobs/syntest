import api from './api'

export const colorService = {
  async getStimuli(setId = null) {
    const params = setId ? { set_id: setId } : {}
    const response = await api.get('/color/stimuli', { params })
    return response.data
  },

  async createStimulus(data) {
    const response = await api.post('/color/stimuli', data)
    return response.data
  },

  async saveTrials(trials) {
    const payload = Array.isArray(trials) ? trials : [trials]
    const response = await api.post('/color/trials', payload)
    return response.data
  },

  async getTrials(participantId = null) {
    const params = participantId ? { participant_id: participantId } : {}
    const response = await api.get('/color/trials', { params })
    return response.data
  },
}


