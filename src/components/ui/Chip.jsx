import '../../styles/app.css';

export default function Chip({ label, variant = 'info' }) {
  return (
    <span className={`chip chip-${variant}`}>
      {label}
    </span>
  );
}
