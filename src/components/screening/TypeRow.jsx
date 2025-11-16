import '../../styles/app.css';

export default function TypeRow({
  title,
  description,
  name,
  value,
  onChange
}) {
  const options = [
    { value: 'yes', label: 'Yes' },
    { value: 'sometimes', label: 'Sometimes' },
    { value: 'no', label: 'No' },
  ];

  const handleChange = (event) => {
    if (onChange) {
      onChange(event.target.value);
    }
  };

  return (
    <li className="type-row">
      <div className="type-main">
        <div className="type-title">{title}</div>
        <div className="type-sub">{description}</div>
      </div>
      <div className="type-opts">
        {options.map((option) => (
          <label className="opt" key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={handleChange}
              aria-label={`${title} — ${option.label}`}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </li>
  );
}
