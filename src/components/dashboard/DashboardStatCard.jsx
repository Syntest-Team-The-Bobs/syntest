export default function DashboardStatCard({ label, value, icon }) {
    return (
      <div className="stat-card">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        {icon && <div className="stat-card-icon">{icon}</div>}
      </div>
    );
  }