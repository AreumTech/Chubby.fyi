import React from 'react';

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  helperText?: string;
  className?: string;
}

/**
 * Checkbox component - simple wrapper around HTML checkbox with consistent styling
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onChange,
  helperText,
  className = '',
}) => {
  return (
    <div className={`mt-4 ${className}`}>
      <label className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-areum-border text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-areum-text-primary">{label}</span>
      </label>
      {helperText && (
        <p className="mt-1 text-xs text-areum-text-secondary ml-7">{helperText}</p>
      )}
    </div>
  );
};
