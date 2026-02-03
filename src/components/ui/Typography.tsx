import React from 'react';

/**
 * AreumFire Typography System - Notion-inspired
 *
 * Only three components:
 * - Heading (sizes: sm, md, lg)
 * - Text (sizes: xs, sm, base, md)
 * - Meta (fixed 11px gray)
 *
 * Uses design tokens from tailwind.config.js:
 * - text-xs-areum (11px)
 * - text-sm-areum (13px)
 * - text-base-areum (14px)
 * - text-md-areum (16px)
 * - text-lg-areum (18px)
 */

// Heading Component
type HeadingSize = 'sm' | 'md' | 'lg';
type HeadingElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: HeadingSize;
  as?: HeadingElement;
  className?: string;
  children: React.ReactNode;
}

export const Heading: React.FC<HeadingProps> = ({
  size = 'md',
  as: Component = 'h2',
  className = '',
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-sm-areum uppercase tracking-wide font-semibold',
    md: 'text-md-areum font-semibold',
    lg: 'text-lg-areum font-semibold',
  };

  return (
    <Component
      className={`text-areum-text-primary ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

// Text Component
type TextSize = 'xs' | 'sm' | 'base' | 'md';
type TextWeight = 'normal' | 'medium' | 'semibold';

interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: TextSize;
  weight?: TextWeight;
  color?: 'primary' | 'secondary' | 'tertiary';
  className?: string;
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  size = 'base',
  weight = 'normal',
  color = 'primary',
  className = '',
  children,
  ...props
}) => {
  const sizeClasses = {
    xs: 'text-xs-areum',
    sm: 'text-sm-areum',
    base: 'text-base-areum',
    md: 'text-md-areum',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
  };

  const colorClasses = {
    primary: 'text-areum-text-primary',
    secondary: 'text-areum-text-secondary',
    tertiary: 'text-areum-text-tertiary',
  };

  return (
    <span
      className={`${sizeClasses[size]} ${weightClasses[weight]} ${colorClasses[color]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// Meta Component (fixed 11px, always gray)
interface MetaProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
  children: React.ReactNode;
}

export const Meta: React.FC<MetaProps> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <span
      className={`text-xs-areum text-areum-text-tertiary ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// Legacy exports for gradual migration - will be removed
// These map old components to new ones to prevent immediate breakage
export const H1 = ({ children, className = '', ...props }: any) => (
  <Heading as="h1" size="lg" className={className} {...props}>{children}</Heading>
);

export const H2 = ({ children, className = '', ...props }: any) => (
  <Heading as="h2" size="md" className={className} {...props}>{children}</Heading>
);

export const H3 = ({ children, className = '', ...props }: any) => (
  <Heading as="h3" size="md" className={className} {...props}>{children}</Heading>
);

export const H4 = ({ children, className = '', ...props }: any) => (
  <Heading as="h4" size="sm" className={className} {...props}>{children}</Heading>
);

export const H5 = ({ children, className = '', ...props }: any) => (
  <Heading as="h5" size="sm" className={className} {...props}>{children}</Heading>
);

export const H6 = ({ children, className = '', ...props }: any) => (
  <Heading as="h6" size="sm" className={className} {...props}>{children}</Heading>
);

export const Body = ({ children, className = '', ...props }: any) => (
  <Text size="base" className={className} {...props}>{children}</Text>
);

export const BodyBase = ({ children, className = '', ...props }: any) => (
  <Text size="base" className={className} {...props}>{children}</Text>
);

export const Label = ({ children, className = '', weight = 'medium', ...props }: any) => (
  <Text size="sm" weight={weight} className={className} {...props}>{children}</Text>
);

export const Caption = ({ children, className = '', color = 'secondary', ...props }: any) => (
  <Meta className={className} {...props}>{children}</Meta>
);

export const Mono = ({ children, className = '', ...props }: any) => (
  <span className={`font-mono text-sm-areum ${className}`} {...props}>{children}</span>
);

export const MonoSmall = ({ children, className = '', ...props }: any) => (
  <span className={`font-mono text-xs-areum ${className}`} {...props}>{children}</span>
);

// Form-specific components (keep for compatibility)
export const FormLabel = ({ children, className = '', ...props }: any) => (
  <Text size="sm" weight="medium" className={`block mb-1 ${className}`} {...props}>{children}</Text>
);

export const FormHelperText = ({ children, className = '', error, ...props }: any) => (
  <Meta className={`mt-1 ${error ? 'text-danger' : ''} ${className}`} {...props}>{children}</Meta>
);

// Legacy Typography component for backwards compatibility with tests
interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small';
  color?: 'primary' | 'secondary' | 'accent';
  weight?: 'normal' | 'medium' | 'bold';
  align?: 'left' | 'center' | 'right';
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = 'primary',
  weight,
  align,
  as: Component,
  className = '',
  children,
  ...props
}) => {
  const variantMap: Record<string, React.ElementType> = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    body: 'p',
    small: 'span',
  };

  const sizeMap: Record<string, string> = {
    h1: 'text-3xl font-bold',
    h2: 'text-2xl font-semibold',
    h3: 'text-xl font-semibold',
    h4: 'text-lg font-semibold',
    body: 'text-base',
    small: 'text-sm',
  };

  const colorMap: Record<string, string> = {
    primary: '',
    secondary: 'text-gray-600',
    accent: 'text-accent',
  };

  const weightMap: Record<string, string> = {
    normal: 'font-normal',
    medium: 'font-medium',
    bold: 'font-bold',
  };

  const alignMap: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const Element = Component || variantMap[variant] || 'p';
  const weightClass = weight ? weightMap[weight] : '';
  const alignClass = align ? alignMap[align] : '';

  return (
    <Element
      className={`${sizeMap[variant]} ${colorMap[color]} ${weightClass} ${alignClass} ${className}`}
      {...props}
    >
      {children}
    </Element>
  );
};

// BodySmall legacy export
export const BodySmall = ({ children, className = '', ...props }: any) => (
  <p className={`text-sm ${className}`} {...props}>{children}</p>
);
