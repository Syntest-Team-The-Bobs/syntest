import '../../styles/app.css';

export default function Progress({ current, total, percentage }) {
  const percent = percentage || Math.round((current / total) * 100);
  
  return (
    <div className="progress">
      <div className="progress-top">
        <span>Step {current} of {total}</span>
        <span>{percent}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-bar" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
