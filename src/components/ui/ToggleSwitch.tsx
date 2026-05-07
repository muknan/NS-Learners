'use client';

interface ToggleSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({
  id,
  label,
  checked,
  onChange,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <label htmlFor={id} className={`toggle-switch${disabled ? ' toggle-switch--disabled' : ''}`}>
      <span className="toggle-switch__label">{label}</span>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`toggle-switch__track${checked ? ' toggle-switch__track--on' : ''}`}
      >
        <span className="toggle-switch__thumb" />
      </button>
    </label>
  );
}
