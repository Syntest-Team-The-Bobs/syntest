import { useState } from "react";
import { colorTestService } from "../services/colorTest";

export const useColorTestAPI = () => {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState(null);

	const submitTrial = async (trialData) => {
		setIsSubmitting(true);
		setError(null);
		try {
			const result = await colorTestService.submitTrial(trialData);
			return result;
		} catch (err) {
			console.error("Error submitting trial:", err);
			setError(err.message || "Failed to save trial");
			throw err;
		} finally {
			setIsSubmitting(false);
		}
	};

	const submitBatch = async (trials, testType) => {
		setIsSubmitting(true);
		setError(null);
		try {
			const result = await colorTestService.submitBatch(trials, testType);
			return result;
		} catch (err) {
			console.error("Error submitting batch:", err);
			setError(err.message || "Failed to save trials");
			throw err;
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		submitTrial,
		submitBatch,
		isSubmitting,
		error,
	};
};
