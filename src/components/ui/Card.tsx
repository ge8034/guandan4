import { type HTMLAttributes, type ReactNode } from 'react';

type CardVariant = 'default' | 'hoverable';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'rounded-xl border border-neutral-200 bg-white shadow-sm',
        variant === 'hoverable' &&
          'cursor-pointer transition-all duration-[250ms] ease-out hover:-translate-y-0.5 hover:shadow-md',
        paddingStyles[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
