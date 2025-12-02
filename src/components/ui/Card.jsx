import '../../styles/app.css';

export default function Card({ 
  children, 
  className = '', 
  title, 
  chip,
  ...props 
}) {
  return (
    <section className={`card ${className}`.trim()} {...props}>
      {chip && <span className={`chip ${chip.variant ? `chip-${chip.variant}` : ''}`}>{chip.label}</span>}
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </section>
  );
}
