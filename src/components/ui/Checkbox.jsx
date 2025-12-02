import '../../styles/app.css';

export default function Checkbox({
  children,
  checked,
  onChange,
  className,
  ...props
}) {
  const classes = `checkbox-group ${className}`.trim();
  return (
    <label className={classes}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        {...props}
      />
      <span>{children}</span>
    </label>
  );
}
