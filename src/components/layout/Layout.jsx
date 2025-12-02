import { Link, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div>
      <header className="topbar">
        <div className="topbar-content">
          <Link to="/" className="brand">
            SYNTEST
          </Link>
          <nav className="nav">
            <Link to="/screening/0" className="nav-link">
              Screening
            </Link>
            {isAuthenticated ? (
              <>
                {user?.role === "participant" && (
                  <Link to="/participant/dashboard" className="nav-link">
                    Dashboard
                  </Link>
                )}
                {user?.role === "researcher" && (
                  <Link to="/researcher/dashboard" className="nav-link">
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="btn btn-primary btn-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">
                  Login
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm">
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <footer>
        <p>
          &copy; 2025 Synesthesia Research Platform. All data is anonymized and
          used for research purposes only.
        </p>
      </footer>
    </div>
  );
}
