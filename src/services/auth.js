import api from './api'

export const authService = {
    async login(email, password, role) {
      const response = await api.post('/auth/login', { email, password, role })
      // No token handling - sessions are cookie-based!
      return response.data
    },
  
    async signup(userData) {
      const response = await api.post('/auth/signup', userData)
      return response.data
    },
  
    async logout() {
      const response = await api.post('/auth/logout')
      // No localStorage cleanup needed
      return response.data
    },
  
    async getCurrentUser() {
      const response = await api.get('/auth/me')
      return response.data
    },
}