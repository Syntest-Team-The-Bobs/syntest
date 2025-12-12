import axios from "axios";

const API_VERSION = "v1";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api") + "/" + API_VERSION;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // CRITICAL: This sends session cookies
});

// REMOVE the request interceptor completely - no tokens needed!

// Keep only the response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API Error Response:", {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error("API Error: No response received", error.request);
    } else {
      console.error("API Error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
