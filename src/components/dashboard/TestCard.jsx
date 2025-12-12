import { CheckCircle, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../../styles/TestCard.css";

/**
 * TestCard Component
 *
 * Displays an individual test card with:
 * - Test name and description
 * - Lock/completion icons
 * - Status badge (Available/Locked/Completed)
 * - Click handling for navigation
 *
 * Props:
 * @param {Object} test - Test object containing:
 *   - id: unique identifier
 *   - name: test name
 *   - description: test description
 *   - path: navigation path
 *   - isLocked: whether test is locked
 *   - isCompleted: whether test is completed
 */
export default function TestCard({ test }) {
	const navigate = useNavigate();

	/**
	 * Handle card click
	 * Only navigates if test is not locked and has a valid path
	 */
	const handleClick = () => {
		if (!test.isLocked && test.path && test.path !== "#") {
			navigate(test.path);
		}
	};

	/**
	 * Handle keyboard navigation (Enter/Space)
	 */
	const handleKeyUp = (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick();
		}
	};

	const isClickable = !test.isLocked && test.path && test.path !== "#";

	return (
		<button
			type="button"
			// Dynamic classes based on test state
			className={`test-card ${test.isLocked ? "locked" : ""} ${test.isCompleted ? "completed" : ""}`}
			onClick={handleClick}
			onKeyUp={handleKeyUp}
			disabled={test.isLocked}
			// Change cursor based on lock state
			style={{
				cursor: isClickable ? "pointer" : "not-allowed",
			}}
			aria-label={`${test.name} - ${test.isLocked ? "Locked" : test.isCompleted ? "Completed" : "Available"}`}
		>
			{/* Card header with title and status icon */}
			<div className="test-card-header">
				<h3 className="test-card-title">{test.name}</h3>
				{/* Show lock icon if test is locked */}
				{test.isLocked && <Lock className="lock-icon" size={20} />}
				{/* Show checkmark if test is completed */}
				{test.isCompleted && (
					<CheckCircle className="completed-icon" size={20} />
				)}
			</div>

			{/* Test description */}
			<p className="test-card-description">{test.description}</p>

			{/* Card footer with status badge */}
			<div className="test-card-footer">
				{/* Conditional status badge based on test state */}
				{test.isLocked ? (
					<span className="test-status locked-status">Locked</span>
				) : test.isCompleted ? (
					<span className="test-status completed-status">Completed</span>
				) : (
					<span className="test-status available-status">Available</span>
				)}
			</div>
		</button>
	);
}
