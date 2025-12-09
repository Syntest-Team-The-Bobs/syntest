// src/components/dashboard/DateRangePicker.jsx
import { useState, useEffect } from "react";
import { formatISO } from "date-fns";

export default function DateRangePicker({ value = {}, onChange = () => {} }) {
  const [preset, setPreset] = useState(value.preset || "30");
  const [start, setStart] = useState(value.start || "");
  const [end, setEnd] = useState(value.end || "");

  useEffect(() => {
    onChange({ preset, start: start || null, end: end || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, start, end]);

  return (
    <div className="date-range-picker">
      <label>Range:</label>
      <select value={preset} onChange={(e) => setPreset(e.target.value)}>
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="365">Last year</option>
        <option value="custom">Custom</option>
      </select>

      {preset === "custom" && (
        <div className="custom-range-inputs">
          <input type="date" value={start || ""} onChange={(e) => setStart(e.target.value)} />
          <span>—</span>
          <input type="date" value={end || ""} onChange={(e) => setEnd(e.target.value)} />
        </div>
      )}
    </div>
  );
}
