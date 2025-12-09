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

	async searchParticipants(search = "", status = "", limit = 50, offset = 0) {
		const params = new URLSearchParams();
		if (search) params.append("search", search);
		if (status) params.append("status", status);
		params.append("limit", limit);
		params.append("offset", offset);
		const response = await api.get(
			`/researcher/dashboard/participants?${params}`,
		);
		return response.data;
	},

	async getParticipantDetails(participantId) {
		const response = await api.get(
			`/researcher/dashboard/participants/${participantId}`,
		);
		return response.data;
	},

	async exportData(format = "csv", type = "participants") {
		const response = await api.get(
			`/researcher/dashboard/export?format=${format}&type=${type}`,
			{ responseType: "blob" },
		);
		return response.data;
	},
};
