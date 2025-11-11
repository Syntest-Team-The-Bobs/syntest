import '../../styles/app.css';

export default function StimulusDisplay({ stimulus, type = 'word' }) {
  return (
    <div className="swatch-wrap" aria-live="polite">
      <div className="stimulus-box" aria-label="Stimulus">
        <div 
          id="stimulusContent"
          className={`stimulus-${type}`}
        >
          {stimulus || '—'}
        </div>
      </div>
      <p className="caption" aria-hidden="true">
        This is the current {type} to color-match.
      </p>
    </div>
  );
}
