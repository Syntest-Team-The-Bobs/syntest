import { NavLink } from "react-router-dom";
import "../../styles/app.css";

export default function Sidebar({ links }) {
	return (
		<aside className="dashboard-sidebar">
			<nav className="side-nav">
				{links.map((link) => (
					<NavLink
						key={link.path}
						to={link.path}
						className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
					>
						{link.icon && <span className="ico">{link.icon}</span>}
						<span>{link.label}</span>
					</NavLink>
				))}
			</nav>
		</aside>
	);
}
