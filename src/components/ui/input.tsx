import React, { useState, useEffect, useCallback } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'error';
  fullWidth?: boolean;
  multiline?: boolean;
  rows?: number;
  /**
   * Input mode for specialized behavior:
   * - 'text': Standard input (default)
   * - 'year': Year input that maintains local state while typing to prevent
   *           partial values from being converted back and forth
   */
  mode?: 'text' | 'year';
  /** For mode="year": callback when year changes (receives year string) */
  onYearChange?: (year: string) => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  variant = 'default',
  fullWidth = true,
  multiline = false,
  rows = 3,
  className = '',
  mode = 'text',
  onYearChange,
  ...props
}) => {
  const inputId = props.id || `input-${Math.random().toString(36).substring(7)}`;

  // Year mode state - maintains local value while typing
  const [localYearValue, setLocalYearValue] = useState(props.value?.toString() || '');
  const [isYearFocused, setIsYearFocused] = useState(false);

  // Sync year value with prop when not focused
  useEffect(() => {
    if (mode === 'year' && !isYearFocused) {
      setLocalYearValue(props.value?.toString() || '');
    }
  }, [props.value, isYearFocused, mode]);

  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Only allow digits, limit to 4
    if (newValue !== '' && !/^\d*$/.test(newValue)) return;
    if (newValue.length > 4) return;

    setLocalYearValue(newValue);

    // If valid 4-digit year, update parent immediately
    if (newValue.length === 4) {
      const year = parseInt(newValue, 10);
      if (year >= 1900 && year <= 2200) {
        onYearChange?.(newValue);
      }
    }
  }, [onYearChange]);

  const handleYearBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsYearFocused(false);
    props.onBlur?.(e);

    if (localYearValue.length === 4) {
      const year = parseInt(localYearValue, 10);
      if (year >= 1900 && year <= 2200) {
        onYearChange?.(localYearValue);
      } else {
        setLocalYearValue(props.value?.toString() || '');
      }
    } else if (localYearValue === '') {
      onYearChange?.('');
    } else {
      setLocalYearValue(props.value?.toString() || '');
    }
  }, [localYearValue, props.value, props.onBlur, onYearChange]);

  const handleYearFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsYearFocused(true);
    props.onFocus?.(e);
  }, [props.onFocus]);

  const inputClasses = [
    'input',
    'focus-ring',
    variant === 'error' || error ? 'input-error' : '',
    leftIcon ? 'pl-10' : '',
    rightIcon ? 'pr-10' : '',
    fullWidth ? 'w-full' : '',
    className
  ].filter(Boolean).join(' ');

  const InputElement = multiline ? 'textarea' : 'input';

  // Year mode: use controlled local state
  if (mode === 'year') {
    return (
      <div className={`input-group ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="text-text-tertiary text-sm">{leftIcon}</div>
            </div>
          )}
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            className={inputClasses}
            value={localYearValue}
            onChange={handleYearChange}
            onBlur={handleYearBlur}
            onFocus={handleYearFocus}
            placeholder={props.placeholder || '2025'}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <div className="text-text-tertiary text-sm">{rightIcon}</div>
            </div>
          )}
        </div>
        {error && (
          <div className="text-danger text-xs mt-1">{error}</div>
        )}
        {!error && helperText && (
          <div className="text-tertiary text-xs mt-1">{helperText}</div>
        )}
      </div>
    );
  }

  // Standard text mode
  const inputProps = multiline ? { rows, ...props } : props;

  return (
    <div className={`input-group ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-text-tertiary text-sm">{leftIcon}</div>
          </div>
        )}
        <InputElement
          id={inputId}
          className={inputClasses}
          {...inputProps}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="text-text-tertiary text-sm">{rightIcon}</div>
          </div>
        )}
      </div>
      {error && (
        <div className="text-danger text-xs mt-1">{error}</div>
      )}
      {!error && helperText && (
        <div className="text-tertiary text-xs mt-1">{helperText}</div>
      )}
    </div>
  );
};
