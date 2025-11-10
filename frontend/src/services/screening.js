import api from './api'

export const screeningService = {
  async saveConsent(consent) {
    const response = await api.post('/screening/consent', {
      consent: consent,
    })
    return response.data
  },

  async saveStep1(health) {
    const response = await api.post('/screening/step/1', {
      drug: health.drug || false,
      neuro: health.neuro || false,
      medical: health.medical || false,
    })
    return response.data
  },

  async saveStep2(definition) {
    const response = await api.post('/screening/step/2', {
      answer: definition,
    })
    return response.data
  },

  async saveStep3(painEmotion) {
    const response = await api.post('/screening/step/3', {
      answer: painEmotion,
    })
    return response.data
  },

  async saveStep4(types, other) {
    const response = await api.post('/screening/step/4', {
      grapheme: types.grapheme || null,
      music: types.music || null,
      lexical: types.lexical || null,
      sequence: types.sequence || null,
      other: other || null,
    })
    return response.data
  },

  async finalize() {
    const response = await api.post('/screening/finalize')
    return response.data
  },
}


