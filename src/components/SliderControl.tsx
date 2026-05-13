import { useId, type ReactNode } from 'react';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  extra?: ReactNode;
}

export default function SliderControl({ label, value, min, max, step, onChange, extra }: SliderControlProps) {
  const baseId = useId();
  const rangeId = `${baseId}-range`;
  const numberId = `${baseId}-number`;

  return (
    <div className="slider-control">
      {/* Visible label points at the range; the number input still gets
          its own aria-label so screen readers announce both controls
          with the same semantic name. */}
      <label className="slider-label" htmlFor={rangeId}>{label}</label>
      <div className="slider-row">
        <input
          id={rangeId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={label}
        />
        <input
          id={numberId}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="slider-number"
          aria-label={`${label} value`}
        />
        {extra}
      </div>
    </div>
  );
}
