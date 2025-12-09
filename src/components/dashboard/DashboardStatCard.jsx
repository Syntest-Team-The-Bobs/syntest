export default function DashboardStatCard({ 
  label, 
  value, 
  icon, 
  progressBar, 
  progressLabel,
  progressColor = "blue",
  trendPercentage = null
}) {
  const colorMap = {
    blue: "#3b82f6",
    green: "#10b981",
    orange: "#f59e0b",
    red: "#ef4444"
  };

  const getTrendIndicator = () => {
    if (trendPercentage === null || trendPercentage === undefined) return null;
    
    const isPositive = trendPercentage > 0;
    const isNegative = trendPercentage < 0;
    const trendClass = isPositive ? "trend-up" : isNegative ? "trend-down" : "trend-neutral";
    const trendIcon = isPositive ? "↑" : isNegative ? "↓" : "→";
    const trendText = `${isPositive ? "+" : ""}${trendPercentage.toFixed(1)}%`;
    
    return (
      <div className={`trend-indicator ${trendClass}`}>
        <span>{trendIcon}</span>
        <span>{trendText}</span>
      </div>
    );
  };

  return (
    <div className="stat-card">
      <div className="stat-card-label">
        {label}
        {getTrendIndicator()}
      </div>
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