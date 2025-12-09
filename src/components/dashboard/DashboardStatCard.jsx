export default function DashboardStatCard({ 
  label, 
  value, 
  icon, 
  progressBar, 
  progressLabel,
  progressColor = "blue" 
}) {
  const colorMap = {
    blue: "#3b82f6",
    green: "#10b981",
    orange: "#f59e0b",
    red: "#ef4444"
  };

  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {icon && <div className="stat-card-icon">{icon}</div>}
      
      {progressBar !== null && progressBar !== undefined && (
        <div className="stat-card-progress">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ 
                width: `${Math.min(progressBar, 100)}%`,
                backgroundColor: colorMap[progressColor]
              }}
            />
          </div>
          {progressLabel && (
            <div className="progress-label">{progressLabel}</div>
          )}
        </div>
      )}
    </div>
  );
}