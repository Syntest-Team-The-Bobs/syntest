import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {
	const { user, loading, isAuthenticated } = useAuth();

	if (loading) {
		return <div className="container">Loading...</div>;
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	if (requiredRole && user?.role !== requiredRole) {
		return <Navigate to="/" replace />;
	}

	return children;
}
