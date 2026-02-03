import React from 'react';

/**
 * Typography Component System
 *
 * Single source of truth for all text styling across the application.
 * Prevents font inconsistencies by making incorrect usage impossible.
 *
 * Design tokens based on:
 * - Font families: Inter (primary), JetBrains Mono (mono)
 * - Sizes: xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px), 3xl (30px)
 * - Weights: normal (400), medium (500), semibold (600), bold (700)
 * - Line heights: tight (1.25), normal (1.5), relaxed (1.75)
 */

// Base typography types
export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'body'
  | 'body-sm'
  | 'label'
  | 'caption'
  | 'mono'
  | 'mono-sm';

export type TypographyColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'accent';

export type TypographyWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TypographyAlign = 'left' | 'center' | 'right';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  color?: TypographyColor;
  weight?: TypographyWeight;
  align?: TypographyAlign;
  className?: string;
  children: React.ReactNode;
  as?: React.ElementType;
}

/**
 * Variant-to-HTML-element mapping
 * Ensures proper semantic HTML while maintaining consistent styling
 */
const defaultElements: Record<TypographyVariant, keyof React.JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'p',
  'body-sm': 'p',
  label: 'span',
  caption: 'span',
  mono: 'span',
  'mono-sm': 'span',
};

/**
 * Variant style definitions
 * Based on design system tokens from tailwind.config.js and design-system.css
 */
const variantClasses: Record<TypographyVariant, string> = {
  // Headings - Consistent hierarchy
  h1: 'text-3xl font-bold leading-tight',           // 30px, bold, tight
  h2: 'text-2xl font-semibold leading-tight',       // 24px, semibold, tight
  h3: 'text-xl font-semibold leading-normal',       // 20px, semibold, normal
  h4: 'text-lg font-medium leading-normal',         // 18px, medium, normal
  h5: 'text-base font-medium leading-normal',       // 16px, medium, normal
  h6: 'text-sm font-medium leading-normal',         // 14px, medium, normal

  // Body text
  body: 'text-base font-normal leading-normal',     // 16px, normal, normal
  'body-sm': 'text-sm font-normal leading-normal',  // 14px, normal, normal

  // UI text
  label: 'text-sm font-medium leading-normal',      // 14px, medium, normal (forms)
  caption: 'text-xs font-normal leading-normal',    // 12px, normal, normal (hints/meta)

  // Monospace (for numbers, code, technical data)
  mono: 'text-base font-mono font-normal leading-normal',    // 16px, mono, normal
  'mono-sm': 'text-sm font-mono font-normal leading-normal', // 14px, mono, normal
};

/**
 * Color class definitions
 * Based on design system color tokens
 */
const colorClasses: Record<TypographyColor, string> = {
  primary: 'text-gray-900',        // --color-text-primary: #1f2937
  secondary: 'text-gray-600',      // --color-text-secondary: #6b7280
  tertiary: 'text-gray-500',       // --color-text-tertiary: #9ca3af
  inverse: 'text-white',           // --color-text-inverse: #ffffff
  success: 'text-success',         // --color-success: #16a34a
  warning: 'text-warning',         // --color-warning: #d97706
  danger: 'text-danger',           // --color-danger: #dc2626
  info: 'text-info',               // --color-info: #3b82f6
  accent: 'text-accent',           // --color-accent-primary: #4338ca
};

/**
 * Weight class definitions
 */
const weightClasses: Record<TypographyWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

/**
 * Alignment class definitions
 */
const alignClasses: Record<TypographyAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * Base Typography Component
 *
 * Usage:
 * <Typography variant="h2">My Heading</Typography>
 * <Typography variant="body" color="secondary">Some text</Typography>
 * <Typography variant="mono" color="accent">$123,456</Typography>
 */
export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = 'primary',
  weight,
  align,
  className = '',
  children,
  as,
  ...htmlProps
}) => {
  const Component = as || defaultElements[variant];

  const classes = [
    variantClasses[variant],
    colorClasses[color],
    weight && weightClasses[weight],  // Override default weight if specified
    align && alignClasses[align],
    className,
  ].filter(Boolean).join(' ');

  return <Component className={classes} {...htmlProps}>{children}</Component>;
};

/**
 * Convenience components for common use cases
 * These make the API more ergonomic while maintaining consistency
 */

export const H1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h1" {...props} />
);

export const H2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h2" {...props} />
);

export const H3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h3" {...props} />
);

export const H4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h4" {...props} />
);

export const H5: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h5" {...props} />
);

export const H6: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h6" {...props} />
);

export const Body: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body" {...props} />
);

export const BodySmall: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body-sm" {...props} />
);

export const Label: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="label" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);

export const Mono: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="mono" {...props} />
);

export const MonoSmall: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="mono-sm" {...props} />
);

/**
 * Specialized form components
 * These enforce consistent spacing and styling for form elements
 */

export interface FormLabelProps {
  htmlFor?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FormLabel: React.FC<FormLabelProps> = ({
  htmlFor,
  required = false,
  className = '',
  children,
}) => {
  return (
    <label htmlFor={htmlFor} className={`text-sm font-medium text-gray-700 mb-1 block ${className}`}>
      {children}
      {required && <span className="text-danger ml-1">*</span>}
    </label>
  );
};

export interface FormHelperTextProps {
  error?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FormHelperText: React.FC<FormHelperTextProps> = ({
  error = false,
  className = '',
  children,
}) => {
  const colorClass = error ? 'text-danger' : 'text-gray-600';
  return (
    <p className={`text-sm ${colorClass} mt-1 ${className}`}>
      {children}
    </p>
  );
};

/**
 * Export all components for convenient importing
 */
export default Typography;
