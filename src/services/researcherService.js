import axios from "axios";

const API_BASE = "/api/researcher/dashboard";

export const fetchDashboardSummary = async () => {
  const res = await axios.get(`${API_BASE}/summary`);
  return res.data;
};

export const fetchRecentActivity = async () => {
  const res = await axios.get(`${API_BASE}/recent`);
  return res.data;
};
