import '../../styles/app.css';

export default function ChoiceCard({
  title,
  subtitle,
  variant = 'default',
  selected,
  onClick,
  ...props
}) {
  const className = (selected ? 'selected ' : '') + (variant === 'negative' ? 'choice-negative' : 'choice-card');
  const titleClass = variant === 'negative' ? 'choice-negative-title' : 'choice-title';
  const subClass = variant === 'negative' ? 'choice-negative-subtitle' : 'choice-subtitle';

  const content = (
    <>
      <div className={titleClass}>{title}</div>
      <div className={subClass}>{subtitle}</div>
    </>
  );

  return (
    <a
      href="#"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        if (onClick) {
          onClick(event);
        }
      }}
      {...props}
    >
      {content}
    </a>
  );
}
