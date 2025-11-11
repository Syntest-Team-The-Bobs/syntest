import '../../styles/app.css';

export default function TestProgress({ 
  stimulus, 
  currentTrial, 
  totalTrials, 
  currentItem, 
  totalItems 
}) {
  return (
    <div className="status" aria-live="polite">
      <div>Item: <span>{stimulus || '—'}</span></div>
      <div>Trial <span>{currentTrial}</span> / <span>{totalTrials}</span></div>
      <div>Progress <span>{currentItem}/{totalItems}</span></div>
    </div>
  );
}
